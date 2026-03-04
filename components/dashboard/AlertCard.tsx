'use client';

import Link from 'next/link';

interface AlertCardProps {
  type: 'overdue' | 'due_today' | 'unscoped' | 'renewal';
  title: string;
  description?: string;
  count: number;
  link: string;
  priority: number;
}

export default function AlertCard({
  type,
  title,
  description,
  count,
  link,
  priority,
}: AlertCardProps) {
  const getColorClasses = () => {
    switch (type) {
      case 'overdue':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'due_today':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'unscoped':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'renewal':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'overdue':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case 'due_today':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'unscoped':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case 'renewal':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (count === 0) {
    return null;
  }

  return (
    <Link href={link}>
      <div
        className={`rounded-lg border-l-4 p-6 shadow transition-all hover:shadow-md ${getColorClasses()}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">{getIcon()}</div>
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{count}</div>
            <div className="text-xs opacity-75">item{count !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
