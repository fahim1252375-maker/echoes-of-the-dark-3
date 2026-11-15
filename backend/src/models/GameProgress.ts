import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICheckpoint {
  level: number;
  x: number;
  y: number;
  z: number;
}

export interface IGameProgress extends Document {
  userId: Types.ObjectId;
  currentLevel: number;
  completedLevels: number[];
  collectedFragments: string[];
  totalScore: number;
  totalPlaytime: number;
  bestCompletionTimes: Map<string, number>;
  checkpoint: ICheckpoint | null;
  pulsesEmitted: number;
  secretsDiscovered: number[];
  doorsOpenedCount: number;
  noAlertCompletedLevels: number[];
  hintsUsedTotal: number;
  updatedAt: Date;
}

const CheckpointSchema = new Schema<ICheckpoint>(
  {
    level: { type: Number, required: true, min: 1, max: 5 },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true },
  },
  { _id: false }
);

const GameProgressSchema = new Schema<IGameProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    currentLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    completedLevels: {
      type: [Number],
      default: [],
    },
    collectedFragments: {
      type: [String],
      default: [],
    },
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPlaytime: {
      type: Number,
      default: 0,
      min: 0,
    },
    bestCompletionTimes: {
      type: Map,
      of: Number,
      default: {},
    },
    checkpoint: {
      type: CheckpointSchema,
      default: null,
    },
    pulsesEmitted: {
      type: Number,
      default: 0,
      min: 0,
    },
    secretsDiscovered: {
      type: [Number],
      default: [],
    },
    doorsOpenedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    noAlertCompletedLevels: {
      type: [Number],
      default: [],
    },
    hintsUsedTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

export const GameProgress =
  mongoose.models.GameProgress || mongoose.model<IGameProgress>('GameProgress', GameProgressSchema);
