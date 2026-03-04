'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientType } from '@/types/client';

interface Service {
  _id: string;
  name: string;
  basePrice: number;
}

interface PackageTemplate {
  _id: string;
  name: string;
  items: Array<{
    serviceId: { _id: string; name: string; basePrice: number };
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
}

interface ContractItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export default function ClientWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);

  // Paso 1: Datos del cliente
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    clientType: ClientType.MONTHLY as ClientType,
  });

  // Paso 2: Selección de plantilla
  const [useTemplate, setUseTemplate] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Paso 3: Configuración del contrato
  const [contractItems, setContractItems] = useState<ContractItem[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchServices();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (useTemplate && selectedTemplateId) {
      loadTemplateItems(selectedTemplateId);
    } else if (!useTemplate) {
      setContractItems([]);
    }
  }, [useTemplate, selectedTemplateId]);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/package-templates');
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const loadTemplateItems = (templateId: string) => {
    const template = templates.find((t) => t._id === templateId);
    if (template) {
      const items: ContractItem[] = template.items.map((item) => ({
        serviceId:
          typeof item.serviceId === 'object' ? item.serviceId._id : item.serviceId,
        serviceName:
          typeof item.serviceId === 'object' ? item.serviceId.name : 'Servicio',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes,
      }));
      setContractItems(items);
    }
  };

  const addManualItem = () => {
    setContractItems([
      ...contractItems,
      { serviceId: '', serviceName: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const updateItem = (index: number, field: keyof ContractItem, value: any) => {
    const newItems = [...contractItems];
    if (field === 'serviceId') {
      const service = services.find((s) => s._id === value);
      if (service) {
        newItems[index] = {
          ...newItems[index],
          serviceId: value,
          serviceName: service.name,
          unitPrice: service.basePrice,
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setContractItems(newItems);
  };

  const removeItem = (index: number) => {
    setContractItems(contractItems.filter((_, i) => i !== index));
  };

  const calculateMonthlyPrice = () => {
    return contractItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!clientData.name || !clientData.clientType) {
        alert('Nombre y tipo de cliente son requeridos');
        return;
      }
      if (clientData.clientType === ClientType.MONTHLY) {
        setStep(2);
      } else {
        // Para proyectos, no requiere contrato
        handleSubmit();
      }
    } else if (step === 2) {
      if (useTemplate && !selectedTemplateId) {
        alert('Selecciona una plantilla o crea el contrato manualmente');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (contractItems.length === 0) {
        alert('El contrato debe tener al menos un item');
        return;
      }
      if (!startDate) {
        alert('La fecha de inicio es requerida');
        return;
      }
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    if (clientData.clientType === ClientType.MONTHLY && contractItems.length === 0) {
      alert('Los clientes mensuales requieren un contrato');
      return;
    }

    setLoading(true);
    try {
      // Crear cliente
      const clientRes = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });

      if (!clientRes.ok) {
        const error = await clientRes.json();
        throw new Error(error.error || 'Error al crear cliente');
      }

      const client = await clientRes.json();

      // Si es mensual, crear contrato
      if (clientData.clientType === ClientType.MONTHLY && contractItems.length > 0) {
        const contractRes = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: client._id,
            packageTemplateId: useTemplate ? selectedTemplateId : undefined,
            status: 'active',
            startDate,
            items: contractItems,
          }),
        });

        if (!contractRes.ok) {
          const error = await contractRes.json();
          throw new Error(error.error || 'Error al crear contrato');
        }
      }

      router.push(`/admin/clients/${client._id}`);
    } catch (error: any) {
      console.error('Error creating client:', error);
      alert(error.message || 'Error al crear cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Cliente</h1>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step >= s
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Datos Cliente</span>
            <span>Plantilla</span>
            <span>Contrato</span>
            <span>Confirmación</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Datos del Cliente</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={clientData.name}
                  onChange={(e) =>
                    setClientData({ ...clientData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={clientData.email}
                  onChange={(e) =>
                    setClientData({ ...clientData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={clientData.phone}
                  onChange={(e) =>
                    setClientData({ ...clientData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cliente *
                </label>
                <select
                  value={clientData.clientType}
                  onChange={(e) =>
                    setClientData({
                      ...clientData,
                      clientType: e.target.value as ClientType,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={ClientType.MONTHLY}>Mensual</option>
                  <option value={ClientType.PROJECT}>Proyecto</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">
                Seleccionar Plantilla o Crear Manual
              </h2>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={useTemplate}
                    onChange={() => setUseTemplate(true)}
                  />
                  <span>Usar plantilla existente</span>
                </label>
              </div>
              {useTemplate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plantilla
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Seleccionar...</option>
                    {templates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={!useTemplate}
                    onChange={() => setUseTemplate(false)}
                  />
                  <span>Crear contrato manualmente</span>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Configurar Contrato</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Items del Contrato *
                  </label>
                  <button
                    type="button"
                    onClick={addManualItem}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Agregar Item
                  </button>
                </div>
                {contractItems.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4 mb-3">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Servicio
                        </label>
                        <select
                          value={item.serviceId}
                          onChange={(e) => updateItem(index, 'serviceId', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          required
                        >
                          <option value="">Seleccionar...</option>
                          {services.map((service) => (
                            <option key={service._id} value={service._id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Precio Unitario
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {contractItems.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-900">
                      Precio Mensual Total: ${calculateMonthlyPrice().toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Confirmación</h2>
              <div className="bg-gray-50 rounded-md p-4 space-y-2">
                <div>
                  <strong>Cliente:</strong> {clientData.name}
                </div>
                <div>
                  <strong>Email:</strong> {clientData.email || '-'}
                </div>
                <div>
                  <strong>Tipo:</strong>{' '}
                  {clientData.clientType === ClientType.MONTHLY ? 'Mensual' : 'Proyecto'}
                </div>
                {clientData.clientType === ClientType.MONTHLY && (
                  <>
                    <div>
                      <strong>Fecha Inicio:</strong> {startDate}
                    </div>
                    <div>
                      <strong>Items:</strong> {contractItems.length}
                    </div>
                    <div>
                      <strong>Precio Mensual:</strong> ${calculateMonthlyPrice().toLocaleString()}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else router.push('/admin/clients');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Cliente'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
