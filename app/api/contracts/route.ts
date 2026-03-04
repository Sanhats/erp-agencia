import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Contract, { ContractStatus } from '@/models/Contract';
import Client, { ClientType } from '@/models/Client';
import Service from '@/models/Service';
import PackageTemplate from '@/models/PackageTemplate';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    const query: any = {};

    if (clientId) {
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return NextResponse.json({ error: 'ID de cliente inválido' }, { status: 400 });
      }
      query.clientId = clientId;
    }

    const contracts = await Contract.find(query)
      .populate('clientId', 'name email')
      .populate('packageTemplateId', 'name')
      .sort({ startDate: -1 });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { error: 'Error al obtener contratos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { clientId, packageTemplateId, status, startDate, endDate, items } = body;

    if (!clientId || !startDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cliente, fecha de inicio y al menos un item son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el cliente existe
    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Validar que no haya múltiples contratos activos para el mismo cliente
    if (status === ContractStatus.ACTIVE || status === undefined) {
      const activeContract = await Contract.findOne({
        clientId,
        status: ContractStatus.ACTIVE,
      });

      if (activeContract) {
        return NextResponse.json(
          { error: 'El cliente ya tiene un contrato activo' },
          { status: 400 }
        );
      }
    }

    // Si se proporciona packageTemplateId, validar que existe
    if (packageTemplateId) {
      const template = await PackageTemplate.findById(packageTemplateId);
      if (!template) {
        return NextResponse.json(
          { error: 'Plantilla no encontrada' },
          { status: 404 }
        );
      }
    }

    // Validar y crear snapshots de items
    const contractItems = [];
    for (const item of items) {
      const service = await Service.findById(item.serviceId);
      if (!service) {
        return NextResponse.json(
          { error: `Servicio con ID ${item.serviceId} no encontrado` },
          { status: 400 }
        );
      }

      contractItems.push({
        serviceId: item.serviceId,
        serviceName: service.name, // Snapshot
        quantity: item.quantity,
        unitPrice: item.unitPrice, // Snapshot
        notes: item.notes,
      });
    }

    // Calcular monthlyPrice
    const monthlyPrice = contractItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const contract = await Contract.create({
      clientId,
      packageTemplateId: packageTemplateId || undefined,
      status: status || ContractStatus.DRAFT,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      items: contractItems,
      monthlyPrice,
    });

    const populated = await Contract.findById(contract._id)
      .populate('clientId', 'name email')
      .populate('packageTemplateId', 'name');

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear contrato' },
      { status: 500 }
    );
  }
}
