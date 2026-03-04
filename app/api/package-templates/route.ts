import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import PackageTemplate from '@/models/PackageTemplate';
import Service from '@/models/Service';
import { logAction, getRequestInfo } from '@/lib/audit';
import { AuditAction } from '@/models/AuditLog';

export async function GET() {
  try {
    await connectDB();
    const templates = await PackageTemplate.find({ isActive: true })
      .populate('items.serviceId', 'name description basePrice')
      .sort({ name: 1 });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching package templates:', error);
    return NextResponse.json(
      { error: 'Error al obtener plantillas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { name, description, items, basePrice } = body;

    if (!name || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Nombre y al menos un item son requeridos' },
        { status: 400 }
      );
    }

    // Validar que todos los servicios existan
    for (const item of items) {
      const service = await Service.findById(item.serviceId);
      if (!service) {
        return NextResponse.json(
          { error: `Servicio con ID ${item.serviceId} no encontrado` },
          { status: 400 }
        );
      }
    }

    // Calcular basePrice si no se proporciona
    let calculatedBasePrice = basePrice;
    if (calculatedBasePrice === undefined) {
      calculatedBasePrice = items.reduce(
        (sum: number, item: any) => sum + item.quantity * item.unitPrice,
        0
      );
    }

    const template = await PackageTemplate.create({
      name,
      description,
      items,
      basePrice: calculatedBasePrice,
      isActive: true,
    });

    const populated = await PackageTemplate.findById(template._id).populate(
      'items.serviceId',
      'name description basePrice'
    );

    const session = await getServerSession(authOptions);
    const { ipAddress, userAgent } = getRequestInfo(request);
    await logAction({
      userId: session?.user?.id,
      action: AuditAction.CREATE,
      resourceType: 'package_template',
      resourceId: template._id,
      description: `Plantilla de paquete creada: ${template.name}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error('Error creating package template:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear plantilla' },
      { status: 500 }
    );
  }
}
