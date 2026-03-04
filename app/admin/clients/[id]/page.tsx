'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ContractItemsView from '@/components/clients/ContractItemsView';
import { ClientType, ClientStatus } from '@/types/client';
import { ContractStatus } from '@/types/contract';

interface Client {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  clientType: ClientType;
  status: ClientStatus;
}

interface Contract {
  _id: string;
  status: ContractStatus;
  startDate: string;
  endDate?: string;
  items: Array<{
    serviceId?: string;
    serviceName: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
  monthlyPrice: number;
  packageTemplateId?: { name: string };
  pdfUrl?: string;
  pdfPublicId?: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      const data = await res.json();
      setClient(data.client);
      setContracts(data.contracts || []);
    } catch (error) {
      console.error('Error fetching client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContractPDF = async (contractId: string) => {
    setGeneratingPDF(contractId);
    setPdfError(null);
    try {
      const res = await fetch('/api/exports/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contract', id: contractId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar PDF');
      }

      // Abrir PDF en nueva pestaña
      if (data.url) {
        window.open(data.url, '_blank');
      }

      // Recargar datos del cliente
      await fetchClientData();
    } catch (error: any) {
      setPdfError(error.message || 'Error al generar PDF');
      console.error('Error generating PDF:', error);
    } finally {
      setGeneratingPDF(null);
    }
  };

  const activeContract = contracts.find((c) => c.status === ContractStatus.ACTIVE);

  if (loading) {
    return (
      <div className="p-8">
        <p>Cargando cliente...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <p>Cliente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/clients')}
          className="text-indigo-600 hover:text-indigo-800 mb-4"
        >
          ← Volver a Clientes
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información del Cliente */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Información del Cliente
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Nombre:</span>
              <div className="text-gray-900">{client.name}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Email:</span>
              <div className="text-gray-900">{client.email || '-'}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Teléfono:</span>
              <div className="text-gray-900">{client.phone || '-'}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Tipo:</span>
              <div>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    client.clientType === ClientType.MONTHLY
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {client.clientType === ClientType.MONTHLY ? 'Mensual' : 'Proyecto'}
                </span>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Estado:</span>
              <div>
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    client.status === ClientStatus.ACTIVE
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {client.status === ClientStatus.ACTIVE ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contrato Activo */}
        {activeContract && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contrato Activo</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Estado:</span>
                <div>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Activo
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Fecha Inicio:</span>
                <div className="text-gray-900">
                  {new Date(activeContract.startDate).toLocaleDateString()}
                </div>
              </div>
              {activeContract.endDate && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Fecha Fin:</span>
                  <div className="text-gray-900">
                    {new Date(activeContract.endDate).toLocaleDateString()}
                  </div>
                </div>
              )}
              {activeContract.packageTemplateId && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Plantilla:</span>
                  <div className="text-gray-900">
                    {typeof activeContract.packageTemplateId === 'object'
                      ? activeContract.packageTemplateId.name
                      : '-'}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              {activeContract.pdfUrl ? (
                <a
                  href={activeContract.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium text-center"
                >
                  Ver PDF del Contrato
                </a>
              ) : (
                <button
                  onClick={() => handleGenerateContractPDF(activeContract._id)}
                  disabled={generatingPDF === activeContract._id}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingPDF === activeContract._id ? 'Generando PDF...' : 'Generar PDF del Contrato'}
                </button>
              )}
              {pdfError && generatingPDF === activeContract._id && (
                <p className="text-xs text-red-600 mt-1">{pdfError}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items del Contrato Activo */}
      {activeContract && (
        <div className="mt-6">
          <ContractItemsView
            items={activeContract.items}
            monthlyPrice={activeContract.monthlyPrice}
          />
        </div>
      )}

      {/* Historial de Contratos */}
      {contracts.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Historial de Contratos
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Inicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Precio Mensual
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(contract.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.endDate
                        ? new Date(contract.endDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          contract.status === ContractStatus.ACTIVE
                            ? 'bg-green-100 text-green-800'
                            : contract.status === ContractStatus.EXPIRED
                            ? 'bg-yellow-100 text-yellow-800'
                            : contract.status === ContractStatus.CANCELLED
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {contract.status === ContractStatus.ACTIVE
                          ? 'Activo'
                          : contract.status === ContractStatus.EXPIRED
                          ? 'Expirado'
                          : contract.status === ContractStatus.CANCELLED
                          ? 'Cancelado'
                          : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${contract.monthlyPrice.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
