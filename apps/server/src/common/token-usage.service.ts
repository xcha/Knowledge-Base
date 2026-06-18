import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 模型定价（每 1K token，单位：美元）
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
  'claude-haiku-4-5-20251001': { input: 0.00025, output: 0.00125 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
};

@Injectable()
export class TokenUsageService {
  private readonly logger = new Logger(TokenUsageService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 记录一次 token 使用
   */
  async record(userId: string, model: string, inputTokens: number, outputTokens: number) {
    const totalTokens = inputTokens + outputTokens;
    const pricing = MODEL_PRICING[model] ?? { input: 0.003, output: 0.015 };
    const estimatedCost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;

    await this.prisma.tokenUsage.create({
      data: {
        userId,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
      },
    });
  }

  /**
   * 检查用户本月 token 是否超限
   * 返回 { allowed, used, limit }
   */
  async checkTokenLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { allowed: false, used: 0, limit: 0 };

    const membership = user.membership || 'free';
    const QUOTA: Record<string, number> = {
      free: 100_000,
      basic: 1_000_000,
      pro: 10_000_000,
    };
    const limit = QUOTA[membership] ?? QUOTA.free;

    // 查询本月用量
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const result = await this.prisma.tokenUsage.aggregate({
      where: { userId, createdAt: { gte: monthStart } },
      _sum: { totalTokens: true },
    });

    const used = result._sum.totalTokens ?? 0;
    return { allowed: used < limit, used, limit };
  }

  /**
   * 查询用户 token 用量统计
   */
  async getUserStats(userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 总用量
    const total = await this.prisma.tokenUsage.aggregate({
      where: { userId },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true, estimatedCost: true },
      _count: true,
    });

    // 今日用量
    const today = await this.prisma.tokenUsage.aggregate({
      where: { userId, createdAt: { gte: todayStart } },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true, estimatedCost: true },
    });

    // 本月用量
    const thisMonth = await this.prisma.tokenUsage.aggregate({
      where: { userId, createdAt: { gte: monthStart } },
      _sum: { inputTokens: true, outputTokens: true, totalTokens: true, estimatedCost: true },
    });

    // 按模型统计
    const byModel = await this.prisma.tokenUsage.groupBy({
      by: ['model'],
      where: { userId },
      _sum: { totalTokens: true, estimatedCost: true },
      _count: true,
    });

    // 最近7天每日用量
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dailyRecords = await this.prisma.tokenUsage.findMany({
      where: { userId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, totalTokens: true, estimatedCost: true, model: true },
      orderBy: { createdAt: 'asc' },
    });

    // 按天聚合
    const dailyMap = new Map<string, { tokens: number; cost: number }>();
    for (const r of dailyRecords) {
      const day = r.createdAt.toISOString().slice(0, 10);
      const existing = dailyMap.get(day) ?? { tokens: 0, cost: 0 };
      existing.tokens += r.totalTokens;
      existing.cost += r.estimatedCost;
      dailyMap.set(day, existing);
    }

    // 获取用户 token 限额
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const membership = user?.membership || 'free';
    const QUOTA: Record<string, number> = {
      free: 100_000,
      basic: 1_000_000,
      pro: 10_000_000,
    };
    const tokenLimit = QUOTA[membership] ?? QUOTA.free;
    const monthUsed = thisMonth._sum.totalTokens ?? 0;

    return {
      total: {
        inputTokens: total._sum.inputTokens ?? 0,
        outputTokens: total._sum.outputTokens ?? 0,
        totalTokens: total._sum.totalTokens ?? 0,
        estimatedCost: total._sum.estimatedCost ?? 0,
        requests: total._count,
      },
      today: {
        inputTokens: today._sum.inputTokens ?? 0,
        outputTokens: today._sum.outputTokens ?? 0,
        totalTokens: today._sum.totalTokens ?? 0,
        estimatedCost: today._sum.estimatedCost ?? 0,
      },
      thisMonth: {
        inputTokens: thisMonth._sum.inputTokens ?? 0,
        outputTokens: thisMonth._sum.outputTokens ?? 0,
        totalTokens: thisMonth._sum.totalTokens ?? 0,
        estimatedCost: thisMonth._sum.estimatedCost ?? 0,
      },
      limit: {
        used: monthUsed,
        limit: tokenLimit,
        membership,
      },
      byModel: byModel.map((m) => ({
        model: m.model,
        totalTokens: m._sum.totalTokens ?? 0,
        estimatedCost: m._sum.estimatedCost ?? 0,
        requests: m._count,
      })),
      daily: Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        totalTokens: data.tokens,
        estimatedCost: data.cost,
      })),
    };
  }
}
