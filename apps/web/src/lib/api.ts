import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
});

// 每次请求自动带上 token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 时跳转登录页
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// --- 类型定义 ---
export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  phoneVerified?: boolean;
  membership?: string;
  membershipExpiresAt?: string;
  maxKnowledgeBases?: number;
  maxDocuments?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  phoneVerified: boolean;
  membership: string;
  membershipExpiresAt: string | null;
  maxKnowledgeBases: number;
  maxDocuments: number;
  createdAt: string;
  _count: { knowledgeBases: number };
  usedDocuments: number;
}

export interface PaymentOrder {
  id: string;
  outTradeNo: string;
  subject: string;
  totalAmount: string;
  status: string;
  membership: string;
  durationMonths: number;
  paidAt: string | null;
  createdAt: string;
}

export interface UserStatistics {
  trends: {
    knowledgeBases: { date: string; count: number }[];
    documents: { date: string; count: number }[];
    messages: { date: string; count: number }[];
  };
  summary: { totalKb: number; totalDocs: number; totalSessions: number; totalMessages: number };
  kbDistribution: { name: string; documents: number; sessions: number }[];
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  createdAt: string;
  _count: { documents: number };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  _count?: { members: number; knowledgeBases: number };
  members?: { user: { id: string; email: string; name: string | null }; role: string }[];
  knowledgeBases?: KnowledgeBase[];
  createdAt: string;
}

export interface DocVersion {
  id: string;
  originalName: string;
  version: number;
  size: number;
  _count: { chunks: number };
  createdAt: string;
}

export interface Document {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  tags: string;
  version: number;
  createdAt: string;
  _count: { chunks: number };
}

export interface GraphData {
  nodes: { id: string; name: string; symbolSize: number }[];
  links: { source: string; target: string; value: number }[];
}

export interface FeedbackData {
  likes: number;
  dislikes: number;
  total: number;
  list: unknown[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// --- Auth ---
export const authApi = {
  register: (email: string, password: string, name?: string) =>
    api.post<{ user: User; token: string }>('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/login', { email, password }),
  // 图片验证码：直接请求 SVG 图片，返回 blob URL
  getCaptchaUrl: () =>
    `${api.defaults.baseURL}/auth/captcha?t=${Date.now()}`,
  // 发送短信验证码
  sendSms: (phone: string, captchaId?: string, captchaAnswer?: string) =>
    api.post<{ success: boolean; code?: string; message?: string }>('/auth/send-sms', {
      phone, captchaId, captchaAnswer,
    }),
  // 手机号注册
  registerPhone: (phone: string, smsCode: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/register-phone', {
      phone, smsCode, password,
    }),
};

// --- Knowledge Base ---
export const knowledgeApi = {
  list: () => api.get<KnowledgeBase[]>('/knowledge'),
  create: (name: string, description?: string) =>
    api.post<KnowledgeBase>('/knowledge', { name, description }),
  delete: (id: string) => api.delete(`/knowledge/${id}`),

  listDocuments: (kbId: string, tag?: string) =>
    api.get<Document[]>(`/knowledge/${kbId}/documents${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`),

  uploadDocument: (kbId: string, file: File, tags?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (tags) form.append('tags', tags);
    return api.post<{ documentId: string; chunkCount: number }>(
      `/knowledge/${kbId}/documents`,
      form,
    );
  },

  deleteDocument: (kbId: string, docId: string) =>
    api.delete(`/knowledge/${kbId}/documents/${docId}`),

  getDocumentContent: (kbId: string, docId: string) =>
    api.get<{ id: string; originalName: string; content: string }>(
      `/knowledge/${kbId}/documents/${docId}/content`,
    ),

  getTags: (kbId: string) =>
    api.get<string[]>(`/knowledge/${kbId}/tags`),

  updateTags: (kbId: string, docId: string, tags: string) =>
    api.post(`/knowledge/${kbId}/documents/${docId}/tags`, { tags }),

  getVersions: (kbId: string, docId: string) =>
    api.get<DocVersion[]>(`/knowledge/${kbId}/documents/${docId}/versions`),

  getGraph: (kbId: string) =>
    api.get<GraphData>(`/knowledge/${kbId}/graph`),

  rename: (id: string, name: string) =>
    api.patch<KnowledgeBase>(`/knowledge/${id}`, { name }),

  updateKb: (id: string, data: { name?: string; description?: string }) =>
    api.patch<KnowledgeBase>(`/knowledge/${id}`, data),

  renameDocument: (kbId: string, docId: string, originalName: string) =>
    api.patch(`/knowledge/${kbId}/documents/${docId}`, { originalName }),

  updateContent: (kbId: string, docId: string, content: string) =>
    api.patch(`/knowledge/${kbId}/documents/${docId}/content`, { content }),
};

// --- Chat ---
export const chatApi = {
  listSessions: (kbId: string) =>
    api.get<ChatSession[]>(`/knowledge/${kbId}/sessions`),
  createSession: (kbId: string, title?: string) =>
    api.post<ChatSession>(`/knowledge/${kbId}/sessions`, { title }),
  renameSession: (kbId: string, sessionId: string, title: string) =>
    api.patch(`/knowledge/${kbId}/sessions/${sessionId}`, { title }),

  deleteSession: (kbId: string, sessionId: string) =>
    api.delete(`/knowledge/${kbId}/sessions/${sessionId}`),
  getMessages: (kbId: string, sessionId: string) =>
    api.get<ChatMessage[]>(`/knowledge/${kbId}/sessions/${sessionId}/messages`),

  feedbackMessage: (kbId: string, sessionId: string, msgId: string, type: 'like' | 'dislike', comment?: string) =>
    api.post(`/knowledge/${kbId}/sessions/${sessionId}/messages/${msgId}/feedback`, { type, comment }),

  getFeedback: (kbId: string, sessionId: string, msgId: string) =>
    api.get<FeedbackData>(`/knowledge/${kbId}/sessions/${sessionId}/messages/${msgId}/feedback`),
};

// --- Teams ---
export const teamApi = {
  create: (name: string, description?: string) =>
    api.post<Team>('/teams', { name, description }),

  listMine: () => api.get<Team[]>('/teams'),

  get: (id: string) => api.get<Team>(`/teams/${id}`),

  invite: (id: string, email: string) =>
    api.post<{ userId: string; role: string }>(`/teams/${id}/members`, { email }),

  removeMember: (id: string, userId: string) =>
    api.delete(`/teams/${id}/members/${userId}`),

  shareKb: (teamId: string, kbId: string) =>
    api.post(`/teams/${teamId}/knowledge-bases/${kbId}`),

  unshareKb: (teamId: string, kbId: string) =>
    api.delete(`/teams/${teamId}/knowledge-bases/${kbId}`),
};

// --- User ---
export const userApi = {
  getProfile: () => api.get<UserProfile>('/user/profile'),
  getStatistics: () => api.get<UserStatistics>('/user/statistics'),
};

// --- Payment ---
export const paymentApi = {
  getPrices: () =>
    api.get<{ basic: Record<string, number>; pro: Record<string, number> }>('/payment/prices'),
  getQuotas: () =>
    api.get<Record<string, { maxKnowledgeBases: number; maxDocuments: number }>>('/payment/quotas'),
  createOrder: (membership: string, durationMonths: number) =>
    api.post<{ orderId: string; outTradeNo: string; subject: string; totalAmount: string }>(
      '/payment/orders',
      { membership, durationMonths },
    ),
  handleCallback: (outTradeNo: string) =>
    api.post<{ success: boolean; membership: string; expiresAt: string }>(
      `/payment/callback/${outTradeNo}`,
    ),
  listOrders: () => api.get<PaymentOrder[]>('/payment/orders'),
};
