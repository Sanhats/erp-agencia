import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ScopeChangeStatus, ScopeChangeAction } from '@/types/scope-change';

export { ScopeChangeStatus, ScopeChangeAction };

export interface IScopeChangeItem {
  action: ScopeChangeAction;
  serviceId: Types.ObjectId;
  serviceName: string; // Snapshot
  quantity?: number; // Para add/modify
  unitPrice?: number; // Para add/modify
  notes?: string;
  // Para modify/remove: referencia al item original
  originalItemIndex?: number; // Índice en contract.items
}

export interface IScopeChange extends Document {
  contractId: Types.ObjectId;
  clientId: Types.ObjectId;
  status: ScopeChangeStatus;
  requestedDate: Date;
  approvedDate?: Date;
  appliedDate?: Date;
  rejectedDate?: Date;
  requestedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  appliedBy?: Types.ObjectId;
  rejectedBy?: Types.ObjectId;
  items: IScopeChangeItem[];
  description: string;
  notes?: string;
  invoiced: boolean;
  invoiceId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ScopeChangeItemSchema: Schema = new Schema(
  {
    action: {
      type: String,
      enum: Object.values(ScopeChangeAction),
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      min: 1,
    },
    unitPrice: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    originalItemIndex: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const ScopeChangeSchema: Schema = new Schema(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ScopeChangeStatus),
      default: ScopeChangeStatus.PENDING,
    },
    requestedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    approvedDate: {
      type: Date,
    },
    appliedDate: {
      type: Date,
    },
    rejectedDate: {
      type: Date,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    appliedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    items: {
      type: [ScopeChangeItemSchema],
      required: true,
      validate: {
        validator: function (items: IScopeChangeItem[]) {
          return items.length > 0;
        },
        message: 'El escalamiento debe tener al menos un cambio',
      },
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    invoiced: {
      type: Boolean,
      default: false,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
  },
  {
    timestamps: true,
  }
);

// Validaciones según acción
ScopeChangeSchema.pre('save', function (next) {
  const items = this.get('items');
  
  if (!items || !Array.isArray(items)) {
    return next();
  }

  for (const item of items as IScopeChangeItem[]) {
    if (item.action === ScopeChangeAction.ADD || item.action === ScopeChangeAction.MODIFY) {
      if (!item.quantity || item.quantity <= 0) {
        return next(new Error('Items con acción add/modify deben tener quantity > 0'));
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        return next(new Error('Items con acción add/modify deben tener unitPrice >= 0'));
      }
    }
  }
  next();
});

// Índices para búsqueda frecuente
ScopeChangeSchema.index({ contractId: 1 });
ScopeChangeSchema.index({ clientId: 1 });
ScopeChangeSchema.index({ status: 1 });
ScopeChangeSchema.index({ requestedDate: 1 });
ScopeChangeSchema.index({ invoiced: 1 });
ScopeChangeSchema.index({ contractId: 1, status: 1 }); // Para buscar escalamientos pendientes por contrato

const ScopeChange: Model<IScopeChange> =
  mongoose.models.ScopeChange ||
  mongoose.model<IScopeChange>('ScopeChange', ScopeChangeSchema);

export default ScopeChange;
