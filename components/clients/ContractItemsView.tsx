'use client';

interface ContractItem {
  serviceId?: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface ContractItemsViewProps {
  items: ContractItem[];
  monthlyPrice: number;
}

export default function ContractItemsView({
  items,
  monthlyPrice,
}: ContractItemsViewProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Qué incluye</h3>
      <div className="space-y-3">
        {items.map((item, index) => {
          const subtotal = item.quantity * item.unitPrice;
          return (
            <div
              key={index}
              className="border border-gray-200 rounded-md p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.serviceName}</div>
                  {item.notes && (
                    <div className="text-sm text-gray-500 mt-1">{item.notes}</div>
                  )}
                  <div className="text-sm text-gray-600 mt-2">
                    Cantidad: {item.quantity} × ${item.unitPrice.toLocaleString()} = $
                    {subtotal.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    ${subtotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Total Mensual:</span>
          <span className="text-2xl font-bold text-indigo-600">
            ${monthlyPrice.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
