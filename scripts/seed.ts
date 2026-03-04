// Cargar variables de entorno desde .env.local antes de importar otros módulos
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar .env.local desde la raíz del proyecto
config({ path: resolve(process.cwd(), '.env.local') });

import connectDB from '../lib/mongoose';
import AdminUser from '../models/AdminUser';
import Settings from '../models/Settings';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    await connectDB();

    // Crear usuario admin por defecto
    const adminEmail = process.env.ADMIN_EMAIL || 'tomassanchez2101@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await AdminUser.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('✅ Usuario admin ya existe');
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await AdminUser.create({
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrador',
      });
      console.log('✅ Usuario admin creado');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
    }

    // Crear configuración inicial
    const existingSettings = await Settings.findOne();

    if (existingSettings) {
      console.log('✅ Configuración ya existe');
    } else {
      await Settings.create({
        nextSequence: 1,
      });
      console.log('✅ Configuración inicial creada');
    }

    console.log('✅ Seed completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seed();
