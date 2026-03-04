import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Service from '@/models/Service';

export async function GET() {
  try {
    await connectDB();
    const services = await Service.find().sort({ name: 1 });
    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Error al obtener servicios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { name, description, category, basePrice } = body;

    if (!name || basePrice === undefined) {
      return NextResponse.json(
        { error: 'Nombre y precio base son requeridos' },
        { status: 400 }
      );
    }

    const service = await Service.create({
      name,
      description,
      category,
      basePrice: Number(basePrice),
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear servicio' },
      { status: 500 }
    );
  }
}
