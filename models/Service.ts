import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IService extends Document {
  name: string;
  description?: string;
  category?: string;
  basePrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema: Schema = new Schema(
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
    category: {
      type: String,
      trim: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para búsqueda por nombre
ServiceSchema.index({ name: 1 });
ServiceSchema.index({ category: 1 });

const Service: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);

export default Service;
