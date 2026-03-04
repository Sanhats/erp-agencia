import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import ScopeChange, { ScopeChangeStatus } from '@/models/ScopeChange';
import Contract, { ContractStatus } from '@/models/Contract';
import mongoose from 'mongoose';
import { logAction, getRequestInfo } from '@/lib/audit';
import { AuditAction } from '@/models/AuditLog';

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

    let approvedBy;
    try {
      const body = await request.json().catch(() => ({}));
      approvedBy = body.approvedBy;
    } catch {
      // Body opcional
    }

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
        { error: 'Solo se pueden aprobar escalamientos pendientes' },
        { status: 400 }
      );
    }

    // Validar que el contrato sigue activo
    const contract = await Contract.findById(scopeChange.contractId);
    if (!contract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }
    if (contract.status !== ContractStatus.ACTIVE) {
      return NextResponse.json(
        { error: 'El contrato debe estar activo para aprobar escalamientos' },
        { status: 400 }
      );
    }

    // Actualizar escalamiento
    const updated = await ScopeChange.findByIdAndUpdate(
      id,
      {
        status: ScopeChangeStatus.APPROVED,
        approvedDate: new Date(),
        approvedBy: approvedBy || undefined,
      },
      { new: true }
    )
      .populate('contractId', 'name monthlyPrice')
      .populate('clientId', 'name email')
      .populate('approvedBy', 'name email');

    const session = await getServerSession(authOptions);
    const { ipAddress, userAgent } = getRequestInfo(request);
    await logAction({
      userId: session?.user?.id,
      action: AuditAction.APPROVE,
      resourceType: 'scope_change',
      resourceId: updated?._id,
      description: `Escalamiento aprobado: ${id}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error approving scope change:', error);
    return NextResponse.json(
      { error: error.message || 'Error al aprobar escalamiento' },
      { status: 500 }
    );
  }
}
