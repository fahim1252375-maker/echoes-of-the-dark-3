import mongoose, { Document, Schema, Types } from 'mongoose';

export const ACHIEVEMENT_IDS = [
  'FIRST_ECHO',
  'EXPLORER',
  'CRYSTAL_SEEKER',
  'TEMPLE_MASTER',
  'BEYOND_THE_DARK',
  'RESONANCE_MASTER',
  'GHOST_STEP',
  'SPEED_DEMON',
  'COMPLETIONIST',
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface IAchievement extends Document {
  userId: Types.ObjectId;
  achievementId: AchievementId;
  unlockedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  achievementId: {
    type: String,
    enum: ACHIEVEMENT_IDS,
    required: true,
  },
  unlockedAt: {
    type: Date,
    default: Date.now,
  },
});

AchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

export const Achievement =
  mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema);
