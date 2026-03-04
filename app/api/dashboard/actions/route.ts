import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice, { InvoiceStatus } from '@/models/Invoice';
import ScopeChange, { ScopeChangeStatus } from '@/models/ScopeChange';
import Contract, { ContractStatus } from '@/models/Contract';
import Client from '@/models/Client';
import mongoose from 'mongoose';

interface ActionItem {
  type: 'overdue_invoice' | 'due_today_invoice' | 'unscoped_change' | 'renewal';
  priority: number;
  title: string;
  description: string;
  date: Date;
  link: string;
  data: any;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    // Asegurar que los modelos estén registrados
    if (!mongoose.models.Client) {
      await import('@/models/Client');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // 1. Facturas que vencen hoy
    const invoicesDueToday = await Invoice.find({
      dueDate: {
        $gte: today,
        $lt: tomorrow,
      },
      status: InvoiceStatus.PENDING,
    })
      .populate('clientId', 'name email')
      .populate('contractId', 'name')
      .sort({ dueDate: 1 });

    // 2. Facturas vencidas
    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: today },
      status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
    })
      .populate('clientId', 'name email')
      .populate('contractId', 'name')
      .sort({ dueDate: 1 });

    // Filtrar solo las que no están completamente pagadas
    const unpaidOverdueInvoices = overdueInvoices.filter(
      (inv) => inv.totals.paidAmount < inv.totals.total
    );

    // 3. Escalamientos sin facturar
    const unscopedChanges = await ScopeChange.find({
      status: ScopeChangeStatus.APPLIED,
      invoiced: false,
    })
      .populate('clientId', 'name email')
      .populate('contractId', 'name monthlyPrice')
      .sort({ appliedDate: 1 });

    // 4. Renovaciones próximas (contratos que vencen en los próximos 30 días)
    const upcomingRenewals = await Contract.find({
      status: ContractStatus.ACTIVE,
      endDate: {
        $gte: today,
        $lte: thirtyDaysFromNow,
      },
    })
      .populate('clientId', 'name email')
      .sort({ endDate: 1 });

    // 5. Construir lista de acciones ordenadas por urgencia
    const allActions: ActionItem[] = [];

    // Facturas vencidas (Prioridad 1 - Crítico)
    for (const invoice of unpaidOverdueInvoices) {
      const dueDateObj = invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate);
      const daysOverdue = Math.floor(
        (today.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24)
      );
      allActions.push({
        type: 'overdue_invoice',
        priority: 1,
        title: `Factura vencida: ${invoice.invoiceNumber || 'Sin número'}`,
        description: `${(invoice.clientId as any)?.name || 'Cliente'} - Vencida hace ${daysOverdue} día(s) - $${(invoice.totals.total - invoice.totals.paidAmount).toLocaleString()} pendiente`,
        date: dueDateObj,
        link: `/admin/billing?invoiceId=${invoice._id}`,
        data: invoice,
      });
    }

    // Facturas que vencen hoy (Prioridad 2 - Alto)
    for (const invoice of invoicesDueToday) {
      const dueDateObj = invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate);
      allActions.push({
        type: 'due_today_invoice',
        priority: 2,
        title: `Factura vence hoy: ${invoice.invoiceNumber || 'Sin número'}`,
        description: `${(invoice.clientId as any)?.name || 'Cliente'} - $${(invoice.totals.total - invoice.totals.paidAmount).toLocaleString()} pendiente`,
        date: dueDateObj,
        link: `/admin/billing?invoiceId=${invoice._id}`,
        data: invoice,
      });
    }

    // Escalamientos sin facturar (Prioridad 3 - Medio)
    for (const scopeChange of unscopedChanges) {
      const appliedDate = scopeChange.appliedDate || scopeChange.createdAt || new Date();
      const appliedDateObj = appliedDate instanceof Date ? appliedDate : new Date(appliedDate);
      const daysSinceApplied = Math.floor(
        (today.getTime() - appliedDateObj.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Calcular monto del escalamiento
      const amount = scopeChange.items.reduce((sum: number, item: any) => {
        if (item.action === 'add' || item.action === 'modify') {
          return sum + (item.quantity || 0) * (item.unitPrice || 0);
        }
        return sum;
      }, 0);

      allActions.push({
        type: 'unscoped_change',
        priority: daysSinceApplied > 7 ? 3 : 4, // Más urgente si tiene más de 7 días
        title: `Escalamiento sin facturar: ${scopeChange.description}`,
        description: `${(scopeChange.clientId as any)?.name || 'Cliente'} - Aplicado hace ${daysSinceApplied} día(s) - $${amount.toLocaleString()}`,
        date: appliedDateObj,
        link: `/admin/scope-changes`,
        data: scopeChange,
      });
    }

    // Renovaciones próximas (Prioridad 4-5 - Bajo/Info)
    for (const contract of upcomingRenewals) {
      if (!contract.endDate) continue;
      
      const endDateObj = contract.endDate instanceof Date ? contract.endDate : new Date(contract.endDate);
      const daysUntilRenewal = Math.floor(
        (endDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const priority = daysUntilRenewal <= 15 ? 4 : 5;

      allActions.push({
        type: 'renewal',
        priority,
        title: `Renovación próxima: ${(contract.clientId as any)?.name || 'Cliente'}`,
        description: `Contrato vence en ${daysUntilRenewal} día(s)`,
        date: endDateObj,
        link: `/admin/clients/${(contract.clientId as any)?._id || contract.clientId}`,
        data: contract,
      });
    }

    // Ordenar acciones: primero por prioridad (ascendente), luego por fecha (ascendente)
    allActions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    return NextResponse.json({
      invoicesDueToday,
      overdueInvoices: unpaidOverdueInvoices,
      unscopedChanges,
      upcomingRenewals,
      allActions,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard actions:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener acciones del dashboard' },
      { status: 500 }
    );
  }
}
