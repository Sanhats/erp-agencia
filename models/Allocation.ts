import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAllocation extends Document {
  userId: Types.ObjectId; // AdminUser
  contractId?: Types.ObjectId; // Contrato asignado (opcional)
  clientId?: Types.ObjectId; // Cliente asignado (opcional)
  percentage: number; // Porcentaje de tiempo asignado (0-100)
  year: number; // Año de la asignación
  month: number; // Mes de la asignación (1-12)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AllocationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 9999,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Validación: La suma de porcentajes para un usuario en un mes/año no debe exceder 100%
AllocationSchema.pre('save', async function (next) {
  // Acceder a las propiedades directamente sin cast
  const userId = this.get('userId');
  const year = this.get('year');
  const month = this.get('month');
  const percentage = this.get('percentage');
  const _id = this._id;

  if (!userId || !year || !month || percentage === undefined) {
    return next();
  }

  // Buscar todas las asignaciones del mismo usuario para el mismo mes/año
  const existingAllocations = await mongoose.model('Allocation').find({
    userId: userId,
    year: year,
    month: month,
    _id: { $ne: _id }, // Excluir la asignación actual si está siendo actualizada
  });

  // Calcular suma total
  const totalPercentage = existingAllocations.reduce(
    (sum: number, alloc: any) => sum + (alloc.percentage || 0),
    0
  ) + percentage;

  if (totalPercentage > 100) {
    return next(
      new Error(
        `La suma de asignaciones para este usuario en ${month}/${year} no puede exceder 100%. Actual: ${totalPercentage}%`
      )
    );
  }

  next();
});

// Índices para búsqueda frecuente
AllocationSchema.index({ userId: 1, year: 1, month: 1 });
AllocationSchema.index({ contractId: 1 });
AllocationSchema.index({ clientId: 1 });
AllocationSchema.index({ year: 1, month: 1 });

const Allocation: Model<IAllocation> =
  mongoose.models.Allocation || mongoose.model<IAllocation>('Allocation', AllocationSchema);

export default Allocation;
