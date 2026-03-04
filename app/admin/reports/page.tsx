'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RevenueReport {
  period: { year: number; month: number | null };
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalPending: number;
    invoiceCount: number;
  };
  byPeriod: Array<{
    _id: { year: number; month?: number };
    totalInvoiced: number;
    totalPaid: number;
    totalPending: number;
    invoiceCount: number;
  }>;
  recentPayments: any[];
}

interface ARReport {
  summary: {
    totalAR: number;
    invoiceCount: number;
    clientCount: number;
  };
  byClient: Array<{
    clientId: string;
    clientName: string;
    totalAR: number;
    invoiceCount: number;
    invoices: any[];
  }>;
  overdueRanges: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
}

interface RenewalsReport {
  summary: {
    upcomingCount: number;
    noEndDateCount: number;
    totalUpcomingValue: number;
    totalNoEndDateValue: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
    totalMonthlyValue: number;
    contracts: any[];
  }>;
  upcomingRenewals: any[];
  noEndDate: any[];
}

interface WorkloadReport {
  period: { year: number; month: number };
  summary: {
    totalUsers: number;
    overAllocatedUsers: number;
    underAllocatedUsers: number;
    fullyAllocatedUsers: number;
    avgAllocation: number;
    totalAllocations: number;
  };
  byUser: Array<{
    userId: string;
    userName: string;
    totalAllocation: number;
    isOverAllocated: boolean;
    isUnderAllocated: boolean;
    availableCapacity: number;
    allocations: any[];
  }>;
  byClient: Array<{
    clientId: string;
    clientName: string;
    totalAllocation: number;
    userCount: number;
    allocations: any[];
  }>;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'ar' | 'renewals' | 'workload'>('revenue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [revenueYear, setRevenueYear] = useState(new Date().getFullYear());
  const [revenueMonth, setRevenueMonth] = useState<number | null>(null);
  const [workloadYear, setWorkloadYear] = useState(new Date().getFullYear());
  const [workloadMonth, setWorkloadMonth] = useState(new Date().getMonth() + 1);

  // Datos de reportes
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null);
  const [arData, setArData] = useState<ARReport | null>(null);
  const [renewalsData, setRenewalsData] = useState<RenewalsReport | null>(null);
  const [workloadData, setWorkloadData] = useState<WorkloadReport | null>(null);

  useEffect(() => {
    if (activeTab === 'revenue') {
      fetchRevenueReport();
    } else if (activeTab === 'ar') {
      fetchARReport();
    } else if (activeTab === 'renewals') {
      fetchRenewalsReport();
    } else if (activeTab === 'workload') {
      fetchWorkloadReport();
    }
  }, [activeTab, revenueYear, revenueMonth, workloadYear, workloadMonth]);

  const fetchRevenueReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year: revenueYear.toString() });
      if (revenueMonth) params.append('month', revenueMonth.toString());
      const res = await fetch(`/api/reports/revenue?${params}`);
      if (!res.ok) throw new Error('Error al obtener reporte de ingresos');
      const data = await res.json();
      setRevenueData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchARReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports/ar');
      if (!res.ok) throw new Error('Error al obtener reporte de cuentas por cobrar');
      const data = await res.json();
      setArData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRenewalsReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports/renewals?daysAhead=90');
      if (!res.ok) throw new Error('Error al obtener reporte de renovaciones');
      const data = await res.json();
      setRenewalsData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkloadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        year: workloadYear.toString(),
        month: workloadMonth.toString(),
      });
      const res = await fetch(`/api/reports/workload?${params}`);
      if (!res.ok) throw new Error('Error al obtener reporte de carga de trabajo');
      const data = await res.json();
      setWorkloadData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderRevenueReport = () => {
    if (!revenueData) return <p className="text-gray-500">No hay datos disponibles</p>;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Facturado</p>
              <p className="text-2xl font-bold text-gray-900">
                ${revenueData.summary.totalInvoiced.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Pagado</p>
              <p className="text-2xl font-bold text-green-600">
                ${revenueData.summary.totalPaid.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Pendiente</p>
              <p className="text-2xl font-bold text-yellow-600">
                ${revenueData.summary.totalPending.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Facturas</p>
              <p className="text-2xl font-bold text-gray-900">{revenueData.summary.invoiceCount}</p>
            </div>
          </div>
        </div>

        {revenueData.byPeriod.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Período</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Período
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Facturado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Pagado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Pendiente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Facturas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revenueData.byPeriod.map((period, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {period._id.month
                          ? `${period._id.month}/${period._id.year}`
                          : `Año ${period._id.year}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        ${period.totalInvoiced.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                        ${period.totalPaid.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600">
                        ${period.totalPending.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {period.invoiceCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderARReport = () => {
    if (!arData) return <p className="text-gray-500">No hay datos disponibles</p>;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total AR</p>
              <p className="text-2xl font-bold text-red-600">
                ${arData.summary.totalAR.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Facturas Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{arData.summary.invoiceCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Clientes con AR</p>
              <p className="text-2xl font-bold text-gray-900">{arData.summary.clientCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Rango de Días Vencidos</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">0-30 días</p>
              <p className="text-xl font-bold text-yellow-600">
                ${arData.overdueRanges['0-30'].toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">31-60 días</p>
              <p className="text-xl font-bold text-orange-600">
                ${arData.overdueRanges['31-60'].toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">61-90 días</p>
              <p className="text-xl font-bold text-red-600">
                ${arData.overdueRanges['61-90'].toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">90+ días</p>
              <p className="text-xl font-bold text-red-800">
                ${arData.overdueRanges['90+'].toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {arData.byClient.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Cliente</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Total AR
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Facturas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {arData.byClient.slice(0, 20).map((client, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                        ${client.totalAR.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {client.invoiceCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRenewalsReport = () => {
    if (!renewalsData) return <p className="text-gray-500">No hay datos disponibles</p>;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Próximas Renovaciones</p>
              <p className="text-2xl font-bold text-gray-900">{renewalsData.summary.upcomingCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sin Fecha de Fin</p>
              <p className="text-2xl font-bold text-yellow-600">
                {renewalsData.summary.noEndDateCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valor Próximas</p>
              <p className="text-2xl font-bold text-green-600">
                ${renewalsData.summary.totalUpcomingValue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valor Sin Fecha</p>
              <p className="text-2xl font-bold text-gray-600">
                ${renewalsData.summary.totalNoEndDateValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {renewalsData.byMonth.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Mes</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Mes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Contratos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Valor Mensual
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renewalsData.byMonth.map((month, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {month.month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {month.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        ${month.totalMonthlyValue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkloadReport = () => {
    if (!workloadData) return <p className="text-gray-500">No hay datos disponibles</p>;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{workloadData.summary.totalUsers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sobreasignados</p>
              <p className="text-2xl font-bold text-red-600">
                {workloadData.summary.overAllocatedUsers}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Subasignados</p>
              <p className="text-2xl font-bold text-yellow-600">
                {workloadData.summary.underAllocatedUsers}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completamente Asignados</p>
              <p className="text-2xl font-bold text-green-600">
                {workloadData.summary.fullyAllocatedUsers}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {workloadData.summary.avgAllocation.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {workloadData.byUser.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Usuario</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Asignación Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Capacidad Disponible
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workloadData.byUser.map((user, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.userName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                        <span
                          className={
                            user.totalAllocation > 100
                              ? 'text-red-600'
                              : user.totalAllocation === 100
                              ? 'text-green-600'
                              : 'text-gray-900'
                          }
                        >
                          {user.totalAllocation}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {user.availableCapacity}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {user.isOverAllocated && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Sobreasignado
                          </span>
                        )}
                        {user.totalAllocation === 100 && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Completo
                          </span>
                        )}
                        {user.isUnderAllocated && !user.isOverAllocated && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Disponible
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="mt-2 text-gray-600">Visualiza métricas y análisis del sistema</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'revenue', label: 'Ingresos' },
            { id: 'ar', label: 'Cuentas por Cobrar' },
            { id: 'renewals', label: 'Renovaciones' },
            { id: 'workload', label: 'Carga de Trabajo' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filtros */}
      {activeTab === 'revenue' && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input
                type="number"
                value={revenueYear}
                onChange={(e) => setRevenueYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="2000"
                max="9999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes (opcional)</label>
              <select
                value={revenueMonth || ''}
                onChange={(e) => setRevenueMonth(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Todos los meses</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {format(new Date(2000, m - 1, 1), 'MMMM', { locale: es })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workload' && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input
                type="number"
                value={workloadYear}
                onChange={(e) => setWorkloadYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="2000"
                max="9999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <select
                value={workloadMonth}
                onChange={(e) => setWorkloadMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {format(new Date(2000, m - 1, 1), 'MMMM', { locale: es })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Contenido del reporte */}
      {loading && <div className="text-center py-8 text-gray-500">Cargando reporte...</div>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error}
        </div>
      )}
      {!loading && !error && (
        <>
          {activeTab === 'revenue' && renderRevenueReport()}
          {activeTab === 'ar' && renderARReport()}
          {activeTab === 'renewals' && renderRenewalsReport()}
          {activeTab === 'workload' && renderWorkloadReport()}
        </>
      )}
    </div>
  );
}
