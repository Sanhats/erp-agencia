import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { InvoiceStatus } from '@/types/invoice';

export { InvoiceStatus };

export interface IInvoiceItem {
  serviceId: Types.ObjectId;
  serviceName: string; // Snapshot
  quantity: number;
  unitPrice: number; // Snapshot
  notes?: string;
  scopeChangeId?: Types.ObjectId; // Para identificar items que provienen de escalamientos
  isExtra?: boolean; // Marca items como extras
}

export interface IInvoiceTotals {
  subtotal: number;
  tax?: number;
  total: number;
  paidAmount: number; // Se actualiza con $inc
}

export interface IInvoice extends Document {
  contractId: Types.ObjectId;
  clientId: Types.ObjectId;
  invoiceNumber?: string; // Único, para Sprint 4
  issueDate: Date;
  dueDate: Date;
  billingYear: number; // Año de facturación (2024, 2025, etc.)
  billingMonth: number; // Mes de facturación (1-12)
  status: InvoiceStatus;
  totals: IInvoiceTotals;
  items: IInvoiceItem[];
  notes?: string;
  pdfUrl?: string; // URL del PDF en Cloudinary
  pdfPublicId?: string; // Public ID del PDF en Cloudinary
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema: Schema = new Schema(
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
    scopeChangeId: {
      type: Schema.Types.ObjectId,
      ref: 'ScopeChange',
      required: false,
    },
    isExtra: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const InvoiceTotalsSchema: Schema = new Schema(
  {
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const InvoiceSchema: Schema = new Schema(
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
    invoiceNumber: {
      type: String,
      trim: true,
      // sparse y unique se definen en el índice explícito abajo
    },
    issueDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    billingYear: {
      type: Number,
      required: true,
      min: 2000,
      max: 9999,
    },
    billingMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
    },
    totals: {
      type: InvoiceTotalsSchema,
      required: true,
    },
    items: {
      type: [InvoiceItemSchema],
      required: true,
      validate: {
        validator: function (items: IInvoiceItem[]) {
          return items.length > 0;
        },
        message: 'La factura debe tener al menos un item',
      },
    },
    notes: {
      type: String,
      trim: true,
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
InvoiceSchema.pre('save', function (next) {
  if (this.dueDate && this.issueDate && this.dueDate < this.issueDate) {
    next(new Error('La fecha de vencimiento debe ser posterior a la fecha de emisión'));
  } else {
    next();
  }
});

// Índices para búsqueda frecuente
InvoiceSchema.index({ contractId: 1 });
InvoiceSchema.index({ clientId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });
// Índice único para prevenir facturas duplicadas por contrato/año/mes
InvoiceSchema.index({ contractId: 1, billingYear: 1, billingMonth: 1 }, { unique: true });

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default Invoice;
