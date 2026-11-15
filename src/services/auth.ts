import { AchievementItem, AvatarId, ProgressData, UserProfile } from '../game/types';
import { apiRequest, setStoredToken } from './api';

export interface AuthResponse {
  token: string;
  user: UserProfile;
  progress: ProgressData;
}

export async function registerAccount(payload: {
  username: string;
  email: string;
  password: string;
  avatar?: AvatarId;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    false
  );
  setStoredToken(res.token);
  return res;
}

export async function loginAccount(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    false
  );
  setStoredToken(res.token);
  return res;
}

export async function fetchSessionUser(): Promise<{ user: UserProfile; progress: ProgressData }> {
  return apiRequest<{ user: UserProfile; progress: ProgressData }>('/api/auth/me');
}

export async function fetchPlayerDashboard(): Promise<{
  user: UserProfile;
  progress: ProgressData;
  achievements: AchievementItem[];
}> {
  return apiRequest('/api/player/profile');
}

export async function fetchAllAchievements(): Promise<{ achievements: AchievementItem[] }> {
  return apiRequest('/api/achievements');
}

export async function updatePlayerProfile(payload: {
  username?: string;
  avatar?: AvatarId;
}): Promise<{ user: UserProfile }> {
  return apiRequest('/api/player/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function logoutAccount(): void {
  setStoredToken(null);
}
