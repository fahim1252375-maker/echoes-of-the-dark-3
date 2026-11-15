import mongoose, { Document, Schema } from 'mongoose';

export const VALID_AVATARS = ['cyan-seeker', 'violet-warden', 'amber-echo', 'crimson-scout'] as const;
export type AvatarId = (typeof VALID_AVATARS)[number];

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  avatar: AvatarId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    avatar: {
      type: String,
      enum: VALID_AVATARS,
      default: 'cyan-seeker',
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
