import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const invoice = await Invoice.findById(id)
      .populate('clientId', 'name email phone clientType')
      .populate('contractId', 'name monthlyPrice');

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    // Obtener pagos asociados
    const payments = await Payment.find({ invoiceId: id }).sort({ paymentDate: -1 });

    return NextResponse.json({
      invoice,
      payments,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Error al obtener factura' },
      { status: 500 }
    );
  }
}
