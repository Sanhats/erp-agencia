import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice, { InvoiceStatus } from '@/models/Invoice';
import Contract, { ContractStatus } from '@/models/Contract';
import Settings from '@/models/Settings';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectDB();

    // Calcular año y mes actual
    const now = new Date();
    const billingYear = now.getFullYear();
    const billingMonth = now.getMonth() + 1; // 1-12

    // Obtener todos los contratos activos
    const activeContracts = await Contract.find({
      status: ContractStatus.ACTIVE,
    })
      .populate('clientId')
      .session(session);

    const results = {
      created: [] as any[],
      skipped: [] as any[],
      errors: [] as any[],
    };

    // Procesar cada contrato
    for (const contract of activeContracts) {
      try {
        // Validar que el contrato tenga items y precio
        if (!contract.items || contract.items.length === 0) {
          results.skipped.push({
            contractId: contract._id.toString(),
            reason: 'Contrato sin items',
          });
          continue;
        }

        if (!contract.monthlyPrice || contract.monthlyPrice <= 0) {
          results.skipped.push({
            contractId: contract._id.toString(),
            reason: 'Contrato sin precio mensual válido',
          });
          continue;
        }

        // Verificar si ya existe factura para este contrato/año/mes (idempotencia)
        const existingInvoice = await Invoice.findOne({
          contractId: contract._id,
          billingYear,
          billingMonth,
        }).session(session);

        if (existingInvoice) {
          results.skipped.push({
            contractId: contract._id.toString(),
            clientName: (contract.clientId as any)?.name || 'N/A',
            reason: 'Factura ya existe para este mes',
            invoiceId: existingInvoice._id.toString(),
          });
          continue;
        }

        // Obtener e incrementar Settings.nextSequence (atómico)
        const settings = await Settings.findOneAndUpdate(
          {},
          { $inc: { nextSequence: 1 } },
          { new: true, session, upsert: true }
        );

        // Generar número de factura
        const invoiceNumber = `INV-${String(settings.nextSequence).padStart(4, '0')}`;

        // Calcular fechas
        const issueDate = new Date(now);
        issueDate.setHours(0, 0, 0, 0);
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 30); // Vence en 30 días

        // Crear factura
        const invoice = await Invoice.create(
          [
            {
              contractId: contract._id,
              clientId: contract.clientId._id || contract.clientId,
              invoiceNumber,
              issueDate,
              dueDate,
              billingYear,
              billingMonth,
              status: InvoiceStatus.PENDING,
              totals: {
                subtotal: contract.monthlyPrice,
                total: contract.monthlyPrice,
                paidAmount: 0,
              },
              items: contract.items.map((item: any) => ({
                serviceId: item.serviceId,
                serviceName: item.serviceName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                notes: item.notes,
              })),
            },
          ],
          { session }
        );

        results.created.push({
          invoiceId: invoice[0]._id.toString(),
          invoiceNumber,
          contractId: contract._id.toString(),
          clientName: (contract.clientId as any)?.name || 'N/A',
          amount: contract.monthlyPrice,
        });
      } catch (error: any) {
        // Error al procesar un contrato específico
        results.errors.push({
          contractId: contract._id.toString(),
          error: error.message || 'Error desconocido',
        });
      }
    }

    // Commit transacción
    await session.commitTransaction();

    return NextResponse.json(
      {
        message: 'Ciclo de facturación completado',
        billingYear,
        billingMonth,
        summary: {
          totalContracts: activeContracts.length,
          created: results.created.length,
          skipped: results.skipped.length,
          errors: results.errors.length,
        },
        created: results.created,
        skipped: results.skipped,
        errors: results.errors,
      },
      { status: 200 }
    );
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error in billing cycle:', error);
    return NextResponse.json(
      {
        error: error.message || 'Error al ejecutar ciclo de facturación',
      },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}
