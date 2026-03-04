import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice, { InvoiceStatus } from '@/models/Invoice';
import ScopeChange, { ScopeChangeStatus, ScopeChangeAction } from '@/models/ScopeChange';
import Settings from '@/models/Settings';
import Client from '@/models/Client';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectDB();

    const body = await request.json();
    const { scopeChangeIds, issueDate, dueDate, notes } = body;

    if (!scopeChangeIds || !Array.isArray(scopeChangeIds) || scopeChangeIds.length === 0) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'Debe proporcionar al menos un escalamiento para facturar' },
        { status: 400 }
      );
    }

    // Validar que todos los IDs sean válidos
    for (const id of scopeChangeIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        await session.abortTransaction();
        return NextResponse.json(
          { error: `ID de escalamiento inválido: ${id}` },
          { status: 400 }
        );
      }
    }

    // Obtener y validar escalamientos
    const scopeChanges = await ScopeChange.find({
      _id: { $in: scopeChangeIds },
      status: ScopeChangeStatus.APPLIED,
      invoiced: false,
    })
      .populate('clientId')
      .populate('contractId')
      .session(session);

    if (scopeChanges.length === 0) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'No se encontraron escalamientos aplicados sin facturar con los IDs proporcionados' },
        { status: 404 }
      );
    }

    if (scopeChanges.length !== scopeChangeIds.length) {
      await session.abortTransaction();
      const foundIds = scopeChanges.map(sc => sc._id.toString());
      const missingIds = scopeChangeIds.filter(id => !foundIds.includes(id.toString()));
      return NextResponse.json(
        { 
          error: `Algunos escalamientos no están aplicados o ya fueron facturados. IDs no encontrados: ${missingIds.join(', ')}`,
          missingIds 
        },
        { status: 400 }
      );
    }

    // Validar que todos pertenezcan al mismo cliente (opcional, puede permitir múltiples)
    const firstClientId = scopeChanges[0].clientId._id || scopeChanges[0].clientId;
    const allSameClient = scopeChanges.every(
      (sc) => (sc.clientId._id || sc.clientId).toString() === firstClientId.toString()
    );

    if (!allSameClient) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'Todos los escalamientos deben pertenecer al mismo cliente' },
        { status: 400 }
      );
    }

    // Agrupar items por escalamiento
    const invoiceItems: any[] = [];
    for (const scopeChange of scopeChanges) {
      for (const changeItem of scopeChange.items) {
        // Solo agregar items de acciones ADD o MODIFY (no REMOVE)
        if (
          changeItem.action === ScopeChangeAction.ADD ||
          changeItem.action === ScopeChangeAction.MODIFY
        ) {
          if (changeItem.quantity && changeItem.unitPrice !== undefined) {
            invoiceItems.push({
              serviceId: changeItem.serviceId,
              serviceName: changeItem.serviceName,
              quantity: changeItem.quantity,
              unitPrice: changeItem.unitPrice,
              notes: changeItem.notes,
              scopeChangeId: scopeChange._id,
              isExtra: true,
            });
          }
        }
      }
    }

    if (invoiceItems.length === 0) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'No hay items válidos para facturar en los escalamientos seleccionados' },
        { status: 400 }
      );
    }

    // Calcular totals
    const subtotal = invoiceItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const total = subtotal; // Por ahora sin impuestos

    // Obtener siguiente número de factura
    const settings = await Settings.findOneAndUpdate(
      {},
      { $inc: { nextSequence: 1 } },
      { new: true, upsert: true, session }
    );

    if (!settings) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'No se pudo obtener el siguiente número de factura' },
        { status: 500 }
      );
    }

    const invoiceNumber = `INV-${String(settings.nextSequence).padStart(4, '0')}`;

    // Fechas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const issue = issueDate ? new Date(issueDate) : today;
    const due = dueDate
      ? new Date(dueDate)
      : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 días

    // Obtener contractId del primer escalamiento (todos deben ser del mismo cliente)
    const contractId = scopeChanges[0].contractId._id || scopeChanges[0].contractId;
    const clientId = firstClientId;

    // Calcular billingYear y billingMonth basado en issueDate
    const billingYear = issue.getFullYear();
    const billingMonth = issue.getMonth() + 1;

    // Crear factura
    const invoice = await Invoice.create(
      [
        {
          contractId,
          clientId,
          invoiceNumber,
          issueDate: issue,
          dueDate: due,
          billingYear,
          billingMonth,
          status: InvoiceStatus.PENDING,
          totals: {
            subtotal,
            total,
            paidAmount: 0,
          },
          items: invoiceItems,
          notes: notes || undefined,
        },
      ],
      { session }
    );

    // Marcar todos los escalamientos como facturados
    await ScopeChange.updateMany(
      { _id: { $in: scopeChangeIds } },
      {
        $set: {
          invoiced: true,
          invoiceId: invoice[0]._id,
        },
      },
      { session }
    );

    // Commit transacción
    await session.commitTransaction();

    // Obtener factura con populate
    const populatedInvoice = await Invoice.findById(invoice[0]._id)
      .populate('contractId', 'name monthlyPrice')
      .populate('clientId', 'name email')
      .populate('items.scopeChangeId', 'description');

    return NextResponse.json(populatedInvoice, { status: 201 });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error creating scope extra invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear factura de extras' },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}
