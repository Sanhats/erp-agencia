import { notFound } from 'next/navigation';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import mongoose from 'mongoose';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

async function getInvoiceData(id: string) {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const invoice = await Invoice.findById(id)
    .populate('clientId', 'name email phone clientType')
    .populate('contractId', 'name monthlyPrice');

  if (!invoice) {
    return null;
  }

  const payments = await Payment.find({ invoiceId: id }).sort({ paymentDate: -1 });

  return { invoice, payments };
}

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getInvoiceData(id);

  if (!data) {
    notFound();
  }

  const { invoice, payments } = data;
  const client = invoice.clientId as any;
  const contract = invoice.contractId as any;
  const pendingAmount = invoice.totals.total - invoice.totals.paidAmount;

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">

      {/* Header */}
      <div className="mb-8 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">FACTURA</h1>
        <div className="mt-2 text-sm text-gray-600">
          <p>Número: {invoice.invoiceNumber || 'Pendiente'}</p>
          <p>Fecha de Emisión: {format(new Date(invoice.issueDate), 'dd/MM/yyyy', { locale: es })}</p>
          <p>Fecha de Vencimiento: {format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: es })}</p>
        </div>
      </div>

      {/* Información del Cliente */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Cliente</h2>
        <div className="bg-gray-50 p-4 rounded">
          <p className="font-medium">{client?.name || 'N/A'}</p>
          {client?.email && <p className="text-sm text-gray-600">Email: {client.email}</p>}
          {client?.phone && <p className="text-sm text-gray-600">Teléfono: {client.phone}</p>}
          {client?.clientType && (
            <p className="text-sm text-gray-600">
              Tipo: {client.clientType === 'monthly' ? 'Mensual' : 'Proyecto'}
            </p>
          )}
        </div>
      </div>

      {/* Información del Contrato */}
      {contract && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Contrato</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p className="font-medium">{contract.name || 'Contrato sin nombre'}</p>
            <p className="text-sm text-gray-600">Precio Mensual: ${contract.monthlyPrice?.toLocaleString() || '0'}</p>
          </div>
        </div>
      )}

      {/* Items de la Factura */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Items</h2>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Servicio</th>
              <th className="border border-gray-300 px-4 py-2 text-right">Cantidad</th>
              <th className="border border-gray-300 px-4 py-2 text-right">Precio Unitario</th>
              <th className="border border-gray-300 px-4 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className={item.isExtra ? 'bg-yellow-50' : ''}>
                <td className="border border-gray-300 px-4 py-2">
                  {item.serviceName}
                  {item.isExtra && <span className="ml-2 text-xs text-yellow-700">(Extra)</span>}
                  {item.notes && <p className="text-xs text-gray-500 mt-1">{item.notes}</p>}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right">{item.quantity}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  ${item.unitPrice.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right font-medium">
                  ${(item.quantity * item.unitPrice).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totales */}
      <div className="mb-8 flex justify-end">
        <div className="w-full max-w-md">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="px-4 py-2 text-right border-b border-gray-300">Subtotal:</td>
                <td className="px-4 py-2 text-right border-b border-gray-300 font-medium">
                  ${invoice.totals.subtotal.toLocaleString()}
                </td>
              </tr>
              {invoice.totals.tax && invoice.totals.tax > 0 && (
                <tr>
                  <td className="px-4 py-2 text-right border-b border-gray-300">Impuestos:</td>
                  <td className="px-4 py-2 text-right border-b border-gray-300 font-medium">
                    ${invoice.totals.tax.toLocaleString()}
                  </td>
                </tr>
              )}
              <tr>
                <td className="px-4 py-2 text-right font-bold text-lg">Total:</td>
                <td className="px-4 py-2 text-right font-bold text-lg">
                  ${invoice.totals.total.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-right text-gray-600">Pagado:</td>
                <td className="px-4 py-2 text-right text-gray-600">
                  ${invoice.totals.paidAmount.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-right font-semibold">Pendiente:</td>
                <td className="px-4 py-2 text-right font-semibold">
                  ${pendingAmount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagos Registrados */}
      {payments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Pagos</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Fecha</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Método</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Monto</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id.toString()}>
                  <td className="border border-gray-300 px-4 py-2">
                    {format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {payment.paymentMethod === 'cash' && 'Efectivo'}
                    {payment.paymentMethod === 'transfer' && 'Transferencia'}
                    {payment.paymentMethod === 'check' && 'Cheque'}
                    {payment.paymentMethod === 'other' && 'Otro'}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right font-medium">
                    ${payment.amount.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                    {payment.reference || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notas */}
      {invoice.notes && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notas</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>Estado: {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'pending' ? 'Pendiente' : invoice.status === 'overdue' ? 'Vencida' : invoice.status === 'draft' ? 'Borrador' : invoice.status}</p>
        <p className="mt-2">Generado el {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
      </div>
    </div>
  );
}
