// ====== 用户相关 ======

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

// ====== 知识库 & 文档 ======

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  createdAt: string;
  _count: { documents: number };
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

export interface DocVersion {
  id: string;
  originalName: string;
  version: number;
  size: number;
  _count: { chunks: number };
  createdAt: string;
}

export interface GraphData {
  nodes: { id: string; name: string; symbolSize: number }[];
  links: { source: string; target: string; value: number }[];
}

// ====== 对话 ======

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

export interface FeedbackData {
  likes: number;
  dislikes: number;
  total: number;
  list: unknown[];
}

// ====== 团队 ======

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

// ====== 支付 ======

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

// ====== 统计 ======

export interface UserStatistics {
  trends: {
    knowledgeBases: { date: string; count: number }[];
    documents: { date: string; count: number }[];
    messages: { date: string; count: number }[];
  };
  summary: { totalKb: number; totalDocs: number; totalSessions: number; totalMessages: number };
  kbDistribution: { name: string; documents: number; sessions: number }[];
}
