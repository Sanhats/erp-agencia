'use client';

import { useState, useEffect } from 'react';

interface Service {
  _id: string;
  name: string;
  basePrice: number;
}

interface PackageTemplateItem {
  serviceId: string | { _id: string; name: string; basePrice: number };
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface PackageTemplate {
  _id: string;
  name: string;
  description?: string;
  items: PackageTemplateItem[];
  basePrice: number;
  isActive: boolean;
}

export default function PackageTemplatesPage() {
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PackageTemplate | undefined>();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: [] as PackageTemplateItem[],
  });

  useEffect(() => {
    fetchTemplates();
    fetchServices();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/package-templates');
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(undefined);
    setFormData({ name: '', description: '', items: [] });
    setShowForm(true);
  };

  const handleEdit = (template: PackageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      items: template.items.map((item) => ({
        serviceId: typeof item.serviceId === 'object' ? item.serviceId._id : item.serviceId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes,
      })),
    });
    setShowForm(true);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { serviceId: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const updateItem = (index: number, field: keyof PackageTemplateItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Si cambia el servicio, actualizar precio base
    if (field === 'serviceId') {
      const service = services.find((s) => s._id === value);
      if (service) {
        newItems[index].unitPrice = service.basePrice;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const calculateBasePrice = () => {
    return formData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  };

  const handleSave = async () => {
    if (!formData.name || formData.items.length === 0) {
      alert('Nombre y al menos un item son requeridos');
      return;
    }

    try {
      const payload = {
        ...formData,
        basePrice: calculateBasePrice(),
      };

      if (editingTemplate) {
        await fetch(`/api/package-templates/${editingTemplate._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/package-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      setEditingTemplate(undefined);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar plantilla');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar esta plantilla?')) return;

    try {
      await fetch(`/api/package-templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error al desactivar plantilla');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Cargando plantillas...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plantillas de Paquetes</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          + Nueva Plantilla
        </button>
      </div>

      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Items *</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  + Agregar Item
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 mb-3">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Servicio
                      </label>
                      <select
                        value={typeof item.serviceId === 'object' ? item.serviceId._id : item.serviceId}
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
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notas
                    </label>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              ))}

              {formData.items.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm font-medium text-gray-900">
                    Precio Base Total: ${calculateBasePrice().toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTemplate(undefined);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                {editingTemplate ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No hay plantillas registradas
                  </td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template._id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-gray-500">{template.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {template.items.length} item(s)
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ${template.basePrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(template._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Desactivar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
