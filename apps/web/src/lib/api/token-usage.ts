import { get } from '../request';

export interface TokenUsageStats {
  total: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
    requests: number;
  };
  today: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  thisMonth: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  limit: {
    used: number;
    limit: number;
    membership: string;
  };
  byModel: {
    model: string;
    totalTokens: number;
    estimatedCost: number;
    requests: number;
  }[];
  daily: {
    date: string;
    totalTokens: number;
    estimatedCost: number;
  }[];
}

export const tokenUsageApi = {
  getStats: () =>
    get<TokenUsageStats>('/token-usage/stats'),
};
