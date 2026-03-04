import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import ScopeChange, { ScopeChangeStatus } from '@/models/ScopeChange';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { rejectedBy } = body;

    // Obtener escalamiento
    const scopeChange = await ScopeChange.findById(id);

    if (!scopeChange) {
      return NextResponse.json(
        { error: 'Escalamiento no encontrado' },
        { status: 404 }
      );
    }

    // Validar estado
    if (scopeChange.status !== ScopeChangeStatus.PENDING) {
      return NextResponse.json(
        { error: 'Solo se pueden rechazar escalamientos pendientes' },
        { status: 400 }
      );
    }

    // Actualizar escalamiento
    const updated = await ScopeChange.findByIdAndUpdate(
      id,
      {
        status: ScopeChangeStatus.REJECTED,
        rejectedDate: new Date(),
        rejectedBy: rejectedBy || undefined,
      },
      { new: true }
    )
      .populate('contractId', 'name monthlyPrice')
      .populate('clientId', 'name email')
      .populate('rejectedBy', 'name email');

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error rejecting scope change:', error);
    return NextResponse.json(
      { error: error.message || 'Error al rechazar escalamiento' },
      { status: 500 }
    );
  }
}
