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
  createdAt: string;
  _count: { documents: number };
}

export interface Document {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
  _count: { chunks: number };
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
  listDocuments: (kbId: string) =>
    api.get<Document[]>(`/knowledge/${kbId}/documents`),
  uploadDocument: (kbId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ documentId: string; chunkCount: number }>(
      `/knowledge/${kbId}/documents`,
      form,
    );
  },
  deleteDocument: (kbId: string, docId: string) =>
    api.delete(`/knowledge/${kbId}/documents/${docId}`),
};

// --- Chat ---
export const chatApi = {
  listSessions: (kbId: string) =>
    api.get<ChatSession[]>(`/knowledge/${kbId}/sessions`),
  createSession: (kbId: string, title?: string) =>
    api.post<ChatSession>(`/knowledge/${kbId}/sessions`, { title }),
  deleteSession: (kbId: string, sessionId: string) =>
    api.delete(`/knowledge/${kbId}/sessions/${sessionId}`),
  getMessages: (kbId: string, sessionId: string) =>
    api.get<ChatMessage[]>(`/knowledge/${kbId}/sessions/${sessionId}/messages`),
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
