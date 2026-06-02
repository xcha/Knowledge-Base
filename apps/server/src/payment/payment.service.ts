import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 会员价格配置（单位：元）
const PRICE_CONFIG = {
  basic: { month1: 19.9, month3: 49.9, month12: 169 },
  pro: { month1: 39.9, month3: 99.9, month12: 349 },
} as const;

// 会员配额配置：不同会员等级的功能上限
const QUOTA_CONFIG = {
  free: { maxKnowledgeBases: 3, maxDocuments: 10 },
  basic: { maxKnowledgeBases: 10, maxDocuments: 50 },
  pro: { maxKnowledgeBases: 50, maxDocuments: 200 },
} as const;

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  /** 获取价格列表 */
  getPriceList() {
    return PRICE_CONFIG;
  }

  /** 获取配额配置 */
  getQuotaConfig() {
    return QUOTA_CONFIG;
  }

  /** 创建支付订单 */
  async createOrder(
    userId: string,
    membership: string,
    durationMonths: number,
  ) {
    if (!['basic', 'pro'].includes(membership)) {
      throw new BadRequestException('不支持的会员等级');
    }
    if (![1, 3, 12].includes(durationMonths)) {
      throw new BadRequestException('不支持的购买时长');
    }

    const monthKey = `month${durationMonths}` as keyof (typeof PRICE_CONFIG.basic);
    const totalAmount = PRICE_CONFIG[membership as keyof typeof PRICE_CONFIG][monthKey].toFixed(2);

    // 生成唯一商户订单号
    const outTradeNo = `KB${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        outTradeNo,
        subject: `${membership === 'basic' ? '基础' : '高级'}会员-${durationMonths}个月`,
        totalAmount,
        membership,
        durationMonths,
      },
    });

    return {
      orderId: order.id,
      outTradeNo: order.outTradeNo,
      subject: order.subject,
      totalAmount: order.totalAmount,
    };
  }

  /**
   * 支付成功回调：更新订单状态 + 延长会员
   * 如果是沙箱模拟支付，前端可直接调此接口
   */
  async handlePaymentSuccess(outTradeNo: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { outTradeNo },
    });
    if (!order) throw new BadRequestException('订单不存在');
    if (order.status === 'paid') return { success: true, message: '订单已支付' };

    // 1. 更新订单状态
    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: 'paid', paidAt: new Date() },
    });

    // 2. 计算会员到期时间
    const user = await this.prisma.user.findUnique({ where: { id: order.userId } });
    if (!user) throw new BadRequestException('用户不存在');

    // 如果当前已有会员且未过期，从到期日往后加；否则从现在往后加
    const now = new Date();
    const baseDate = user.membershipExpiresAt && user.membershipExpiresAt > now
      ? new Date(user.membershipExpiresAt)
      : now;
    const expiresAt = new Date(baseDate);
    expiresAt.setMonth(expiresAt.getMonth() + order.durationMonths);

    // 3. 更新用户会员信息和配额
    const quota = QUOTA_CONFIG[order.membership as keyof typeof QUOTA_CONFIG];
    await this.prisma.user.update({
      where: { id: order.userId },
      data: {
        membership: order.membership,
        membershipExpiresAt: expiresAt,
        maxKnowledgeBases: quota.maxKnowledgeBases,
        maxDocuments: quota.maxDocuments,
      },
    });

    return { success: true, membership: order.membership, expiresAt };
  }

  /** 获取用户的支付订单列表 */
  async getUserOrders(userId: string) {
    return this.prisma.paymentOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
