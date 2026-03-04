'use client';

import { useState, useEffect } from 'react';
import { InvoiceStatus } from '@/types/invoice';
import InvoiceCard from '@/components/billing/InvoiceCard';
import PaymentModal from '@/components/billing/PaymentModal';

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

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filters, setFilters] = useState({
    status: '' as string,
    overdue: false,
  });

  useEffect(() => {
    fetchInvoices();
  }, [filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.overdue) {
        params.append('overdue', 'true');
      }

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Error al obtener facturas');
      }
      const data = await res.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    fetchInvoices();
  };

  const pendingInvoices = invoices.filter(
    (inv) => inv.status === InvoiceStatus.PENDING || inv.status === InvoiceStatus.DRAFT
  );
  const overdueInvoices = pendingInvoices.filter(
    (inv) => new Date(inv.dueDate) < new Date() && inv.totals.total - inv.totals.paidAmount > 0
  );
  const paidInvoices = invoices.filter((inv) => inv.status === InvoiceStatus.PAID);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bandeja de Cobros</h1>
        <p className="mt-2 text-gray-600">
          Gestiona los pagos y facturas pendientes
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos</option>
              <option value={InvoiceStatus.PENDING}>Pendiente</option>
              <option value={InvoiceStatus.PAID}>Pagada</option>
              <option value={InvoiceStatus.OVERDUE}>Vencida</option>
              <option value={InvoiceStatus.DRAFT}>Borrador</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.overdue}
                onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Solo vencidas</span>
            </label>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pendientes</h3>
          <p className="text-3xl font-bold text-gray-900">{pendingInvoices.length}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-red-700 mb-2">Vencidas</h3>
          <p className="text-3xl font-bold text-red-600">{overdueInvoices.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-green-700 mb-2">Pagadas</h3>
          <p className="text-3xl font-bold text-green-600">{paidInvoices.length}</p>
        </div>
      </div>

      {/* Lista de Facturas */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando facturas...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">No hay facturas para mostrar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice._id}
              invoice={invoice}
              onRegisterPayment={() => setSelectedInvoice(invoice)}
            />
          ))}
        </div>
      )}

      {/* Modal de Pago */}
      {selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
