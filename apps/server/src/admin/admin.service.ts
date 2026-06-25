import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ========== 数据统计 ==========

  async getDashboard() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      todayUsers,
      monthUsers,
      totalOrders,
      monthOrders,
      paidOrders,
      totalKnowledgeBases,
      totalDocuments,
      totalMessages,
    ] = await Promise.all([
      // 用户统计
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      // 订单统计
      this.prisma.paymentOrder.count(),
      this.prisma.paymentOrder.count({ where: { createdAt: { gte: thisMonth } } }),
      this.prisma.paymentOrder.findMany({
        where: { status: 'paid' },
        select: { totalAmount: true },
      }),
      // 内容统计
      this.prisma.knowledgeBase.count(),
      this.prisma.document.count(),
      this.prisma.chatMessage.count(),
    ]);

    // 计算总收入
    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + parseFloat(o.totalAmount || '0'),
      0,
    );

    // 会员分布
    const membershipDistribution = await this.prisma.user.groupBy({
      by: ['membership'],
      _count: { id: true },
    });

    return {
      users: {
        total: totalUsers,
        today: todayUsers,
        thisMonth: monthUsers,
      },
      orders: {
        total: totalOrders,
        thisMonth: monthOrders,
        totalRevenue: totalRevenue.toFixed(2),
      },
      content: {
        knowledgeBases: totalKnowledgeBases,
        documents: totalDocuments,
        messages: totalMessages,
      },
      membership: membershipDistribution.map((m) => ({
        level: m.membership,
        count: m._count.id,
      })),
    };
  }

  // ========== 用户管理 ==========

  async getUsers(page: number = 1, pageSize: number = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          membership: true,
          membershipExpiresAt: true,
          maxKnowledgeBases: true,
          maxDocuments: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              knowledgeBases: true,
              teamMembers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        membership: true,
        membershipExpiresAt: true,
        maxKnowledgeBases: true,
        maxDocuments: true,
        createdAt: true,
        updatedAt: true,
        knowledgeBases: {
          select: {
            id: true,
            name: true,
            _count: { select: { documents: true, sessions: true } },
          },
        },
        _count: {
          select: {
            knowledgeBases: true,
            teamMembers: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('用户不存在');

    // 获取用户的订单
    const orders = await this.prisma.paymentOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 获取 token 使用量
    const tokenUsage = await this.prisma.tokenUsage.aggregate({
      where: { userId },
      _sum: { totalTokens: true, estimatedCost: true },
    });

    return {
      ...user,
      orders,
      tokenUsage: {
        totalTokens: tokenUsage._sum.totalTokens || 0,
        estimatedCost: (tokenUsage._sum.estimatedCost || 0).toFixed(4),
      },
    };
  }

  async updateUser(
    userId: string,
    data: {
      name?: string;
      role?: string;
      membership?: string;
      membershipExpiresAt?: string;
      maxKnowledgeBases?: number;
      maxDocuments?: number;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.membership !== undefined) updateData.membership = data.membership;
    if (data.membershipExpiresAt !== undefined) {
      updateData.membershipExpiresAt = data.membershipExpiresAt
        ? new Date(data.membershipExpiresAt)
        : null;
    }
    if (data.maxKnowledgeBases !== undefined)
      updateData.maxKnowledgeBases = data.maxKnowledgeBases;
    if (data.maxDocuments !== undefined)
      updateData.maxDocuments = data.maxDocuments;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        membership: true,
        membershipExpiresAt: true,
        maxKnowledgeBases: true,
        maxDocuments: true,
      },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 'admin') throw new BadRequestException('不能删除管理员');

    // 删除用户及其关联数据
    await this.prisma.$transaction([
      // 删除用户的聊天记录
      this.prisma.chatMessage.deleteMany({
        where: { session: { knowledgeBase: { userId } } },
      }),
      this.prisma.chatSession.deleteMany({
        where: { knowledgeBase: { userId } },
      }),
      // 删除用户的文档
      this.prisma.documentChunk.deleteMany({
        where: { document: { knowledgeBase: { userId } } },
      }),
      this.prisma.document.deleteMany({
        where: { knowledgeBase: { userId } },
      }),
      // 删除用户的知识库
      this.prisma.knowledgeBase.deleteMany({ where: { userId } }),
      // 删除用户的订单
      this.prisma.paymentOrder.deleteMany({ where: { userId } }),
      // 删除用户的 token 使用记录
      this.prisma.tokenUsage.deleteMany({ where: { userId } }),
      // 删除用户的刷新令牌
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      // 删除用户
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return { success: true, message: '用户已删除' };
  }

  async resetPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // 清除所有刷新令牌，强制重新登录
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { success: true, message: '密码已重置' };
  }

  // ========== 订单管理 ==========

  async getOrders(
    page: number = 1,
    pageSize: number = 20,
    status?: string,
    search?: string,
  ) {
    const where: Prisma.PaymentOrderWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { outTradeNo: { contains: search } },
        { subject: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.paymentOrder.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async manualPayOrder(orderId: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status === 'paid') throw new BadRequestException('订单已支付');

    // 更新订单状态
    await this.prisma.paymentOrder.update({
      where: { id: orderId },
      data: { status: 'paid', paidAt: new Date() },
    });

    // 更新用户会员
    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
    });
    if (user) {
      const now = new Date();
      const baseDate =
        user.membershipExpiresAt && user.membershipExpiresAt > now
          ? new Date(user.membershipExpiresAt)
          : now;
      const expiresAt = new Date(baseDate);
      expiresAt.setMonth(expiresAt.getMonth() + order.durationMonths);

      const quotaConfig: Record<string, { maxKnowledgeBases: number; maxDocuments: number }> = {
        basic: { maxKnowledgeBases: 10, maxDocuments: 50 },
        pro: { maxKnowledgeBases: 50, maxDocuments: 200 },
      };
      const quota = quotaConfig[order.membership];

      await this.prisma.user.update({
        where: { id: order.userId },
        data: {
          membership: order.membership,
          membershipExpiresAt: expiresAt,
          ...(quota && {
            maxKnowledgeBases: quota.maxKnowledgeBases,
            maxDocuments: quota.maxDocuments,
          }),
        },
      });
    }

    return { success: true, message: '订单已手动确认支付' };
  }

  async closeOrder(orderId: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 'pending') throw new BadRequestException('只能关闭待支付订单');

    await this.prisma.paymentOrder.update({
      where: { id: orderId },
      data: { status: 'closed' },
    });

    return { success: true, message: '订单已关闭' };
  }

  // ========== 系统设置 ==========

  async getConfigs() {
    const configs = await this.prisma.systemConfig.findMany();
    return configs.reduce(
      (acc, c) => {
        acc[c.key] = c.value;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  async setConfig(key: string, value: string) {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async deleteConfig(key: string) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundException('配置不存在');

    await this.prisma.systemConfig.delete({ where: { key } });
    return { success: true, message: '配置已删除' };
  }

  // ========== 管理员初始化 ==========

  async initAdmin(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      // 如果已存在，设为管理员
      if (existing.role !== 'admin') {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { role: 'admin' },
        });
        return { success: true, message: '已设为管理员', userId: existing.id };
      }
      return { success: true, message: '已是管理员', userId: existing.id };
    }

    // 创建管理员账号
    const hashed = await bcrypt.hash(password, 10);
    const admin = await this.prisma.user.create({
      data: {
        email,
        password: hashed,
        name: '管理员',
        role: 'admin',
      },
    });

    return { success: true, message: '管理员账号已创建', userId: admin.id };
  }
}
