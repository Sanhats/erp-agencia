import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice, { InvoiceStatus } from '@/models/Invoice';
import Client from '@/models/Client';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    // Asegurar que los modelos estén registrados
    if (!mongoose.models.Client) {
      await import('@/models/Client');
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status') as InvoiceStatus | null;
    const overdue = searchParams.get('overdue') === 'true';

    const query: any = {};

    // Filtro por cliente
    if (clientId) {
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return NextResponse.json({ error: 'ID de cliente inválido' }, { status: 400 });
      }
      query.clientId = clientId;
    }

    // Filtro por estado
    if (status) {
      if (!Object.values(InvoiceStatus).includes(status)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
      query.status = status;
    }

    // Filtro por vencidas
    if (overdue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.dueDate = { $lt: today };
      query.status = { $in: [InvoiceStatus.PENDING, InvoiceStatus.DRAFT] };
    }

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name email')
      .populate('contractId', 'name')
      .sort({ dueDate: 1 });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Error al obtener facturas' },
      { status: 500 }
    );
  }
}
