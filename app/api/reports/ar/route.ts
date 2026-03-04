import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Invoice, { InvoiceStatus } from '@/models/Invoice';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const includeOverdue = searchParams.get('includeOverdue') !== 'false';

    // Obtener facturas pendientes
    const query: any = {
      status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
      'totals.paidAmount': { $lt: '$totals.total' }, // Aún tienen monto pendiente
    };

    if (includeOverdue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.dueDate = { $lt: today };
    }

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name email')
      .populate('contractId', 'name')
      .sort({ dueDate: 1 });

    // Calcular totales
    const totalAR = invoices.reduce((sum, inv) => {
      const pending = inv.totals.total - inv.totals.paidAmount;
      return sum + pending;
    }, 0);

    // Agrupar por cliente
    const byClient = invoices.reduce((acc: any, inv) => {
      const clientId = (inv.clientId as any)?._id?.toString() || 'unknown';
      const clientName = (inv.clientId as any)?.name || 'Sin nombre';
      const pending = inv.totals.total - inv.totals.paidAmount;

      if (!acc[clientId]) {
        acc[clientId] = {
          clientId: clientId,
          clientName,
          totalAR: 0,
          invoiceCount: 0,
          invoices: [],
        };
      }

      acc[clientId].totalAR += pending;
      acc[clientId].invoiceCount += 1;
      acc[clientId].invoices.push({
        invoiceId: inv._id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        total: inv.totals.total,
        paidAmount: inv.totals.paidAmount,
        pending,
        daysOverdue: includeOverdue
          ? Math.floor((new Date().getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      });

      return acc;
    }, {});

    // Convertir a array y ordenar por total AR descendente
    const byClientArray = Object.values(byClient).sort((a: any, b: any) => b.totalAR - a.totalAR);

    // Calcular por rangos de días vencidos
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueRanges = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };

    invoices.forEach((inv) => {
      const daysOverdue = Math.floor((today.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const pending = inv.totals.total - inv.totals.paidAmount;

      if (daysOverdue <= 30) {
        overdueRanges['0-30'] += pending;
      } else if (daysOverdue <= 60) {
        overdueRanges['31-60'] += pending;
      } else if (daysOverdue <= 90) {
        overdueRanges['61-90'] += pending;
      } else {
        overdueRanges['90+'] += pending;
      }
    });

    return NextResponse.json({
      summary: {
        totalAR,
        invoiceCount: invoices.length,
        clientCount: byClientArray.length,
      },
      byClient: byClientArray,
      overdueRanges,
      invoices: invoices.map((inv) => ({
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        clientId: inv.clientId,
        dueDate: inv.dueDate,
        total: inv.totals.total,
        paidAmount: inv.totals.paidAmount,
        pending: inv.totals.total - inv.totals.paidAmount,
        daysOverdue: Math.floor((today.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    });
  } catch (error: any) {
    console.error('Error generating AR report:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar reporte de cuentas por cobrar' },
      { status: 500 }
    );
  }
}
