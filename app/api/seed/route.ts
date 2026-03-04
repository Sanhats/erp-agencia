import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import AdminUser from '@/models/AdminUser';
import Settings from '@/models/Settings';
import bcrypt from 'bcryptjs';

export async function POST() {
  // Solo permitir en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  try {
    await connectDB();

    // Crear usuario admin por defecto
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@agencia.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await AdminUser.findOne({ email: adminEmail });

    if (existingAdmin) {
      return NextResponse.json({
        message: 'Usuario admin ya existe',
        email: adminEmail,
      });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await AdminUser.create({
      email: adminEmail,
      password: hashedPassword,
      name: 'Administrador',
    });

    // Crear configuración inicial
    const existingSettings = await Settings.findOne();

    if (!existingSettings) {
      await Settings.create({
        nextSequence: 1,
      });
    }

    return NextResponse.json({
      message: 'Seed completado exitosamente',
      email: adminEmail,
      password: adminPassword,
    });
  } catch (error) {
    console.error('Error en seed:', error);
    return NextResponse.json(
      { error: 'Error al ejecutar seed' },
      { status: 500 }
    );
  }
}
