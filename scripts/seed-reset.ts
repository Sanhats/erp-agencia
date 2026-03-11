/**
 * Limpia la base de datos (elimina datos de negocio, mantiene AdminUser y Settings).
 * Útil para empezar de cero y volver a ejecutar seed-demo o cargar datos nuevos.
 *
 * Ejecutar: npx tsx scripts/seed-reset.ts
 * Opcional: npx tsx scripts/seed-reset.ts --all   (elimina también AdminUser y Settings)
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from '../lib/mongoose';
import Payment from '../models/Payment';
import Invoice from '../models/Invoice';
import Allocation from '../models/Allocation';
import ScopeChange from '../models/ScopeChange';
import Contract from '../models/Contract';
import Client from '../models/Client';
import Service from '../models/Service';
import PackageTemplate from '../models/PackageTemplate';
import AuditLog from '../models/AuditLog';
import PasswordResetToken from '../models/PasswordResetToken';
import AdminUser from '../models/AdminUser';
import Settings from '../models/Settings';

async function seedReset() {
  const args = process.argv.slice(2);
  const removeAll = args.includes('--all');

  try {
    await connectDB();

    const toDelete = [
      { name: 'Payment', model: Payment },
      { name: 'Invoice', model: Invoice },
      { name: 'Allocation', model: Allocation },
      { name: 'ScopeChange', model: ScopeChange },
      { name: 'Contract', model: Contract },
      { name: 'Client', model: Client },
      { name: 'Service', model: Service },
      { name: 'PackageTemplate', model: PackageTemplate },
      { name: 'AuditLog', model: AuditLog },
      { name: 'PasswordResetToken', model: PasswordResetToken },
    ];

    for (const { name, model } of toDelete) {
      const result = await (model as mongoose.Model<unknown>).deleteMany({});
      console.log(`✅ ${name}: ${result.deletedCount} documento(s) eliminado(s)`);
    }

    if (removeAll) {
      const adminResult = await AdminUser.deleteMany({});
      const settingsResult = await Settings.deleteMany({});
      console.log(`✅ AdminUser: ${adminResult.deletedCount} eliminado(s)`);
      console.log(`✅ Settings: ${settingsResult.deletedCount} eliminado(s)`);
      console.log('\n⚠️  Base de datos vacía. Ejecuta npm run seed y luego npm run seed-demo si quieres datos de prueba.');
    } else {
      console.log('\n✅ AdminUser y Settings se mantienen. Puedes ejecutar npm run seed-demo para cargar datos de prueba.');
    }
  } catch (error: any) {
    console.error('❌ Error al limpiar la base de datos:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedReset();
