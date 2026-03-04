import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Payment, { PaymentMethod } from '@/models/Payment';
import Invoice, { InvoiceStatus } from '@/models/Invoice';
import mongoose from 'mongoose';
import { logAction, getRequestInfo } from '@/lib/audit';
import { AuditAction } from '@/models/AuditLog';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const invoiceId = searchParams.get('invoiceId');

    const query: any = {};

    if (invoiceId) {
      if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return NextResponse.json({ error: 'ID de factura inválido' }, { status: 400 });
      }
      query.invoiceId = invoiceId;
    }

    const payments = await Payment.find(query)
      .populate({
        path: 'invoiceId',
        populate: [
          { path: 'clientId', select: 'name email' },
          { path: 'contractId', select: 'name' },
        ],
      })
      .sort({ paymentDate: -1 });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Error al obtener pagos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectDB();

    const body = await request.json();
    const { invoiceId, amount, paymentDate, paymentMethod, reference, notes } = body;

    // Validaciones básicas
    if (!invoiceId || !amount || !paymentMethod) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'Factura, monto y método de pago son requeridos' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'ID de factura inválido' }, { status: 400 });
    }

    if (amount <= 0) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Validar enum
    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'Método de pago inválido' },
        { status: 400 }
      );
    }

    // Obtener factura
    const invoice = await Invoice.findById(invoiceId).session(session);

    if (!invoice) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    // Validar que la factura no esté cancelada
    if (invoice.status === InvoiceStatus.CANCELLED) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'No se pueden registrar pagos en facturas canceladas' },
        { status: 400 }
      );
    }

    // Calcular monto pendiente
    const pendingAmount = invoice.totals.total - invoice.totals.paidAmount;

    // Validar que no se sobrepague
    if (amount > pendingAmount) {
      await session.abortTransaction();
      return NextResponse.json(
        {
          error: `El monto excede el pendiente. Pendiente: $${pendingAmount.toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    // Crear pago
    const payment = await Payment.create(
      [
        {
          invoiceId,
          amount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod,
          reference,
          notes,
        },
      ],
      { session }
    );

    // Calcular nuevo paidAmount
    const newPaidAmount = invoice.totals.paidAmount + amount;

    // Actualizar factura
    const updateData: any = {
      $inc: { 'totals.paidAmount': amount },
    };

    // Si se pagó completamente, cambiar estado
    if (newPaidAmount >= invoice.totals.total) {
      updateData.status = InvoiceStatus.PAID;
    }

    await Invoice.findByIdAndUpdate(invoiceId, updateData, {
      session,
      new: true,
    });

    // Commit transacción
    await session.commitTransaction();

    const authSession = await getServerSession(authOptions);
    const { ipAddress, userAgent } = getRequestInfo(request);
    await logAction({
      userId: authSession?.user?.id,
      action: AuditAction.PAYMENT,
      resourceType: 'payment',
      resourceId: payment[0]._id,
      description: `Pago registrado: $${amount} - Factura ${invoiceId}`,
      metadata: { invoiceId, amount, paymentMethod },
      ipAddress,
      userAgent,
    });

    // Obtener factura actualizada con populate
    const updatedInvoice = await Invoice.findById(invoiceId)
      .populate('clientId', 'name email')
      .populate('contractId', 'name');

    return NextResponse.json(
      {
        payment: payment[0],
        invoice: updatedInvoice,
      },
      { status: 201 }
    );
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: error.message || 'Error al registrar pago' },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}
