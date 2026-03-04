import mongoose, { Schema, Document, Model } from 'mongoose';
import { ClientType, ClientStatus } from '@/types/client';

export { ClientType, ClientStatus };

export interface IClient extends Document {
  name: string;
  email?: string;
  phone?: string;
  clientType: ClientType;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    clientType: {
      type: String,
      enum: Object.values(ClientType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ClientStatus),
      default: ClientStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsqueda frecuente
ClientSchema.index({ email: 1 });
ClientSchema.index({ clientType: 1 });
ClientSchema.index({ status: 1 });

const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
