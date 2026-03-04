import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  APPROVE = 'approve',
  REJECT = 'reject',
  APPLY = 'apply',
  PAYMENT = 'payment',
  OTHER = 'other',
}

export interface IAuditLog extends Document {
  userId?: Types.ObjectId; // AdminUser (opcional para acciones del sistema)
  action: AuditAction;
  resourceType: string; // 'invoice', 'contract', 'client', etc.
  resourceId?: Types.ObjectId; // ID del recurso afectado
  description: string;
  metadata?: Record<string, any>; // Datos adicionales
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Solo createdAt
  }
);

// Índices para búsqueda frecuente
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 }); // Para búsquedas recientes

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
