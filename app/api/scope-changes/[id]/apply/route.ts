import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import ScopeChange, { ScopeChangeStatus, ScopeChangeAction } from '@/models/ScopeChange';
import Contract, { ContractStatus } from '@/models/Contract';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    let appliedBy;
    try {
      const body = await request.json().catch(() => ({}));
      appliedBy = body.appliedBy;
    } catch {
      // Body opcional
    }

    // Obtener escalamiento
    const scopeChange = await ScopeChange.findById(id).session(session);

    if (!scopeChange) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'Escalamiento no encontrado' },
        { status: 404 }
      );
    }

    // Validar estado
    if (scopeChange.status !== ScopeChangeStatus.APPROVED) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'Solo se pueden aplicar escalamientos aprobados' },
        { status: 400 }
      );
    }

    // Obtener contrato
    const contract = await Contract.findById(scopeChange.contractId).session(session);

    if (!contract) {
      await session.abortTransaction();
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });
    }

    // Validar que el contrato sigue activo
    if (contract.status !== ContractStatus.ACTIVE) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'El contrato debe estar activo para aplicar escalamientos' },
        { status: 400 }
      );
    }

    // Aplicar cambios a contract.items
    const newItems = [...contract.items];

    // Procesar en orden inverso para evitar problemas con índices al eliminar
    const sortedItems = [...scopeChange.items].sort((a, b) => {
      // Primero removes (índices más altos primero), luego modifies, luego adds
      if (a.action === ScopeChangeAction.REMOVE && b.action !== ScopeChangeAction.REMOVE) {
        return -1;
      }
      if (a.action !== ScopeChangeAction.REMOVE && b.action === ScopeChangeAction.REMOVE) {
        return 1;
      }
      if (a.action === ScopeChangeAction.REMOVE && b.action === ScopeChangeAction.REMOVE) {
        return (b.originalItemIndex || 0) - (a.originalItemIndex || 0);
      }
      return 0;
    });

    for (const change of sortedItems) {
      // Asegurar que serviceId sea ObjectId válido
      const serviceId = mongoose.Types.ObjectId.isValid(change.serviceId)
        ? new mongoose.Types.ObjectId(change.serviceId)
        : change.serviceId;

      if (change.action === ScopeChangeAction.ADD) {
        // Agregar nuevo item
        newItems.push({
          serviceId: serviceId,
          serviceName: change.serviceName,
          quantity: change.quantity!,
          unitPrice: change.unitPrice!,
          notes: change.notes,
        });
      } else if (change.action === ScopeChangeAction.MODIFY) {
        // Modificar item existente
        const index = change.originalItemIndex!;
        if (index >= 0 && index < newItems.length) {
          // Mantener el serviceId original del item, solo actualizar cantidad, precio y nombre
          newItems[index] = {
            serviceId: newItems[index].serviceId, // Mantener el serviceId original
            serviceName: change.serviceName, // Actualizar snapshot
            quantity: change.quantity!,
            unitPrice: change.unitPrice!,
            notes: change.notes !== undefined ? change.notes : newItems[index].notes,
          };
        }
      } else if (change.action === ScopeChangeAction.REMOVE) {
        // Eliminar item
        const index = change.originalItemIndex!;
        if (index >= 0 && index < newItems.length) {
          newItems.splice(index, 1);
        }
      }
    }

    // Validar que queden items
    if (newItems.length === 0) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: 'No se puede aplicar escalamiento que deje el contrato sin items' },
        { status: 400 }
      );
    }

    // Recalcular monthlyPrice
    const newMonthlyPrice = newItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Actualizar contrato
    await Contract.findByIdAndUpdate(
      contract._id,
      {
        items: newItems,
        monthlyPrice: newMonthlyPrice,
      },
      { session, new: true }
    );

    // Actualizar escalamiento
    await ScopeChange.findByIdAndUpdate(
      id,
      {
        status: ScopeChangeStatus.APPLIED,
        appliedDate: new Date(),
        appliedBy: appliedBy || undefined,
      },
      { session, new: true }
    );

    // Commit transacción
    await session.commitTransaction();

    // Obtener datos actualizados
    const updatedContract = await Contract.findById(contract._id)
      .populate('clientId', 'name email')
      .populate('packageTemplateId', 'name');

    const updatedScopeChange = await ScopeChange.findById(id)
      .populate('contractId', 'name monthlyPrice')
      .populate('clientId', 'name email')
      .populate('appliedBy', 'name email');

    return NextResponse.json({
      contract: updatedContract,
      scopeChange: updatedScopeChange,
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error applying scope change:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Error al aplicar escalamiento',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}
