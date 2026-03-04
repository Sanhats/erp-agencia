import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Contract, { ContractStatus } from '@/models/Contract';
import Service from '@/models/Service';
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

    const contract = await Contract.findById(id)
      .populate('clientId', 'name email clientType')
      .populate('packageTemplateId', 'name')
      .populate('items.serviceId', 'name description');

    if (!contract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json(
      { error: 'Error al obtener contrato' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { status, startDate, endDate, items } = body;

    const contract = await Contract.findById(id);
    if (!contract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    // Validar que no haya múltiples contratos activos si se está activando
    if (status === ContractStatus.ACTIVE) {
      const activeContract = await Contract.findOne({
        clientId: contract.clientId,
        status: ContractStatus.ACTIVE,
        _id: { $ne: id },
      });

      if (activeContract) {
        return NextResponse.json(
          { error: 'El cliente ya tiene un contrato activo' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    // Si se actualizan items, recalcular monthlyPrice
    if (items && items.length > 0) {
      // Validar servicios
      for (const item of items) {
        const service = await Service.findById(item.serviceId);
        if (!service) {
          return NextResponse.json(
            { error: `Servicio con ID ${item.serviceId} no encontrado` },
            { status: 400 }
          );
        }
      }

      const contractItems = items.map((item: any) => ({
        serviceId: item.serviceId,
        serviceName: item.serviceName || item.service?.name || 'Servicio',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes,
      }));

      updateData.items = contractItems;
      updateData.monthlyPrice = contractItems.reduce(
        (sum: number, item: any) => sum + item.quantity * item.unitPrice,
        0
      );
    }

    const updatedContract = await Contract.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'name email')
      .populate('packageTemplateId', 'name');

    return NextResponse.json(updatedContract);
  } catch (error: any) {
    console.error('Error updating contract:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar contrato' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Cancelar en lugar de eliminar
    const contract = await Contract.findByIdAndUpdate(
      id,
      { status: ContractStatus.CANCELLED },
      { new: true }
    );

    if (!contract) {
      return NextResponse.json(
        { error: 'Contrato no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Contrato cancelado correctamente' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json(
      { error: 'Error al cancelar contrato' },
      { status: 500 }
    );
  }
}
