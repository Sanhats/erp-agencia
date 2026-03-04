'use client';

import { ScopeChangeStatus, ScopeChangeAction } from '@/types/scope-change';
import Link from 'next/link';

interface ScopeChangeItem {
  action: ScopeChangeAction;
  serviceName: string;
  quantity?: number;
  unitPrice?: number;
}

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
  items: ScopeChangeItem[];
  invoiced: boolean;
}

interface ScopeChangeCardProps {
  scopeChange: ScopeChange;
  onApprove?: () => void;
  onReject?: () => void;
  onApply?: () => void;
}

export default function ScopeChangeCard({
  scopeChange,
  onApprove,
  onReject,
  onApply,
}: ScopeChangeCardProps) {
  const getStatusColor = (status: ScopeChangeStatus) => {
    switch (status) {
      case ScopeChangeStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case ScopeChangeStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case ScopeChangeStatus.APPLIED:
        return scopeChange.invoiced
          ? 'bg-green-100 text-green-800'
          : 'bg-purple-100 text-purple-800';
      case ScopeChangeStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case ScopeChangeStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ScopeChangeStatus) => {
    switch (status) {
      case ScopeChangeStatus.PENDING:
        return 'Pendiente';
      case ScopeChangeStatus.APPROVED:
        return 'Aprobado';
      case ScopeChangeStatus.APPLIED:
        return scopeChange.invoiced ? 'Aplicado y Facturado' : 'Aplicado';
      case ScopeChangeStatus.REJECTED:
        return 'Rechazado';
      case ScopeChangeStatus.CANCELLED:
        return 'Cancelado';
      default:
        return status;
    }
  };

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

  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            <Link
              href={`/admin/clients/${scopeChange.clientId._id}`}
              className="text-indigo-600 hover:text-indigo-800"
            >
              {scopeChange.clientId.name}
            </Link>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Fecha: {new Date(scopeChange.requestedDate).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
            scopeChange.status
          )}`}
        >
          {getStatusLabel(scopeChange.status)}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-700">{scopeChange.description}</p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Cambios:</h4>
        <ul className="space-y-1">
          {scopeChange.items.map((item, index) => (
            <li key={index} className="text-sm text-gray-600">
              <span className="font-medium">{getActionLabel(item.action)}</span>:{' '}
              {item.serviceName}
              {item.quantity && item.unitPrice && (
                <span className="text-gray-500">
                  {' '}
                  ({item.quantity} × ${item.unitPrice.toLocaleString()})
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {scopeChange.appliedDate && (
        <div className="mb-4 text-sm text-gray-600">
          <p>
            Aplicado: {new Date(scopeChange.appliedDate).toLocaleDateString()}
          </p>
          {scopeChange.invoiced && (
            <p className="text-green-600 font-medium">✓ Facturado</p>
          )}
        </div>
      )}

      {/* Acciones según estado */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        {scopeChange.status === ScopeChangeStatus.PENDING && (
          <>
            {onApprove && (
              <button
                onClick={onApprove}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Aprobar
              </button>
            )}
            {onReject && (
              <button
                onClick={onReject}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Rechazar
              </button>
            )}
          </>
        )}
        {scopeChange.status === ScopeChangeStatus.APPROVED && onApply && (
          <button
            onClick={onApply}
            className="w-full px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Aplicar al Contrato
          </button>
        )}
      </div>
    </div>
  );
}
