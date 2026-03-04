import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Invoice, { InvoiceStatus } from '@/models/Invoice';
import Payment from '@/models/Payment';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

    // Construir query de fecha
    const dateQuery: any = { billingYear: year };
    if (month) {
      dateQuery.billingMonth = month;
    }

    // Agregación para calcular ingresos
    const revenuePipeline: any[] = [
      {
        $match: {
          ...dateQuery,
          status: { $in: [InvoiceStatus.PAID, InvoiceStatus.PENDING] },
        },
      },
      {
        $group: {
          _id: month ? { year: '$billingYear', month: '$billingMonth' } : { year: '$billingYear' },
          totalInvoiced: { $sum: '$totals.total' },
          totalPaid: { $sum: '$totals.paidAmount' },
          totalPending: { $sum: { $subtract: ['$totals.total', '$totals.paidAmount'] } },
          invoiceCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
    ];

    const revenueData = await Invoice.aggregate(revenuePipeline);

    // Obtener pagos del período
    const paymentDateQuery: any = {};
    if (year) {
      paymentDateQuery.paymentDate = {
        $gte: new Date(year, month ? month - 1 : 0, 1),
        $lt: new Date(year, month ? month : 12, month ? 1 : 32),
      };
    }

    const payments = await Payment.find(paymentDateQuery)
      .populate('invoiceId', 'invoiceNumber clientId')
      .sort({ paymentDate: -1 })
      .limit(50);

    // Calcular totales generales
    const totalInvoiced = revenueData.reduce((sum, item) => sum + item.totalInvoiced, 0);
    const totalPaid = revenueData.reduce((sum, item) => sum + item.totalPaid, 0);
    const totalPending = revenueData.reduce((sum, item) => sum + item.totalPending, 0);

    return NextResponse.json({
      period: { year, month },
      summary: {
        totalInvoiced,
        totalPaid,
        totalPending,
        invoiceCount: revenueData.reduce((sum, item) => sum + item.invoiceCount, 0),
      },
      byPeriod: revenueData,
      recentPayments: payments,
    });
  } catch (error: any) {
    console.error('Error generating revenue report:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar reporte de ingresos' },
      { status: 500 }
    );
  }
}
