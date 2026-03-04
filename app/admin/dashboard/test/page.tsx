'use client';

import { useState, useEffect } from 'react';
import { ScopeChangeStatus } from '@/types/scope-change';

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
  status: ScopeChangeStatus;
  appliedDate: string;
  invoiced: boolean;
  invoiceId?: string;
  items: Array<{
    action: string;
    serviceName: string;
    quantity?: number;
    unitPrice?: number;
  }>;
}

interface Invoice {
  _id: string;
  invoiceNumber?: string;
  issueDate: string;
  dueDate: string;
  totals: {
    subtotal: number;
    total: number;
    paidAmount: number;
  };
  items: Array<{
    serviceName: string;
    quantity: number;
    unitPrice: number;
    scopeChangeId?: string;
    isExtra?: boolean;
  }>;
  clientId: {
    name: string;
  };
}

interface DashboardData {
  invoicesDueToday: Invoice[];
  overdueInvoices: Invoice[];
  unscopedChanges: ScopeChange[];
  upcomingRenewals: any[];
  allActions: any[];
}

export default function DashboardTestPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [scopeChanges, setScopeChanges] = useState<ScopeChange[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Obtener datos del dashboard
      const dashboardRes = await fetch('/api/dashboard/actions');
      if (dashboardRes.ok) {
        const dashboard = await dashboardRes.json();
        setDashboardData(dashboard);
      } else {
        console.error('Error fetching dashboard:', await dashboardRes.text());
      }

      // Obtener escalamientos aplicados sin facturar
      const scopeRes = await fetch('/api/scope-changes?status=applied&invoiced=false');
      if (scopeRes.ok) {
        const scopeData = await scopeRes.json();
        setScopeChanges(scopeData || []);
      } else {
        console.error('Error fetching scope changes:', await scopeRes.text());
        setScopeChanges([]);
      }

      // Obtener facturas recientes
      const invoiceRes = await fetch('/api/invoices');
      if (invoiceRes.ok) {
        const invoiceData = await invoiceRes.json();
        setInvoices((invoiceData || []).slice(0, 10));
      } else {
        console.error('Error fetching invoices:', await invoiceRes.text());
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Test 1: Facturar escalamiento individual
  const testInvoiceScopeChange = async (scopeChangeId: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices/scope-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeChangeIds: [scopeChangeId],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Error response:', data);
        throw new Error(data.error || `Error al facturar: ${res.status} ${res.statusText}`);
      }

      showMessage('success', `Factura creada: ${data.invoice?.invoiceNumber || data.invoiceNumber || data._id}`);
      await fetchData();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al facturar escalamiento');
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Facturar múltiples escalamientos
  const testInvoiceMultiple = async () => {
    if (scopeChanges.length < 2) {
      showMessage('error', 'Se necesitan al menos 2 escalamientos para esta prueba');
      return;
    }

    try {
      setLoading(true);
      const selectedIds = scopeChanges.slice(0, 2).map((sc) => sc._id);

      const res = await fetch('/api/invoices/scope-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeChangeIds: selectedIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Error response:', data);
        throw new Error(data.error || `Error al facturar: ${res.status} ${res.statusText}`);
      }

      showMessage('success', `Factura creada con ${selectedIds.length} escalamientos: ${data.invoice?.invoiceNumber || data.invoiceNumber || data._id}`);
      await fetchData();
    } catch (error: any) {
      showMessage('error', error.message || 'Error al facturar escalamientos');
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Verificar que escalamiento se marcó como facturado
  const testVerifyInvoiced = async (scopeChangeId: string) => {
    try {
      const res = await fetch(`/api/scope-changes/${scopeChangeId}`);
      const data = await res.json();

      if (data.invoiced) {
        showMessage('success', `✓ Correcto: El escalamiento está marcado como facturado. Invoice ID: ${data.invoiceId || 'N/A'}`);
      } else {
        showMessage('error', `✗ Error: El escalamiento NO está marcado como facturado`);
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al verificar');
    }
  };

  // Test 4: Verificar items de factura tienen scopeChangeId
  const testVerifyInvoiceItems = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();

      const itemsWithScope = data.items.filter((item: any) => item.scopeChangeId);
      const itemsWithExtra = data.items.filter((item: any) => item.isExtra);

      if (itemsWithScope.length > 0 && itemsWithExtra.length > 0) {
        showMessage(
          'success',
          `✓ Correcto: La factura tiene ${itemsWithScope.length} items con scopeChangeId y ${itemsWithExtra.length} marcados como extra`
        );
      } else {
        showMessage('error', `✗ Error: La factura no tiene items con scopeChangeId o isExtra`);
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al verificar');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🧪 Pruebas - Dashboard y Facturación de Extras</h1>
        <p className="mt-2 text-gray-600">
          Herramientas temporales para probar el sistema de facturación de escalamientos y dashboard
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Resumen del Dashboard */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Resumen del Dashboard
        </h2>
        {dashboardData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-red-50 rounded border-l-4 border-red-500">
              <p className="text-sm font-medium text-red-700">Facturas Vencidas</p>
              <p className="text-2xl font-bold text-red-600">
                {dashboardData.overdueInvoices?.length || 0}
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded border-l-4 border-orange-500">
              <p className="text-sm font-medium text-orange-700">Vencen Hoy</p>
              <p className="text-2xl font-bold text-orange-600">
                {dashboardData.invoicesDueToday?.length || 0}
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded border-l-4 border-yellow-500">
              <p className="text-sm font-medium text-yellow-700">Sin Facturar</p>
              <p className="text-2xl font-bold text-yellow-600">
                {dashboardData.unscopedChanges?.length || 0}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded border-l-4 border-blue-500">
              <p className="text-sm font-medium text-blue-700">Renovaciones</p>
              <p className="text-2xl font-bold text-blue-600">
                {dashboardData.upcomingRenewals?.length || 0}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Cargando datos del dashboard...</p>
        )}
      </div>

      {/* Test 1: Escalamientos Sin Facturar */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Test 1: Escalamientos Aplicados Sin Facturar
        </h2>
        {scopeChanges.length === 0 ? (
          <p className="text-gray-600">No hay escalamientos aplicados sin facturar</p>
        ) : (
          <div className="space-y-3">
            {scopeChanges.map((sc) => {
              const amount = sc.items.reduce((sum, item) => {
                if (item.action === 'add' || item.action === 'modify') {
                  return sum + (item.quantity || 0) * (item.unitPrice || 0);
                }
                return sum;
              }, 0);

              return (
                <div key={sc._id} className="p-4 border border-yellow-300 rounded bg-yellow-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {sc.clientId.name} - {sc.description}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Aplicado: {new Date(sc.appliedDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-semibold text-indigo-600 mt-1">
                        ${amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => testInvoiceScopeChange(sc._id)}
                        disabled={loading}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Facturar
                      </button>
                      <button
                        onClick={() => testVerifyInvoiced(sc._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Verificar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Test 2: Facturar Múltiples */}
      {scopeChanges.length >= 2 && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Test 2: Facturar Múltiples Escalamientos
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Factura los primeros 2 escalamientos juntos
          </p>
          <button
            onClick={testInvoiceMultiple}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Facturar Múltiples
          </button>
        </div>
      )}

      {/* Test 3: Facturas Recientes */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Test 3: Verificar Facturas Creadas
        </h2>
        {invoices.length === 0 ? (
          <p className="text-gray-600">No hay facturas recientes</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const itemsWithScope = invoice.items.filter((item) => item.scopeChangeId);
              const itemsWithExtra = invoice.items.filter((item) => item.isExtra);

              return (
                <div key={invoice._id} className="p-4 border border-gray-200 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {invoice.invoiceNumber || 'Sin número'} - {invoice.clientId.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Total: ${invoice.totals.total.toLocaleString()} | Pagado: ${invoice.totals.paidAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Items con scope: {itemsWithScope.length} | Items extra: {itemsWithExtra.length}
                      </p>
                    </div>
                    <button
                      onClick={() => testVerifyInvoiceItems(invoice._id)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Verificar Items
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Test 4: Acciones del Dashboard */}
      {dashboardData && dashboardData.allActions && dashboardData.allActions.length > 0 && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Test 4: Acciones del Dashboard (Ordenadas por Urgencia)
          </h2>
          <div className="space-y-2">
            {dashboardData.allActions.slice(0, 10).map((action, index) => (
              <div
                key={index}
                className={`p-3 border-l-4 rounded ${
                  action.priority === 1
                    ? 'border-red-500 bg-red-50'
                    : action.priority === 2
                    ? 'border-orange-500 bg-orange-50'
                    : action.priority === 3
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{action.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Prioridad: {action.priority} | {new Date(action.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón Actualizar */}
      <div className="mb-8">
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Actualizar Datos
        </button>
      </div>
    </div>
  );
}
