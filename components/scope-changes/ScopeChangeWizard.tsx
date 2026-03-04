'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScopeChangeAction } from '@/types/scope-change';

interface Service {
  _id: string;
  name: string;
  basePrice: number;
}

interface Contract {
  _id: string;
  clientId: {
    _id: string;
    name: string;
  };
  items: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
  monthlyPrice: number;
}

interface ScopeChangeItem {
  action: ScopeChangeAction;
  serviceId: string;
  serviceName: string;
  quantity?: number;
  unitPrice?: number;
  notes?: string;
  originalItemIndex?: number;
}

interface ScopeChangeWizardProps {
  contractId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ScopeChangeWizard({
  contractId: initialContractId,
  onSuccess,
  onCancel,
}: ScopeChangeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState(initialContractId || '');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [changes, setChanges] = useState<ScopeChangeItem[]>([]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Estados para formulario de agregar/modificar
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingChangeIndex, setEditingChangeIndex] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({
    action: ScopeChangeAction.ADD as ScopeChangeAction,
    serviceId: '',
    quantity: '',
    unitPrice: '',
    notes: '',
    originalItemIndex: undefined as number | undefined,
  });

  useEffect(() => {
    fetchServices();
    if (!initialContractId) {
      fetchContracts();
    }
  }, []);

  useEffect(() => {
    if (selectedContractId) {
      fetchContract(selectedContractId);
    }
  }, [selectedContractId]);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/contracts?status=active');
      const data = await res.json();
      setContracts(data.filter((c: any) => c.status === 'active'));
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchContract = async (id: string) => {
    try {
      const res = await fetch(`/api/contracts/${id}`);
      const data = await res.json();
      setSelectedContract(data);
    } catch (error) {
      console.error('Error fetching contract:', error);
    }
  };

  const handleAddChange = () => {
    setItemForm({
      action: ScopeChangeAction.ADD,
      serviceId: '',
      quantity: '',
      unitPrice: '',
      notes: '',
      originalItemIndex: undefined,
    });
    setEditingChangeIndex(null);
    setShowItemForm(true);
  };

  const handleModifyItem = (index: number) => {
    const contractItem = selectedContract!.items[index];
    setItemForm({
      action: ScopeChangeAction.MODIFY,
      serviceId: contractItem.serviceId,
      quantity: contractItem.quantity.toString(),
      unitPrice: contractItem.unitPrice.toString(),
      notes: contractItem.notes || '',
      originalItemIndex: index,
    });
    setEditingChangeIndex(null);
    setShowItemForm(true);
  };

  const handleRemoveItem = (index: number) => {
    const contractItem = selectedContract!.items[index];
    const newChange: ScopeChangeItem = {
      action: ScopeChangeAction.REMOVE,
      serviceId: contractItem.serviceId,
      serviceName: contractItem.serviceName,
      originalItemIndex: index,
    };
    setChanges([...changes, newChange]);
  };

  const handleSaveItemForm = () => {
    if (!itemForm.serviceId) {
      setError('Selecciona un servicio');
      return;
    }

    const service = services.find((s) => s._id === itemForm.serviceId);
    if (!service) {
      setError('Servicio no encontrado');
      return;
    }

    if (
      (itemForm.action === ScopeChangeAction.ADD ||
        itemForm.action === ScopeChangeAction.MODIFY) &&
      (!itemForm.quantity || parseFloat(itemForm.quantity) <= 0)
    ) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (
      (itemForm.action === ScopeChangeAction.ADD ||
        itemForm.action === ScopeChangeAction.MODIFY) &&
      (!itemForm.unitPrice || parseFloat(itemForm.unitPrice) < 0)
    ) {
      setError('El precio unitario debe ser >= 0');
      return;
    }

    if (
      (itemForm.action === ScopeChangeAction.MODIFY ||
        itemForm.action === ScopeChangeAction.REMOVE) &&
      itemForm.originalItemIndex === undefined
    ) {
      setError('Índice de item original requerido');
      return;
    }

    const newChange: ScopeChangeItem = {
      action: itemForm.action,
      serviceId: itemForm.serviceId,
      serviceName: service.name,
      quantity:
        itemForm.action !== ScopeChangeAction.REMOVE
          ? parseFloat(itemForm.quantity)
          : undefined,
      unitPrice:
        itemForm.action !== ScopeChangeAction.REMOVE
          ? parseFloat(itemForm.unitPrice)
          : undefined,
      notes: itemForm.notes || undefined,
      originalItemIndex: itemForm.originalItemIndex,
    };

    if (editingChangeIndex !== null) {
      // Editar cambio existente
      const newChanges = [...changes];
      newChanges[editingChangeIndex] = newChange;
      setChanges(newChanges);
    } else {
      // Agregar nuevo cambio
      setChanges([...changes, newChange]);
    }

    setShowItemForm(false);
    setItemForm({
      action: ScopeChangeAction.ADD,
      serviceId: '',
      quantity: '',
      unitPrice: '',
      notes: '',
      originalItemIndex: undefined,
    });
    setError('');
  };

  const handleRemoveChange = (index: number) => {
    setChanges(changes.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedContractId) {
      setError('Selecciona un contrato');
      return;
    }

    if (changes.length === 0) {
      setError('Debes agregar al menos un cambio');
      return;
    }

    if (!description.trim()) {
      setError('La descripción es requerida');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/scope-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: selectedContractId,
          items: changes,
          description: description.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear escalamiento');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/admin/scope-changes');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear escalamiento');
    } finally {
      setLoading(false);
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
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Escalar Servicio</h1>
        <p className="mt-2 text-gray-600">
          Crea un cambio de alcance para un contrato activo
        </p>
      </div>

      {/* Paso 1: Seleccionar Contrato */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Paso 1: Seleccionar Contrato
          </h2>
          {initialContractId ? (
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Contrato pre-seleccionado</p>
              {selectedContract && (
                <p className="font-medium text-gray-900 mt-1">
                  {selectedContract.clientId.name}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contrato
              </label>
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecciona un contrato</option>
                {contracts.map((contract) => (
                  <option key={contract._id} value={contract._id}>
                    {contract.clientId.name} - ${contract.monthlyPrice.toLocaleString()}/mes
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedContractId}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Paso 2: Agregar/Modificar/Eliminar Items */}
      {step === 2 && selectedContract && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Paso 2: Definir Cambios
          </h2>

          {/* Items actuales del contrato */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Items Actuales:</h3>
            <div className="space-y-2">
              {selectedContract.items.map((item, index) => {
                const hasChange = changes.some(
                  (c) => c.originalItemIndex === index
                );
                return (
                  <div
                    key={index}
                    className={`p-3 border rounded ${
                      hasChange ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{item.serviceName}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} × ${item.unitPrice.toLocaleString()} = $
                          {(item.quantity * item.unitPrice).toLocaleString()}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleModifyItem(index)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          disabled={hasChange}
                        >
                          Modificar
                        </button>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          disabled={hasChange}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botón agregar nuevo servicio */}
          <button
            onClick={handleAddChange}
            className="mb-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
          >
            + Agregar Nuevo Servicio
          </button>

          {/* Formulario de item */}
          {showItemForm && (
            <div className="mb-6 p-4 border border-indigo-300 rounded-lg bg-indigo-50">
              <h4 className="font-medium text-gray-900 mb-3">
                {itemForm.action === ScopeChangeAction.ADD
                  ? 'Agregar Servicio'
                  : 'Modificar Servicio'}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Servicio
                  </label>
                  <select
                    value={itemForm.serviceId}
                    onChange={(e) => setItemForm({ ...itemForm, serviceId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona un servicio</option>
                    {services.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.name} (${service.basePrice.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                {itemForm.action !== ScopeChangeAction.REMOVE && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={itemForm.quantity}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, quantity: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio Unitario
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemForm.unitPrice}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, unitPrice: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={itemForm.notes}
                    onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveItemForm}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setShowItemForm(false);
                      setError('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de cambios */}
          {changes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Cambios Definidos:</h3>
              <div className="space-y-2">
                {changes.map((change, index) => (
                  <div
                    key={index}
                    className="p-3 border border-indigo-300 rounded-lg bg-indigo-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            change.action === ScopeChangeAction.ADD
                              ? 'bg-green-100 text-green-800'
                              : change.action === ScopeChangeAction.MODIFY
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {getActionLabel(change.action)}
                        </span>
                        <p className="font-medium text-gray-900 mt-1">{change.serviceName}</p>
                        {change.quantity && change.unitPrice && (
                          <p className="text-sm text-gray-600">
                            {change.quantity} × ${change.unitPrice.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveChange(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={changes.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Revisar y Confirmar */}
      {step === 3 && selectedContract && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Paso 3: Revisar y Confirmar
          </h2>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Cliente:</h3>
            <p className="text-gray-900">{selectedContract.clientId.name}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Cambios:</h3>
            <ul className="space-y-2">
              {changes.map((change, index) => (
                <li key={index} className="text-sm text-gray-700">
                  <span className="font-medium">{getActionLabel(change.action)}</span>:{' '}
                  {change.serviceName}
                  {change.quantity && change.unitPrice && (
                    <span>
                      {' '}
                      ({change.quantity} × ${change.unitPrice.toLocaleString()})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Razón del cambio de alcance..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <div className="flex gap-2">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={loading || !description.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Escalamiento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
