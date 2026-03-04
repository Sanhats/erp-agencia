import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice, { InvoiceStatus } from '@/models/Invoice';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Fecha de hoy (inicio del día)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar facturas vencidas que no estén completamente pagadas
    const result = await Invoice.updateMany(
      {
        status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.DRAFT] },
        dueDate: { $lt: today },
        $expr: {
          $lt: ['$totals.paidAmount', '$totals.total'],
        },
      },
      {
        $set: {
          status: InvoiceStatus.OVERDUE,
        },
      }
    );

    return NextResponse.json(
      {
        message: 'Facturas vencidas actualizadas',
        updated: result.modifiedCount,
        matched: result.matchedCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating overdue invoices:', error);
    return NextResponse.json(
      {
        error: error.message || 'Error al actualizar facturas vencidas',
      },
      { status: 500 }
    );
  }
}
