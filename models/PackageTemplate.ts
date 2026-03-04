import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPackageTemplateItem {
  serviceId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface IPackageTemplate extends Document {
  name: string;
  description?: string;
  items: IPackageTemplateItem[];
  basePrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PackageTemplateItemSchema: Schema = new Schema(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
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

const PackageTemplateSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    items: {
      type: [PackageTemplateItemSchema],
      required: true,
      validate: {
        validator: function (items: IPackageTemplateItem[]) {
          return items.length > 0;
        },
        message: 'La plantilla debe tener al menos un item',
      },
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para búsqueda de plantillas activas
PackageTemplateSchema.index({ isActive: 1 });

const PackageTemplate: Model<IPackageTemplate> =
  mongoose.models.PackageTemplate ||
  mongoose.model<IPackageTemplate>('PackageTemplate', PackageTemplateSchema);

export default PackageTemplate;
