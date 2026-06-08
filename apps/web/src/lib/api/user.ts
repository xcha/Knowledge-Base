import { get } from '../request';
import type { UserProfile, UserStatistics } from '../types';

export const userApi = {
  getProfile: () =>
    get<UserProfile>('/user/profile'),

  getStatistics: () =>
    get<UserStatistics>('/user/statistics'),
};
