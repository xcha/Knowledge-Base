import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /** 获取用户完整档案（含会员信息、使用统计） */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerified: true,
        membership: true,
        membershipExpiresAt: true,
        maxKnowledgeBases: true,
        maxDocuments: true,
        createdAt: true,
        _count: { select: { knowledgeBases: true } },
      },
    });

    // 统计已上传文档数
    const docCount = await this.prisma.document.count({
      where: { knowledgeBase: { userId } },
    });

    return { ...user, usedDocuments: docCount };
  }

  /** 获取 ECharts 需要的统计数据 */
  async getStatistics(userId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ---- 1. 知识库数量趋势（最近30天，按天聚合） ----
    const kbCreated = await this.prisma.knowledgeBase.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    // ---- 2. 文档上传趋势（最近30天，按天聚合） ----
    const docsCreated = await this.prisma.document.findMany({
      where: {
        knowledgeBase: { userId },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    // ---- 3. 对话趋势（最近7天，按天聚合） ----
    const messagesCreated = await this.prisma.chatMessage.findMany({
      where: {
        session: { knowledgeBase: { userId } },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true, role: true },
    });

    // ---- 4. 总量汇总 ----
    const totalKb = await this.prisma.knowledgeBase.count({
      where: { userId },
    });
    const totalDocs = await this.prisma.document.count({
      where: { knowledgeBase: { userId } },
    });
    const totalSessions = await this.prisma.chatSession.count({
      where: { knowledgeBase: { userId } },
    });
    const totalMessages = await this.prisma.chatMessage.count({
      where: { session: { knowledgeBase: { userId } } },
    });

    // ---- 5. 知识库文档分布（饼图数据） ----
    const kbs = await this.prisma.knowledgeBase.findMany({
      where: { userId },
      select: {
        name: true,
        _count: { select: { documents: true, sessions: true } },
      },
    });

    return {
      // 趋势数据（前端 ECharts 折线图）
      trends: {
        knowledgeBases: aggregateByDay(
          kbCreated.map((d) => d.createdAt),
          thirtyDaysAgo,
        ),
        documents: aggregateByDay(
          docsCreated.map((d) => d.createdAt),
          thirtyDaysAgo,
        ),
        messages: aggregateByDay(
          messagesCreated.map((d) => d.createdAt),
          sevenDaysAgo,
        ),
      },
      // 汇总卡片数据
      summary: { totalKb, totalDocs, totalSessions, totalMessages },
      // 知识库分布（饼图）
      kbDistribution: kbs.map((kb) => ({
        name: kb.name,
        documents: kb._count.documents,
        sessions: kb._count.sessions,
      })),
    };
  }
}

/**
 * 把日期数组按天聚合为 ECharts 需要的 [{date, count}] 格式
 */
function aggregateByDay(
  dates: Date[],
  since: Date,
): { date: string; count: number }[] {
  const map = new Map<string, number>();
  const current = new Date(since);

  // 初始化所有天为0
  while (current <= new Date()) {
    const key = current.toISOString().slice(0, 10);
    map.set(key, 0);
    current.setDate(current.getDate() + 1);
  }

  dates.forEach((d) => {
    const key = d.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  });

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}
