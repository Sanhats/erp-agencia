import { notFound } from 'next/navigation';
import connectDB from '@/lib/mongoose';
import Contract from '@/models/Contract';
import mongoose from 'mongoose';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

async function getContractData(id: string) {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const contract = await Contract.findById(id)
    .populate('clientId', 'name email phone clientType')
    .populate('packageTemplateId', 'name');

  if (!contract) {
    return null;
  }

  return contract;
}

export default async function PrintContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await getContractData(id);

  if (!contract) {
    notFound();
  }

  const client = contract.clientId as any;
  const packageTemplate = contract.packageTemplateId as any;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'draft':
        return 'Borrador';
      case 'expired':
        return 'Expirado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-white p-8 print:p-4">

      {/* Header */}
      <div className="mb-8 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">CONTRATO</h1>
        <div className="mt-2 text-sm text-gray-600">
          <p>ID: {contract._id.toString().slice(-8).toUpperCase()}</p>
          <p>Estado: {getStatusLabel(contract.status)}</p>
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
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Contrato</h2>
        <div className="bg-gray-50 p-4 rounded space-y-2">
          {packageTemplate && (
            <p className="text-sm">
              <span className="font-medium">Plantilla:</span> {packageTemplate.name}
            </p>
          )}
          <p className="text-sm">
            <span className="font-medium">Fecha de Inicio:</span>{' '}
            {format(new Date(contract.startDate), 'dd/MM/yyyy', { locale: es })}
          </p>
          {contract.endDate && (
            <p className="text-sm">
              <span className="font-medium">Fecha de Fin:</span>{' '}
              {format(new Date(contract.endDate), 'dd/MM/yyyy', { locale: es })}
            </p>
          )}
          <p className="text-sm">
            <span className="font-medium">Precio Mensual:</span> ${contract.monthlyPrice.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Items del Contrato */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Servicios Incluidos</h2>
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
            {contract.items.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">
                  {item.serviceName}
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
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right">
                Total Mensual:
              </td>
              <td className="border border-gray-300 px-4 py-2 text-right">
                ${contract.monthlyPrice.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Resumen */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Resumen</h2>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-700">
            Este contrato incluye {contract.items.length} servicio(s) con un precio mensual total de{' '}
            <span className="font-semibold">${contract.monthlyPrice.toLocaleString()}</span>.
          </p>
          {contract.endDate && (
            <p className="text-sm text-gray-700 mt-2">
              El contrato tiene vigencia desde el{' '}
              {format(new Date(contract.startDate), 'dd/MM/yyyy', { locale: es })} hasta el{' '}
              {format(new Date(contract.endDate), 'dd/MM/yyyy', { locale: es })}.
            </p>
          )}
          {!contract.endDate && (
            <p className="text-sm text-gray-700 mt-2">
              El contrato inició el {format(new Date(contract.startDate), 'dd/MM/yyyy', { locale: es })} y no tiene fecha de finalización definida.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>Estado: {getStatusLabel(contract.status)}</p>
        <p className="mt-2">Generado el {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
      </div>
    </div>
  );
}
