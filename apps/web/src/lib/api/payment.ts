import { get, post } from '../request';
import type { PaymentOrder } from '../types';

export const paymentApi = {
  getPrices: () =>
    get<Record<string, Record<string, number>>>('/payment/prices'),

  getQuotas: () =>
    get<Record<string, { maxKnowledgeBases: number; maxDocuments: number }>>('/payment/quotas'),

  createOrder: (membership: string, durationMonths: number) =>
    post<{ orderId: string; outTradeNo: string; subject: string; totalAmount: string; payUrl?: string }>(
      '/payment/orders', { membership, durationMonths },
    ),

  handleCallback: (outTradeNo: string) =>
    post<{ success: boolean; membership: string; expiresAt: string }>(`/payment/callback/${outTradeNo}`),

  listOrders: () =>
    get<PaymentOrder[]>('/payment/orders'),
};
