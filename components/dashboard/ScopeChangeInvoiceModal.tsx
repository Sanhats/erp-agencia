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
  appliedDate: string;
  items: Array<{
    action: string;
    serviceName: string;
    quantity?: number;
    unitPrice?: number;
  }>;
}

interface ScopeChangeInvoiceModalProps {
  scopeChanges: ScopeChange[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScopeChangeInvoiceModal({
  scopeChanges,
  onClose,
  onSuccess,
}: ScopeChangeInvoiceModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Seleccionar todos por defecto
    setSelectedIds(new Set(scopeChanges.map((sc) => sc._id)));
  }, [scopeChanges]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === scopeChanges.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(scopeChanges.map((sc) => sc._id)));
    }
  };

  const calculateTotal = () => {
    let total = 0;
    for (const scopeChange of scopeChanges) {
      if (selectedIds.has(scopeChange._id)) {
        for (const item of scopeChange.items) {
          if (item.action === 'add' || item.action === 'modify') {
            total += (item.quantity || 0) * (item.unitPrice || 0);
          }
        }
      }
    }
    return total;
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      setError('Debes seleccionar al menos un escalamiento');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/invoices/scope-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeChangeIds: Array.from(selectedIds),
          issueDate,
          dueDate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear factura');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear factura');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Facturar Escalamientos</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* Lista de escalamientos */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Escalamientos Disponibles</h3>
              <button
                onClick={toggleAll}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                {selectedIds.size === scopeChanges.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scopeChanges.map((scopeChange) => {
                const amount = scopeChange.items.reduce((sum, item) => {
                  if (item.action === 'add' || item.action === 'modify') {
                    return sum + (item.quantity || 0) * (item.unitPrice || 0);
                  }
                  return sum;
                }, 0);

                return (
                  <div
                    key={scopeChange._id}
                    className={`p-3 border rounded ${
                      selectedIds.has(scopeChange._id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(scopeChange._id)}
                        onChange={() => toggleSelection(scopeChange._id)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {scopeChange.clientId.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {scopeChange.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Aplicado: {new Date(scopeChange.appliedDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm font-semibold text-indigo-600 mt-1">
                          ${amount.toLocaleString()}
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totales */}
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total a Facturar:</span>
              <span className="text-2xl font-bold text-indigo-600">
                ${total.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedIds.size} escalamiento{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Campos de factura */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Emisión
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Notas adicionales para la factura..."
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || selectedIds.size === 0}
            >
              {loading ? 'Creando Factura...' : 'Crear Factura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
