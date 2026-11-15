import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGhost extends Document {
  userId: Types.ObjectId;
  username: string;
  levelNumber: number;
  timeSeconds: number;
  frameCount: number;
  data: string;
  updatedAt: Date;
}

const GhostSchema = new Schema<IGhost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      maxlength: 30,
    },
    levelNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    timeSeconds: {
      type: Number,
      required: true,
      min: 6,
      max: 86400,
    },
    frameCount: {
      type: Number,
      required: true,
      min: 30,
      max: 2800,
    },
    data: {
      type: String,
      required: true,
      maxlength: 40960,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

GhostSchema.index({ userId: 1, levelNumber: 1 }, { unique: true });
GhostSchema.index({ levelNumber: 1, timeSeconds: 1 });

export const Ghost =
  mongoose.models.Ghost || mongoose.model<IGhost>('Ghost', GhostSchema);
