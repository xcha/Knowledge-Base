import { get, post, put, del } from "../request";

export interface AdminDashboard {
  users: {
    total: number;
    today: number;
    thisMonth: number;
  };
  orders: {
    total: number;
    thisMonth: number;
    totalRevenue: string;
  };
  content: {
    knowledgeBases: number;
    documents: number;
    messages: number;
  };
  membership: Array<{
    level: string;
    count: number;
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  membership: string;
  membershipExpiresAt: string | null;
  maxKnowledgeBases: number;
  maxDocuments: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    knowledgeBases: number;
    teamMembers: number;
  };
}

export interface AdminOrder {
  id: string;
  userId: string;
  outTradeNo: string;
  subject: string;
  totalAmount: string;
  status: string;
  membership: string;
  durationMonths: number;
  paidAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const adminApi = {
  // 数据统计
  getDashboard: () => get<AdminDashboard>("/admin/dashboard"),

  // 用户管理
  getUsers: (page = 1, pageSize = 20, search?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search) params.set("search", search);
    return get<{ users: AdminUser[]; pagination: Pagination }>(
      `/admin/users?${params}`,
    );
  },

  getUserDetail: (id: string) =>
    get<AdminUser & { orders: any[]; tokenUsage: any }>(`/admin/users/${id}`),

  updateUser: (
    id: string,
    data: {
      name?: string;
      role?: string;
      membership?: string;
      membershipExpiresAt?: string;
      maxKnowledgeBases?: number;
      maxDocuments?: number;
    },
  ) => put<AdminUser>(`/admin/users/${id}`, data),

  deleteUser: (id: string) => del<{ success: boolean }>(`/admin/users/${id}`),

  resetPassword: (id: string, password: string) =>
    post<{ success: boolean }>(`/admin/users/${id}/reset-password`, {
      password,
    }),

  // 订单管理
  getOrders: (page = 1, pageSize = 20, status?: string, search?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    return get<{ orders: AdminOrder[]; pagination: Pagination }>(
      `/admin/orders?${params}`,
    );
  },

  manualPayOrder: (id: string) =>
    post<{ success: boolean }>(`/admin/orders/${id}/manual-pay`),

  closeOrder: (id: string) =>
    post<{ success: boolean }>(`/admin/orders/${id}/close`),

  // 系统设置
  getConfigs: () => get<Record<string, string>>("/admin/configs"),

  setConfig: (key: string, value: string) =>
    put(`/admin/configs/${key}`, { value }),

  deleteConfig: (key: string) => del(`/admin/configs/${key}`),
};
