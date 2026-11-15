import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITrialRun extends Document {
  userId: Types.ObjectId | null;
  explorerName: string;
  avatar: string;
  dateUtc: string;
  seed: number;
  shareCode: string;
  difficulty: 'Novice' | 'Explorer' | 'Expert';
  isDaily: boolean;
  completionTimeSeconds: number;
  fragmentsCollected: number;
  pulsesUsed: number;
  score: number;
  createdAt: Date;
}

const TrialRunSchema = new Schema<ITrialRun>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    explorerName: {
      type: String,
      required: true,
      maxlength: 30,
    },
    avatar: {
      type: String,
      default: 'cyan-seeker',
    },
    dateUtc: {
      type: String,
      required: true,
      index: true,
    },
    seed: {
      type: Number,
      required: true,
      index: true,
    },
    shareCode: {
      type: String,
      required: true,
      maxlength: 48,
    },
    difficulty: {
      type: String,
      enum: ['Novice', 'Explorer', 'Expert'],
      required: true,
    },
    isDaily: {
      type: Boolean,
      default: false,
      index: true,
    },
    completionTimeSeconds: {
      type: Number,
      required: true,
      min: 8,
      max: 86400,
    },
    fragmentsCollected: {
      type: Number,
      default: 0,
      min: 0,
      max: 12,
    },
    pulsesUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

TrialRunSchema.index({ isDaily: 1, dateUtc: 1, score: -1, completionTimeSeconds: 1 });

export const TrialRun =
  mongoose.models.TrialRun || mongoose.model<ITrialRun>('TrialRun', TrialRunSchema);
