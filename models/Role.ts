import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: string[]; // Array de permisos (ej: ['read:clients', 'write:invoices'])
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
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

// Índices
RoleSchema.index({ name: 1 }, { unique: true });
RoleSchema.index({ isActive: 1 });

const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

export default Role;
