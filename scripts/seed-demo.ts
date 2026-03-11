/**
 * Seed de datos de demostración para probar el sistema completo.
 * Crea: servicios, clientes, contratos, facturas, pagos, escalamientos, plantilla, asignación.
 * Ejecutar: npx tsx scripts/seed-demo.ts
 *
 * Requiere haber ejecutado antes npm run seed (AdminUser + Settings).
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import connectDB from '../lib/mongoose';
import AdminUser from '../models/AdminUser';
import Settings from '../models/Settings';
import Client, { ClientType, ClientStatus } from '../models/Client';
import Service from '../models/Service';
import Contract, { ContractStatus } from '../models/Contract';
import Invoice, { InvoiceStatus } from '../models/Invoice';
import Payment, { PaymentMethod } from '../models/Payment';
import ScopeChange, { ScopeChangeStatus, ScopeChangeAction } from '../models/ScopeChange';
import PackageTemplate from '../models/PackageTemplate';
import Allocation from '../models/Allocation';
import mongoose from 'mongoose';

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setDate(1);
  out.setHours(0, 0, 0, 0);
  return out;
}

async function seedDemo() {
  try {
    await connectDB();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 1. Verificar que exista AdminUser y Settings (el seed básico debe haberse ejecutado)
    const admin = await AdminUser.findOne();
    if (!admin) {
      console.error('❌ Ejecuta primero: npm run seed (crea AdminUser y Settings)');
      process.exit(1);
    }
    let settings = await Settings.findOne();
    if (!settings) {
      await Settings.create({ nextSequence: 1 });
      settings = await Settings.findOne()!;
    }
    console.log('✅ AdminUser y Settings OK');

    // 2. Servicios
    const existingServices = await Service.find().limit(1);
    let services: mongoose.Document[];
    if (existingServices.length === 0) {
      services = await Service.insertMany([
        { name: 'Gestión de redes sociales', description: 'Community management', category: 'Marketing', basePrice: 150000 },
        { name: 'Diseño gráfico', description: 'Piezas para redes y web', category: 'Diseño', basePrice: 80000 },
        { name: 'Redacción de contenidos', description: 'Posts y copies', category: 'Contenidos', basePrice: 60000 },
        { name: 'Estrategia digital', description: 'Plan mensual y reportes', category: 'Estrategia', basePrice: 120000 },
      ]);
      console.log('✅ Servicios creados:', services.length);
    } else {
      services = await Service.find().sort({ name: 1 });
      console.log('✅ Servicios ya existían:', services.length);
    }

    const [s1, s2, s3, s4] = services as any[];

    // 3. Clientes
    let client1 = await Client.findOne({ email: 'demo-mensual@empresa.com' });
    if (!client1) {
      client1 = await Client.create({
        name: 'Empresa Demo Mensual',
        email: 'demo-mensual@empresa.com',
        phone: '+54 11 1234-5678',
        clientType: ClientType.MONTHLY,
        status: ClientStatus.ACTIVE,
      });
      console.log('✅ Cliente 1 (mensual) creado');
    }
    let client2 = await Client.findOne({ email: 'demo-proyecto@empresa.com' });
    if (!client2) {
      client2 = await Client.create({
        name: 'Empresa Demo Proyecto',
        email: 'demo-proyecto@empresa.com',
        phone: '+54 11 8765-4321',
        clientType: ClientType.PROJECT,
        status: ClientStatus.ACTIVE,
      });
      console.log('✅ Cliente 2 (proyecto) creado');
    }

    const client1Id = (client1 as any)._id;
    const client2Id = (client2 as any)._id;

    // 4. Contrato activo para cliente 1 (con ítems)
    const contractItems = [
      { serviceId: s1._id, serviceName: s1.name, quantity: 1, unitPrice: 150000, notes: 'Gestión mensual' },
      { serviceId: s2._id, serviceName: s2.name, quantity: 5, unitPrice: 80000, notes: 'Hasta 5 piezas' },
      { serviceId: s3._id, serviceName: s3.name, quantity: 10, unitPrice: 60000, notes: 'Hasta 10 posts' },
    ];
    const monthlyPrice = contractItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    const startDate = startOfMonth(addMonths(now, -2)); // hace 2 meses
    // Vence en 20 días para que aparezca en "Renovaciones próximas" del dashboard (ventana 30 días)
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 20);

    let contract1 = await Contract.findOne({ clientId: client1Id, status: ContractStatus.ACTIVE });
    if (!contract1) {
      contract1 = await Contract.create({
        clientId: client1Id,
        status: ContractStatus.ACTIVE,
        startDate,
        endDate,
        items: contractItems,
        monthlyPrice,
      });
      console.log('✅ Contrato activo (cliente 1) creado. Precio mensual:', monthlyPrice);
    }
    const contract1Id = (contract1 as any)._id;

    // 5. Contrato draft para cliente 2 (opcional)
    const contract2Items = [
      { serviceId: s4._id, serviceName: s4.name, quantity: 1, unitPrice: 120000, notes: 'Estrategia Q1' },
    ];
    const monthlyPrice2 = 120000;
    let contract2 = await Contract.findOne({ clientId: client2Id });
    if (!contract2) {
      contract2 = await Contract.create({
        clientId: client2Id,
        status: ContractStatus.DRAFT,
        startDate: startOfMonth(now),
        endDate: addMonths(now, 1),
        items: contract2Items,
        monthlyPrice: monthlyPrice2,
      });
      console.log('✅ Contrato draft (cliente 2) creado');
    }

    // 6. Numeración y facturas (respetar índice único contractId + billingYear + billingMonth)
    const seq = await Settings.findOneAndUpdate({}, { $inc: { nextSequence: 1 } }, { new: true, upsert: true });
    const invNum1 = `INV-${String(seq?.nextSequence ?? 1).padStart(4, '0')}`;
    const issue1 = startOfMonth(addMonths(now, -1)); // mes pasado
    const due1 = new Date(issue1);
    due1.setDate(due1.getDate() + 30);

    const invExists1 = await Invoice.findOne({
      contractId: contract1Id,
      billingYear: issue1.getFullYear(),
      billingMonth: issue1.getMonth() + 1,
    });
    if (!invExists1) {
      await Invoice.create({
        contractId: contract1Id,
        clientId: client1Id,
        invoiceNumber: invNum1,
        issueDate: issue1,
        dueDate: due1,
        billingYear: issue1.getFullYear(),
        billingMonth: issue1.getMonth() + 1,
        status: InvoiceStatus.OVERDUE, // vencida para dashboard
        totals: { subtotal: monthlyPrice, total: monthlyPrice, paidAmount: 0 },
        items: contractItems.map((i) => ({ ...i, serviceId: i.serviceId })),
      });
      console.log('✅ Factura 1 (vencida) creada:', invNum1);
    }

    const seq2 = await Settings.findOneAndUpdate({}, { $inc: { nextSequence: 1 } }, { new: true, upsert: true });
    const invNum2 = `INV-${String(seq2?.nextSequence ?? 2).padStart(4, '0')}`;
    const issue2 = startOfMonth(now);
    const due2 = new Date(issue2);
    due2.setDate(due2.getDate() + 30);

    const invExists2 = await Invoice.findOne({
      contractId: contract1Id,
      billingYear: currentYear,
      billingMonth: currentMonth,
    });
    if (!invExists2) {
      await Invoice.create({
        contractId: contract1Id,
        clientId: client1Id,
        invoiceNumber: invNum2,
        issueDate: issue2,
        dueDate: due2,
        billingYear: currentYear,
        billingMonth: currentMonth,
        status: InvoiceStatus.PENDING,
        totals: { subtotal: monthlyPrice, total: monthlyPrice, paidAmount: 0 },
        items: contractItems.map((i) => ({ ...i, serviceId: i.serviceId })),
      });
      console.log('✅ Factura 2 (pendiente) creada:', invNum2);
    }

    // 7. Factura pagada (mes anterior al vencido) + pago
    const issue3 = startOfMonth(addMonths(now, -2));
    const invExists3 = await Invoice.findOne({
      contractId: contract1Id,
      billingYear: issue3.getFullYear(),
      billingMonth: issue3.getMonth() + 1,
    });
    if (!invExists3) {
      const seq3 = await Settings.findOneAndUpdate({}, { $inc: { nextSequence: 1 } }, { new: true, upsert: true });
      const invNum3 = `INV-${String(seq3?.nextSequence ?? 3).padStart(4, '0')}`;
      const due3 = new Date(issue3);
      due3.setDate(due3.getDate() + 30);
      const invoicePaid = await Invoice.create({
        contractId: contract1Id,
        clientId: client1Id,
        invoiceNumber: invNum3,
        issueDate: issue3,
        dueDate: due3,
        billingYear: issue3.getFullYear(),
        billingMonth: issue3.getMonth() + 1,
        status: InvoiceStatus.PAID,
        totals: { subtotal: monthlyPrice, total: monthlyPrice, paidAmount: monthlyPrice },
        items: contractItems.map((i) => ({ ...i, serviceId: i.serviceId })),
      });
      await Payment.create({
        invoiceId: invoicePaid._id,
        amount: monthlyPrice,
        paymentDate: new Date(issue3.getTime() + 5 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.TRANSFER,
        reference: 'DEMO-001',
        notes: 'Pago de prueba',
        createdBy: admin._id,
      });
      console.log('✅ Factura 3 (pagada) + pago creados:', invNum3);
    }

    // 8. Escalamiento APPROVED (para que el usuario pueda probar "Aplicar" desde la UI)
    const scopeApproved = await ScopeChange.findOne({
      contractId: contract1Id,
      status: ScopeChangeStatus.APPROVED,
    });
    if (!scopeApproved) {
      await ScopeChange.create({
        contractId: contract1Id,
        clientId: client1Id,
        status: ScopeChangeStatus.APPROVED,
        requestedDate: new Date(),
        approvedDate: new Date(),
        approvedBy: admin._id,
        description: 'Ampliación de piezas de diseño (demo)',
        notes: 'Puedes aplicar este escalamiento desde la UI',
        items: [
          {
            action: ScopeChangeAction.ADD,
            serviceId: s2._id,
            serviceName: s2.name,
            quantity: 3,
            unitPrice: 80000,
            notes: '3 piezas adicionales',
          },
        ],
        invoiced: false,
      });
      console.log('✅ Escalamiento APPROVED creado (listo para aplicar desde UI)');
    }

    // 9. Escalamiento APPLIED sin facturar (para alerta en dashboard y probar "Facturar extras")
    const scopeApplied = await ScopeChange.findOne({
      contractId: contract1Id,
      status: ScopeChangeStatus.APPLIED,
      invoiced: false,
    });
    if (!scopeApplied) {
      await ScopeChange.create({
        contractId: contract1Id,
        clientId: client1Id,
        status: ScopeChangeStatus.APPLIED,
        requestedDate: new Date(),
        approvedDate: new Date(),
        appliedDate: new Date(),
        approvedBy: admin._id,
        appliedBy: admin._id,
        description: 'Incorporación de estrategia digital (demo aplicado)',
        items: [
          {
            action: ScopeChangeAction.ADD,
            serviceId: s4._id,
            serviceName: s4.name,
            quantity: 1,
            unitPrice: 120000,
            notes: 'Estrategia mensual',
          },
        ],
        invoiced: false,
      });
      console.log('✅ Escalamiento APPLIED (sin facturar) creado. Puedes facturar extras desde el dashboard.');
    }

    // 10. Plantilla de paquete
    const templateExists = await PackageTemplate.findOne({ name: 'Paquete demo estándar' });
    if (!templateExists) {
      const templateItems = [
        { serviceId: s1._id, quantity: 1, unitPrice: 150000 },
        { serviceId: s2._id, quantity: 3, unitPrice: 80000 },
        { serviceId: s3._id, quantity: 5, unitPrice: 60000 },
      ];
      const basePrice = templateItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      await PackageTemplate.create({
        name: 'Paquete demo estándar',
        description: 'Para probar creación de contrato desde plantilla',
        items: templateItems,
        basePrice,
        isActive: true,
      });
      console.log('✅ Plantilla de paquete creada');
    }

    // 11. Allocation (reporte de carga de trabajo)
    const allocExists = await Allocation.findOne({
      userId: admin._id,
      year: currentYear,
      month: currentMonth,
    });
    if (!allocExists) {
      await Allocation.create({
        userId: admin._id,
        contractId: contract1Id,
        clientId: client1Id,
        percentage: 50,
        year: currentYear,
        month: currentMonth,
        notes: 'Asignación demo',
      });
      console.log('✅ Asignación (workload) creada');
    }

    console.log('\n✅ Seed de demostración completado.');
    console.log('   - Login con tu admin (ej. ' + (admin as any).email + ')');
    console.log('   - Dashboard: facturas vencidas, pendientes, escalamiento sin facturar, renovación');
    console.log('   - Clientes: Empresa Demo Mensual / Empresa Demo Proyecto');
    console.log('   - Facturación: registrar pagos, facturar extras desde dashboard');
    console.log('   - Escalamientos: aplicar el aprobado, facturar el aplicado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed-demo:', error);
    process.exit(1);
  }
}

seedDemo();
