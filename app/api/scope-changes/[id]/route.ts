import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import ScopeChange from '@/models/ScopeChange';
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

    const scopeChange = await ScopeChange.findById(id)
      .populate({
        path: 'contractId',
        select: 'name monthlyPrice items startDate endDate',
      })
      .populate('clientId', 'name email phone')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('appliedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .populate('invoiceId', 'invoiceNumber issueDate totals');

    if (!scopeChange) {
      return NextResponse.json(
        { error: 'Escalamiento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(scopeChange);
  } catch (error) {
    console.error('Error fetching scope change:', error);
    return NextResponse.json(
      { error: 'Error al obtener escalamiento' },
      { status: 500 }
    );
  }
}
