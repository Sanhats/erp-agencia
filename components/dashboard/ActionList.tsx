'use client';

import Link from 'next/link';

interface ActionItem {
  type: 'overdue_invoice' | 'due_today_invoice' | 'unscoped_change' | 'renewal';
  priority: number;
  title: string;
  description: string;
  date: string | Date;
  link: string;
  data: any;
}

interface ActionListProps {
  actions: ActionItem[];
  maxItems?: number;
}

export default function ActionList({ actions, maxItems = 10 }: ActionListProps) {
  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'border-red-500 bg-red-50';
    if (priority === 2) return 'border-orange-500 bg-orange-50';
    if (priority === 3) return 'border-yellow-500 bg-yellow-50';
    if (priority === 4) return 'border-blue-500 bg-blue-50';
    return 'border-gray-500 bg-gray-50';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority === 1) return 'Crítico';
    if (priority === 2) return 'Alto';
    if (priority === 3) return 'Medio';
    if (priority === 4) return 'Bajo';
    return 'Info';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'overdue_invoice':
        return 'Factura Vencida';
      case 'due_today_invoice':
        return 'Vence Hoy';
      case 'unscoped_change':
        return 'Escalamiento';
      case 'renewal':
        return 'Renovación';
      default:
        return type;
    }
  };

  const displayedActions = maxItems ? actions.slice(0, maxItems) : actions;

  if (actions.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-center text-gray-500">No hay acciones pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayedActions.map((action, index) => (
        <Link key={index} href={action.link}>
          <div
            className={`rounded-lg border-l-4 p-4 shadow transition-all hover:shadow-md ${getPriorityColor(
              action.priority
            )}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase opacity-75">
                    {getTypeLabel(action.type)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      action.priority === 1
                        ? 'bg-red-200 text-red-800'
                        : action.priority === 2
                        ? 'bg-orange-200 text-orange-800'
                        : action.priority === 3
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    {getPriorityLabel(action.priority)}
                  </span>
                </div>
                <h4 className="mt-2 font-semibold text-gray-900">{action.title}</h4>
                <p className="mt-1 text-sm text-gray-600">{action.description}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(action.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}
      {actions.length > maxItems && (
        <div className="text-center text-sm text-gray-500">
          Mostrando {maxItems} de {actions.length} acciones
        </div>
      )}
    </div>
  );
}
