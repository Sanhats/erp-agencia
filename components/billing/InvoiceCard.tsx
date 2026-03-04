'use client';

import { useState } from 'react';
import { InvoiceStatus } from '@/types/invoice';
import Link from 'next/link';

interface Invoice {
  _id: string;
  invoiceNumber?: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  totals: {
    subtotal: number;
    total: number;
    paidAmount: number;
  };
  clientId: {
    _id: string;
    name: string;
    email?: string;
  };
  contractId?: {
    _id: string;
    name?: string;
  };
  pdfUrl?: string;
  pdfPublicId?: string;
}

interface InvoiceCardProps {
  invoice: Invoice;
  onRegisterPayment?: () => void;
}

export default function InvoiceCard({ invoice, onRegisterPayment }: InvoiceCardProps) {
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pendingAmount = invoice.totals.total - invoice.totals.paidAmount;
  const isOverdue =
    invoice.status === InvoiceStatus.PENDING &&
    new Date(invoice.dueDate) < new Date() &&
    pendingAmount > 0;

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    setPdfError(null);
    try {
      const res = await fetch('/api/exports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', id: invoice._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar PDF');
      }

      // Abrir PDF en nueva pestaña
      if (data.url) {
        window.open(data.url, '_blank');
        // Recargar después de un breve delay para actualizar el estado
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      setPdfError(error.message || 'Error al generar PDF');
      console.error('Error generating PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'bg-green-100 text-green-800';
      case InvoiceStatus.PENDING:
        return isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
      case InvoiceStatus.OVERDUE:
        return 'bg-red-100 text-red-800';
      case InvoiceStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return 'Pagada';
      case InvoiceStatus.PENDING:
        return isOverdue ? 'Vencida' : 'Pendiente';
      case InvoiceStatus.OVERDUE:
        return 'Vencida';
      case InvoiceStatus.CANCELLED:
        return 'Cancelada';
      case InvoiceStatus.DRAFT:
        return 'Borrador';
      default:
        return status;
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 border-l-4 ${
        isOverdue ? 'border-red-500' : 'border-indigo-500'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {invoice.invoiceNumber || `Factura #${invoice._id.slice(-6)}`}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            <Link
              href={`/admin/clients/${invoice.clientId._id}`}
              className="text-indigo-600 hover:text-indigo-800"
            >
              {invoice.clientId.name}
            </Link>
          </p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
            invoice.status
          )}`}
        >
          {getStatusLabel(invoice.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-xs text-gray-500">Fecha Emisión</span>
          <p className="text-sm font-medium text-gray-900">
            {new Date(invoice.issueDate).toLocaleDateString()}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Fecha Vencimiento</span>
          <p
            className={`text-sm font-medium ${
              isOverdue ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {new Date(invoice.dueDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-lg font-semibold text-gray-900">
            ${invoice.totals.total.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Pagado</span>
          <span className="text-sm font-medium text-gray-700">
            ${invoice.totals.paidAmount.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">Pendiente</span>
          <span
            className={`text-lg font-bold ${
              pendingAmount > 0 ? 'text-indigo-600' : 'text-green-600'
            }`}
          >
            ${pendingAmount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
        {onRegisterPayment && pendingAmount > 0 && invoice.status !== InvoiceStatus.CANCELLED && (
          <button
            onClick={onRegisterPayment}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Registrar Pago
          </button>
        )}
        {invoice.pdfUrl ? (
          <a
            href={invoice.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium text-center"
          >
            Ver PDF
          </a>
        ) : (
          <button
            onClick={handleGeneratePDF}
            disabled={generatingPDF}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingPDF ? 'Generando PDF...' : 'Generar PDF'}
          </button>
        )}
        {pdfError && (
          <p className="text-xs text-red-600 mt-1">{pdfError}</p>
        )}
      </div>
    </div>
  );
}
