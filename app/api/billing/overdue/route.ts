import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Invoice, { InvoiceStatus } from '@/models/Invoice';
import { logAction, getRequestInfo } from '@/lib/audit';
import { AuditAction } from '@/models/AuditLog';

function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const headerSecret = request.headers.get('x-cron-secret');
  return bearer === cronSecret || headerSecret === cronSecret;
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getServerSession(authOptions);
    const cronOk = isCronAuthorized(request);
    if (!authSession?.user?.id && !cronOk) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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

    const { ipAddress, userAgent } = getRequestInfo(request);
    await logAction({
      userId: authSession?.user?.id,
      action: AuditAction.OTHER,
      resourceType: 'billing',
      description: `Facturas vencidas actualizadas: ${result.modifiedCount} marcadas como overdue`,
      metadata: { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount },
      ipAddress,
      userAgent,
    });

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
