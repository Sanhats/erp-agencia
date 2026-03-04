import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
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

    const service = await Service.findById(id);

    if (!service) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Error al obtener servicio' },
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
    const { name, description, category, basePrice } = body;

    const service = await Service.findByIdAndUpdate(
      id,
      {
        name,
        description,
        category,
        basePrice: basePrice !== undefined ? Number(basePrice) : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!service) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error: any) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar servicio' },
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

    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Error al eliminar servicio' },
      { status: 500 }
    );
  }
}
