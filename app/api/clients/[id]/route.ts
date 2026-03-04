import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Client, { ClientType, ClientStatus } from '@/models/Client';
import Contract from '@/models/Contract';
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

    const client = await Client.findById(id);

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Obtener contratos del cliente
    const contracts = await Contract.find({ clientId: id })
      .populate('packageTemplateId', 'name')
      .sort({ startDate: -1 });

    return NextResponse.json({
      client,
      contracts,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Error al obtener cliente' },
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
    const { name, email, phone, clientType, status } = body;

    // Validar enums si se proporcionan
    if (clientType && !Object.values(ClientType).includes(clientType)) {
      return NextResponse.json(
        { error: 'Tipo de cliente inválido' },
        { status: 400 }
      );
    }

    if (status && !Object.values(ClientStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    const client = await Client.findByIdAndUpdate(
      id,
      {
        name,
        email,
        phone,
        clientType,
        status,
      },
      { new: true, runValidators: true }
    );

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar cliente' },
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

    // Desactivar en lugar de eliminar
    const client = await Client.findByIdAndUpdate(
      id,
      { status: ClientStatus.INACTIVE },
      { new: true }
    );

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cliente desactivado correctamente' });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Error al desactivar cliente' },
      { status: 500 }
    );
  }
}
