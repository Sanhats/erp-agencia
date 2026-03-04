'use client';

import { useState, useEffect } from 'react';
import AlertCard from '@/components/dashboard/AlertCard';
import ActionList from '@/components/dashboard/ActionList';
import ScopeChangeInvoiceModal from '@/components/dashboard/ScopeChangeInvoiceModal';

interface Invoice {
  _id: string;
  invoiceNumber?: string;
  dueDate: string;
  totals: {
    total: number;
    paidAmount: number;
  };
  clientId: {
    name: string;
  };
}

interface ScopeChange {
  _id: string;
  clientId: {
    _id: string;
    name: string;
  };
  contractId: {
    _id: string;
    name?: string;
  };
  description: string;
  appliedDate: string;
  items: Array<{
    action: string;
    serviceName: string;
    quantity?: number;
    unitPrice?: number;
  }>;
}

interface Contract {
  _id: string;
  endDate: string;
  clientId: {
    _id: string;
    name: string;
  };
}

interface ActionItem {
  type: 'overdue_invoice' | 'due_today_invoice' | 'unscoped_change' | 'renewal';
  priority: number;
  title: string;
  description: string;
  date: string;
  link: string;
  data: any;
}

interface DashboardData {
  invoicesDueToday: Invoice[];
  overdueInvoices: Invoice[];
  unscopedChanges: ScopeChange[];
  upcomingRenewals: Contract[];
  allActions: ActionItem[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/actions');
      if (!res.ok) {
        throw new Error('Error al obtener datos del dashboard');
      }
      const dashboardData = await res.json();
      setData(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSuccess = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-red-600">Error al cargar datos del dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Resumen de acciones y alertas prioritarias
        </p>
      </div>

      {/* Alertas Urgentes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Alertas Urgentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AlertCard
            type="overdue"
            title="Facturas Vencidas"
            description="Facturas con fecha de vencimiento pasada"
            count={data.overdueInvoices.length}
            link="/admin/billing?status=overdue"
            priority={1}
          />
          <AlertCard
            type="due_today"
            title="Vencen Hoy"
            description="Facturas que vencen hoy"
            count={data.invoicesDueToday.length}
            link="/admin/billing?status=due_today"
            priority={2}
          />
        </div>
      </div>

      {/* Acciones Pendientes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Pendientes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Escalamientos Sin Facturar
              </h3>
              {data.unscopedChanges.length > 0 && (
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Facturar
                </button>
              )}
            </div>
            <AlertCard
              type="unscoped"
              title="Escalamientos Pendientes"
              description="Escalamientos aplicados que aún no han sido facturados"
              count={data.unscopedChanges.length}
              link="/admin/scope-changes?invoiced=false"
              priority={3}
            />
          </div>
          <AlertCard
            type="renewal"
            title="Renovaciones Próximas"
            description="Contratos que vencen en los próximos 30 días"
            count={data.upcomingRenewals.length}
            link="/admin/clients"
            priority={4}
          />
        </div>
      </div>

      {/* Resumen de Acciones */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Todas las Acciones (Ordenadas por Urgencia)
        </h2>
        <ActionList actions={data.allActions} maxItems={20} />
      </div>

      {/* Modal para facturar escalamientos */}
      {showInvoiceModal && (
        <ScopeChangeInvoiceModal
          scopeChanges={data.unscopedChanges}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </div>
  );
}
