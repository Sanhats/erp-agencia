import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import crypto from 'crypto';

export interface IPasswordResetToken extends Document {
  userId: Types.ObjectId;
  token: string; // Token único
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const PasswordResetTokenSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hora por defecto
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Índices
PasswordResetTokenSchema.index({ token: 1 }, { unique: true });
PasswordResetTokenSchema.index({ userId: 1, used: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Método estático para generar token
PasswordResetTokenSchema.statics.generateToken = function (): string {
  return crypto.randomBytes(32).toString('hex');
};

const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);

export default PasswordResetToken;
