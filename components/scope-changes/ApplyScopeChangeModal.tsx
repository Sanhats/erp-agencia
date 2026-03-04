'use client';

import { ScopeChangeAction } from '@/types/scope-change';
import { useState } from 'react';

interface ScopeChangeItem {
  action: ScopeChangeAction;
  serviceName: string;
  quantity?: number;
  unitPrice?: number;
  originalItemIndex?: number;
}

interface ContractItem {
  serviceName: string;
  quantity: number;
  unitPrice: number;
}

interface ScopeChange {
  _id: string;
  contractId: {
    _id: string;
    items: ContractItem[];
    monthlyPrice: number;
  };
  items: ScopeChangeItem[];
  description: string;
}

interface ApplyScopeChangeModalProps {
  scopeChange: ScopeChange;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ApplyScopeChangeModal({
  scopeChange,
  onClose,
  onConfirm,
  loading = false,
}: ApplyScopeChangeModalProps) {
  const getActionLabel = (action: ScopeChangeAction) => {
    switch (action) {
      case ScopeChangeAction.ADD:
        return 'Agregar';
      case ScopeChangeAction.MODIFY:
        return 'Modificar';
      case ScopeChangeAction.REMOVE:
        return 'Eliminar';
      default:
        return action;
    }
  };

  // Calcular nuevo monthlyPrice
  const currentItems = [...scopeChange.contractId.items];
  const newItems: ContractItem[] = [...currentItems];

  // Aplicar cambios (mismo algoritmo que en el backend)
  const sortedItems = [...scopeChange.items].sort((a, b) => {
    if (a.action === ScopeChangeAction.REMOVE && b.action !== ScopeChangeAction.REMOVE) {
      return -1;
    }
    if (a.action !== ScopeChangeAction.REMOVE && b.action === ScopeChangeAction.REMOVE) {
      return 1;
    }
    if (a.action === ScopeChangeAction.REMOVE && b.action === ScopeChangeAction.REMOVE) {
      return (b.originalItemIndex || 0) - (a.originalItemIndex || 0);
    }
    return 0;
  });

  for (const change of sortedItems) {
    if (change.action === ScopeChangeAction.ADD) {
      newItems.push({
        serviceName: change.serviceName,
        quantity: change.quantity!,
        unitPrice: change.unitPrice!,
      });
    } else if (change.action === ScopeChangeAction.MODIFY) {
      const index = change.originalItemIndex!;
      if (index >= 0 && index < newItems.length) {
        newItems[index] = {
          ...newItems[index],
          quantity: change.quantity!,
          unitPrice: change.unitPrice!,
        };
      }
    } else if (change.action === ScopeChangeAction.REMOVE) {
      const index = change.originalItemIndex!;
      if (index >= 0 && index < newItems.length) {
        newItems.splice(index, 1);
      }
    }
  }

  const currentMonthlyPrice = scopeChange.contractId.monthlyPrice;
  const newMonthlyPrice = newItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const priceDifference = newMonthlyPrice - currentMonthlyPrice;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Aplicar Escalamiento</h2>
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

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Descripción:</p>
            <p className="text-gray-900">{scopeChange.description}</p>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Resumen de Cambios:</h3>
            <div className="space-y-2">
              {scopeChange.items.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          item.action === ScopeChangeAction.ADD
                            ? 'bg-green-100 text-green-800'
                            : item.action === ScopeChangeAction.MODIFY
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {getActionLabel(item.action)}
                      </span>
                      <p className="mt-1 font-medium text-gray-900">{item.serviceName}</p>
                      {item.quantity && item.unitPrice && (
                        <p className="text-sm text-gray-600">
                          {item.quantity} × ${item.unitPrice.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 mb-1">Precio Mensual Actual</p>
              <p className="text-lg font-semibold text-gray-900">
                ${currentMonthlyPrice.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-indigo-50 rounded">
              <p className="text-sm text-gray-600 mb-1">Precio Mensual Nuevo</p>
              <p className="text-lg font-semibold text-indigo-600">
                ${newMonthlyPrice.toLocaleString()}
              </p>
            </div>
          </div>

          {priceDifference !== 0 && (
            <div
              className={`mb-6 p-4 rounded ${
                priceDifference > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
              }`}
            >
              <p className="text-sm font-medium">
                Diferencia:{' '}
                <span className={priceDifference > 0 ? 'text-yellow-800' : 'text-green-800'}>
                  {priceDifference > 0 ? '+' : ''}${priceDifference.toLocaleString()}
                </span>
              </p>
            </div>
          )}

          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Importante:</strong> Este cambio se aplicará al contrato pero{' '}
              <strong>NO se facturará automáticamente</strong>. Deberás facturarlo manualmente o
              esperar al próximo ciclo de facturación.
            </p>
          </div>

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
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Aplicando...' : 'Confirmar y Aplicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
