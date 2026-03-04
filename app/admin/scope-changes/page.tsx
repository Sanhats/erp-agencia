'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScopeChangeStatus, ScopeChangeAction } from '@/types/scope-change';
import ScopeChangeCard from '@/components/scope-changes/ScopeChangeCard';
import ApplyScopeChangeModal from '@/components/scope-changes/ApplyScopeChangeModal';

interface ScopeChange {
  _id: string;
  contractId: {
    _id: string;
    name?: string;
  };
  clientId: {
    _id: string;
    name: string;
  };
  status: ScopeChangeStatus;
  requestedDate: string;
  approvedDate?: string;
  appliedDate?: string;
  description: string;
  items: Array<{
    action: ScopeChangeAction;
    serviceName: string;
    quantity?: number;
    unitPrice?: number;
  }>;
  invoiced: boolean;
}

export default function ScopeChangesPage() {
  const router = useRouter();
  const [scopeChanges, setScopeChanges] = useState<ScopeChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScopeChange, setSelectedScopeChange] = useState<ScopeChange | null>(null);
  const [applyingScopeChange, setApplyingScopeChange] = useState<ScopeChange | null>(null);
  const [filters, setFilters] = useState({
    status: '' as string,
    invoiced: '',
  });

  useEffect(() => {
    fetchScopeChanges();
  }, [filters]);

  const fetchScopeChanges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.invoiced !== '') {
        params.append('invoiced', filters.invoiced);
      }

      const res = await fetch(`/api/scope-changes?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Error al obtener escalamientos');
      }
      const data = await res.json();
      setScopeChanges(data);
    } catch (error) {
      console.error('Error fetching scope changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/scope-changes/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al aprobar');
      }

      await fetchScopeChanges();
    } catch (error: any) {
      alert(error.message || 'Error al aprobar escalamiento');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('¿Estás seguro de rechazar este escalamiento?')) {
      return;
    }

    try {
      const res = await fetch(`/api/scope-changes/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al rechazar');
      }

      await fetchScopeChanges();
    } catch (error: any) {
      alert(error.message || 'Error al rechazar escalamiento');
    }
  };

  const handleApply = async () => {
    if (!applyingScopeChange) return;

    try {
      const res = await fetch(`/api/scope-changes/${applyingScopeChange._id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al aplicar');
      }

      setApplyingScopeChange(null);
      await fetchScopeChanges();
      alert('Escalamiento aplicado correctamente');
    } catch (error: any) {
      alert(error.message || 'Error al aplicar escalamiento');
    }
  };

  const handleOpenApplyModal = async (scopeChange: ScopeChange) => {
    // Obtener detalles completos del escalamiento
    try {
      const res = await fetch(`/api/scope-changes/${scopeChange._id}`);
      if (!res.ok) throw new Error('Error al obtener detalles');
      const data = await res.json();
      setApplyingScopeChange(data);
    } catch (error: any) {
      alert(error.message || 'Error al obtener detalles');
    }
  };

  const pendingChanges = scopeChanges.filter(
    (sc) => sc.status === ScopeChangeStatus.PENDING
  );
  const approvedChanges = scopeChanges.filter(
    (sc) => sc.status === ScopeChangeStatus.APPROVED
  );
  const appliedChanges = scopeChanges.filter(
    (sc) => sc.status === ScopeChangeStatus.APPLIED
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Escalamientos</h1>
            <p className="mt-2 text-gray-600">
              Gestiona los cambios de alcance de contratos
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/scope-changes/new')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            + Nuevo Escalamiento
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value={ScopeChangeStatus.PENDING}>Pendiente</option>
              <option value={ScopeChangeStatus.APPROVED}>Aprobado</option>
              <option value={ScopeChangeStatus.APPLIED}>Aplicado</option>
              <option value={ScopeChangeStatus.REJECTED}>Rechazado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facturado
            </label>
            <select
              value={filters.invoiced}
              onChange={(e) => setFilters({ ...filters, invoiced: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value="false">No facturado</option>
              <option value="true">Facturado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-yellow-50 rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-yellow-700 mb-2">Pendientes</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingChanges.length}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-blue-700 mb-2">Aprobados</h3>
          <p className="text-3xl font-bold text-blue-600">{approvedChanges.length}</p>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-6 border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-purple-700 mb-2">Aplicados</h3>
          <p className="text-3xl font-bold text-purple-600">{appliedChanges.length}</p>
        </div>
      </div>

      {/* Lista de Escalamientos */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando escalamientos...</p>
        </div>
      ) : scopeChanges.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">No hay escalamientos para mostrar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scopeChanges.map((scopeChange) => (
            <ScopeChangeCard
              key={scopeChange._id}
              scopeChange={scopeChange}
              onApprove={
                scopeChange.status === ScopeChangeStatus.PENDING
                  ? () => handleApprove(scopeChange._id)
                  : undefined
              }
              onReject={
                scopeChange.status === ScopeChangeStatus.PENDING
                  ? () => handleReject(scopeChange._id)
                  : undefined
              }
              onApply={
                scopeChange.status === ScopeChangeStatus.APPROVED
                  ? () => handleOpenApplyModal(scopeChange)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Modal Aplicar */}
      {applyingScopeChange && (
        <ApplyScopeChangeModal
          scopeChange={applyingScopeChange as any}
          onClose={() => setApplyingScopeChange(null)}
          onConfirm={handleApply}
        />
      )}
    </div>
  );
}
