import { get, post, patch, del } from '../request';
import type { ChatSession, ChatMessage, FeedbackData } from '../types';

export const chatApi = {
  listSessions: (kbId: string) =>
    get<ChatSession[]>(`/knowledge/${kbId}/sessions`),

  createSession: (kbId: string, title?: string) =>
    post<ChatSession>(`/knowledge/${kbId}/sessions`, { title }),

  renameSession: (kbId: string, sessionId: string, title: string) =>
    patch(`/knowledge/${kbId}/sessions/${sessionId}`, { title }),

  deleteSession: (kbId: string, sessionId: string) =>
    del(`/knowledge/${kbId}/sessions/${sessionId}`),

  getMessages: (kbId: string, sessionId: string) =>
    get<ChatMessage[]>(`/knowledge/${kbId}/sessions/${sessionId}/messages`),

  feedbackMessage: (kbId: string, sessionId: string, msgId: string, type: 'like' | 'dislike', comment?: string) =>
    post(`/knowledge/${kbId}/sessions/${sessionId}/messages/${msgId}/feedback`, { type, comment }),

  getFeedback: (kbId: string, sessionId: string, msgId: string) =>
    get<FeedbackData>(`/knowledge/${kbId}/sessions/${sessionId}/messages/${msgId}/feedback`),
};
