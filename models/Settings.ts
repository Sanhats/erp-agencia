import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  nextSequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema: Schema = new Schema(
  {
    nextSequence: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Singleton: solo un documento en la colección
SettingsSchema.index({}, { unique: true });

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
