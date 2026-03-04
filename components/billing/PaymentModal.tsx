'use client';

import { useState } from 'react';
import { PaymentMethod, InvoiceStatus } from '@/types/invoice';

interface Invoice {
  _id: string;
  invoiceNumber?: string;
  status: InvoiceStatus;
  totals: {
    total: number;
    paidAmount: number;
  };
  clientId: {
    name: string;
  };
}

interface PaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ invoice, onSuccess, onClose }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pendingAmount = invoice.totals.total - invoice.totals.paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const amountNum = parseFloat(amount);

    // Validaciones cliente
    if (amountNum <= 0) {
      setError('El monto debe ser mayor a 0');
      setLoading(false);
      return;
    }

    if (amountNum > pendingAmount) {
      setError(`El monto excede el pendiente ($${pendingAmount.toLocaleString()})`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice._id,
          amount: amountNum,
          paymentDate,
          paymentMethod,
          reference: reference || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar pago');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Registrar Pago</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">Cliente</p>
            <p className="font-medium text-gray-900">{invoice.clientId.name}</p>
            <p className="text-sm text-gray-600 mt-2">Factura</p>
            <p className="font-medium text-gray-900">
              {invoice.invoiceNumber || `#${invoice._id.slice(-6)}`}
            </p>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">${invoice.totals.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pagado:</span>
              <span className="font-medium">${invoice.totals.paidAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-900">Pendiente:</span>
              <span className="text-indigo-600">${pendingAmount.toLocaleString()}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={pendingAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Máximo: ${pendingAmount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Pago <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={loading}
                >
                  <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                  <option value={PaymentMethod.CASH}>Efectivo</option>
                  <option value={PaymentMethod.CHECK}>Cheque</option>
                  <option value={PaymentMethod.OTHER}>Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referencia
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Número de transferencia, cheque, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
