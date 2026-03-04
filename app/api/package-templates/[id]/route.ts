import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import PackageTemplate from '@/models/PackageTemplate';
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

    const template = await PackageTemplate.findById(id).populate(
      'items.serviceId',
      'name description basePrice'
    );

    if (!template) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching package template:', error);
    return NextResponse.json(
      { error: 'Error al obtener plantilla' },
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
    const { name, description, items, basePrice, isActive } = body;

    // Validar items si se proporcionan
    if (items && items.length > 0) {
      for (const item of items) {
        const service = await Service.findById(item.serviceId);
        if (!service) {
          return NextResponse.json(
            { error: `Servicio con ID ${item.serviceId} no encontrado` },
            { status: 400 }
          );
        }
      }
    }

    // Calcular basePrice si items cambian
    let calculatedBasePrice = basePrice;
    if (items && items.length > 0 && calculatedBasePrice === undefined) {
      calculatedBasePrice = items.reduce(
        (sum: number, item: any) => sum + item.quantity * item.unitPrice,
        0
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (items !== undefined) updateData.items = items;
    if (calculatedBasePrice !== undefined)
      updateData.basePrice = calculatedBasePrice;
    if (isActive !== undefined) updateData.isActive = isActive;

    const template = await PackageTemplate.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('items.serviceId', 'name description basePrice');

    if (!template) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Error updating package template:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar plantilla' },
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
    const template = await PackageTemplate.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!template) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Plantilla desactivada correctamente' });
  } catch (error) {
    console.error('Error deleting package template:', error);
    return NextResponse.json(
      { error: 'Error al desactivar plantilla' },
      { status: 500 }
    );
  }
}
