import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ContractStatus } from '@/types/contract';

export { ContractStatus };

export interface IContractItem {
  serviceId: Types.ObjectId;
  serviceName: string; // Snapshot
  quantity: number;
  unitPrice: number; // Snapshot
  notes?: string;
}

export interface IContract extends Document {
  clientId: Types.ObjectId;
  packageTemplateId?: Types.ObjectId;
  status: ContractStatus;
  startDate: Date;
  endDate?: Date;
  items: IContractItem[];
  monthlyPrice: number;
  pdfUrl?: string; // URL del PDF en Cloudinary
  pdfPublicId?: string; // Public ID del PDF en Cloudinary
  createdAt: Date;
  updatedAt: Date;
}

const ContractItemSchema: Schema = new Schema(
  {
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
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const ContractSchema: Schema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    packageTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'PackageTemplate',
    },
    status: {
      type: String,
      enum: Object.values(ContractStatus),
      default: ContractStatus.DRAFT,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    items: {
      type: [ContractItemSchema],
      required: true,
      validate: {
        validator: function (items: IContractItem[]) {
          return items.length > 0;
        },
        message: 'El contrato debe tener al menos un item',
      },
    },
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    pdfUrl: {
      type: String,
      trim: true,
    },
    pdfPublicId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Validación de fechas
ContractSchema.pre('save', function (next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
  } else {
    next();
  }
});

// Índices para búsqueda frecuente
ContractSchema.index({ clientId: 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ startDate: 1 });
ContractSchema.index({ clientId: 1, status: 1 }); // Para buscar contratos activos por cliente

const Contract: Model<IContract> =
  mongoose.models.Contract || mongoose.model<IContract>('Contract', ContractSchema);

export default Contract;
