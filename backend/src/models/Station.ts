import { Schema, model, Document, Types } from 'mongoose';

export interface IStation extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string; // e.g. "MAIT", "DAK"
  location: string; // descriptive, labeled as simulated
  coordinates: { lat: number; lon: number }; // simulated
  status: 'active' | 'inactive' | 'winter-over';
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const stationSchema = new Schema<IStation>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    location: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'winter-over'],
      default: 'active',
    },
    timezone: { type: String, default: 'UTC' },
  },
  { timestamps: true }
);

stationSchema.index({ code: 1 });

export const Station = model<IStation>('Station', stationSchema);
