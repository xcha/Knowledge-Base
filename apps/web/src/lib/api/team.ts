import { get, post, del } from '../request';
import type { Team } from '../types';

export const teamApi = {
  create: (name: string, description?: string) =>
    post<Team>('/teams', { name, description }),

  listMine: () =>
    get<Team[]>('/teams'),

  get: (id: string) =>
    get<Team>(`/teams/${id}`),

  invite: (id: string, email: string) =>
    post<{ userId: string; role: string }>(`/teams/${id}/members`, { email }),

  removeMember: (id: string, userId: string) =>
    del(`/teams/${id}/members/${userId}`),

  shareKb: (teamId: string, kbId: string) =>
    post(`/teams/${teamId}/knowledge-bases/${kbId}`),

  unshareKb: (teamId: string, kbId: string) =>
    del(`/teams/${teamId}/knowledge-bases/${kbId}`),
};
