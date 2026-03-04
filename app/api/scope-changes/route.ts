import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import ScopeChange, { ScopeChangeStatus, ScopeChangeAction } from '@/models/ScopeChange';
import Contract, { ContractStatus } from '@/models/Contract';
import Service from '@/models/Service';
import Client from '@/models/Client';
import mongoose from 'mongoose';
import { logAction, getRequestInfo } from '@/lib/audit';
import { AuditAction } from '@/models/AuditLog';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    // Asegurar que los modelos estén registrados
    if (!mongoose.models.Client) {
      await import('@/models/Client');
    }

    const searchParams = request.nextUrl.searchParams;
    const contractId = searchParams.get('contractId');
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status') as ScopeChangeStatus | null;
    const invoiced = searchParams.get('invoiced');

    const query: any = {};

    if (contractId) {
      if (!mongoose.Types.ObjectId.isValid(contractId)) {
        return NextResponse.json({ error: 'ID de contrato inválido' }, { status: 400 });
      }
      query.contractId = contractId;
    }

    if (clientId) {
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return NextResponse.json({ error: 'ID de cliente inválido' }, { status: 400 });
      }
      query.clientId = clientId;
    }

    if (status) {
      if (!Object.values(ScopeChangeStatus).includes(status)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
      query.status = status;
    }

    if (invoiced !== null && invoiced !== undefined && invoiced !== '') {
      query.invoiced = invoiced === 'true';
    }

    const scopeChanges = await ScopeChange.find(query)
      .populate('contractId', 'name monthlyPrice')
      .populate('clientId', 'name email')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('appliedBy', 'name email')
      .sort({ requestedDate: -1 });

    return NextResponse.json(scopeChanges);
  } catch (error) {
    console.error('Error fetching scope changes:', error);
    return NextResponse.json(
      { error: 'Error al obtener escalamientos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      contractId,
      items,
      description,
      notes,
      requestedBy,
    } = body;

    if (!contractId || !items || items.length === 0 || !description) {
      return NextResponse.json(
        {
          error: 'Contrato, items y descripción son requeridos',
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(contractId)) {
      return NextResponse.json({ error: 'ID de contrato inválido' }, { status: 400 });
    }

    // Obtener contrato
    const contract = await Contract.findById(contractId).populate('clientId');

    if (!contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });
    }

    // Validar que el contrato esté activo
    if (contract.status !== ContractStatus.ACTIVE) {
      return NextResponse.json(
        { error: 'Solo se pueden crear escalamientos para contratos activos' },
        { status: 400 }
      );
    }

    // Validar items
    for (const item of items) {
      if (!item.action || !Object.values(ScopeChangeAction).includes(item.action)) {
        return NextResponse.json(
          { error: `Acción inválida en item: ${item.action}` },
          { status: 400 }
        );
      }

      if (!mongoose.Types.ObjectId.isValid(item.serviceId)) {
        return NextResponse.json(
          { error: `ID de servicio inválido: ${item.serviceId}` },
          { status: 400 }
        );
      }

      // Validar que el servicio existe
      const service = await Service.findById(item.serviceId);
      if (!service) {
        return NextResponse.json(
          { error: `Servicio con ID ${item.serviceId} no encontrado` },
          { status: 404 }
        );
      }

      // Validar campos según acción
      if (item.action === ScopeChangeAction.ADD || item.action === ScopeChangeAction.MODIFY) {
        if (!item.quantity || item.quantity <= 0) {
          return NextResponse.json(
            { error: 'Items con acción add/modify deben tener quantity > 0' },
            { status: 400 }
          );
        }
        if (!item.unitPrice || item.unitPrice < 0) {
          return NextResponse.json(
            { error: 'Items con acción add/modify deben tener unitPrice >= 0' },
            { status: 400 }
          );
        }
        // Para modify, validar que existe el item original
        if (item.action === ScopeChangeAction.MODIFY) {
          if (item.originalItemIndex === undefined || item.originalItemIndex < 0) {
            return NextResponse.json(
              { error: 'Items con acción modify deben tener originalItemIndex' },
              { status: 400 }
            );
          }
          if (item.originalItemIndex >= contract.items.length) {
            return NextResponse.json(
              { error: 'originalItemIndex fuera de rango' },
              { status: 400 }
            );
          }
        }
      }

      // Para remove, validar que existe el item original
      if (item.action === ScopeChangeAction.REMOVE) {
        if (item.originalItemIndex === undefined || item.originalItemIndex < 0) {
          return NextResponse.json(
            { error: 'Items con acción remove deben tener originalItemIndex' },
            { status: 400 }
          );
        }
        if (item.originalItemIndex >= contract.items.length) {
          return NextResponse.json(
            { error: 'originalItemIndex fuera de rango' },
            { status: 400 }
          );
        }
      }

      // Agregar serviceName si no viene
      if (!item.serviceName) {
        item.serviceName = service.name;
      }
    }

    // Crear escalamiento
    const scopeChange = await ScopeChange.create({
      contractId,
      clientId: contract.clientId._id || contract.clientId,
      status: ScopeChangeStatus.PENDING,
      requestedDate: new Date(),
      items,
      description,
      notes,
      requestedBy: requestedBy || undefined,
      invoiced: false,
    });

    const populated = await ScopeChange.findById(scopeChange._id)
      .populate('contractId', 'name monthlyPrice')
      .populate('clientId', 'name email')
      .populate('requestedBy', 'name email');

    const session = await getServerSession(authOptions);
    const { ipAddress, userAgent } = getRequestInfo(request);
    await logAction({
      userId: session?.user?.id,
      action: AuditAction.CREATE,
      resourceType: 'scope_change',
      resourceId: scopeChange._id,
      description: `Escalamiento creado: ${description}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating scope change:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear escalamiento' },
      { status: 500 }
    );
  }
}
