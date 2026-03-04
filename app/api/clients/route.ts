import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Client, { ClientType, ClientStatus } from '@/models/Client';
import { logAction, getRequestInfo } from '@/lib/audit';
import { AuditAction } from '@/models/AuditLog';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const clientType = searchParams.get('clientType') as ClientType | null;
    const status = searchParams.get('status') as ClientStatus | null;

    const query: any = {};

    // Búsqueda por nombre o email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Filtro por tipo
    if (clientType) {
      query.clientType = clientType;
    }

    // Filtro por status
    if (status) {
      query.status = status;
    }

    const clients = await Client.find(query).sort({ name: 1 });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { name, email, phone, clientType, status } = body;

    if (!name || !clientType) {
      return NextResponse.json(
        { error: 'Nombre y tipo de cliente son requeridos' },
        { status: 400 }
      );
    }

    // Validar enum
    if (!Object.values(ClientType).includes(clientType)) {
      return NextResponse.json(
        { error: 'Tipo de cliente inválido' },
        { status: 400 }
      );
    }

    const client = await Client.create({
      name,
      email,
      phone,
      clientType,
      status: status || ClientStatus.ACTIVE,
    });

    const session = await getServerSession(authOptions);
    const { ipAddress, userAgent } = getRequestInfo(request);
    await logAction({
      userId: session?.user?.id,
      action: AuditAction.CREATE,
      resourceType: 'client',
      resourceId: client._id,
      description: `Cliente creado: ${client.name}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear cliente' },
      { status: 500 }
    );
  }
}
