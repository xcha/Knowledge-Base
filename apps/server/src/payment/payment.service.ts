import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlipaySdk } from 'alipay-sdk';

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
  private readonly logger = new Logger(PaymentService.name);
  private alipaySdk: AlipaySdk | null = null;

  constructor(private prisma: PrismaService) {
    const appId = process.env.ALIPAY_APP_ID;
    const privateKey = process.env.ALIPAY_PRIVATE_KEY;
    const publicKey = process.env.ALIPAY_PUBLIC_KEY;

    if (appId && privateKey && publicKey) {
      this.alipaySdk = new AlipaySdk({
        appId,
        privateKey,
        alipayPublicKey: publicKey,
        gateway: process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
        signType: 'RSA2',
      });
      this.logger.log('支付宝沙箱已初始化');
    } else {
      this.logger.warn('未配置支付宝密钥，将使用模拟支付');
    }
  }

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

    // 如果配置了支付宝，生成支付链接
    let payUrl: string | undefined;
    if (this.alipaySdk) {
      try {
        const result = await this.alipaySdk.exec('alipay.trade.page.pay', {
          bizContent: {
            out_trade_no: outTradeNo,
            total_amount: totalAmount,
            subject: order.subject,
            product_code: 'FAST_INSTANT_TRADE_PAY',
          },
          returnUrl: process.env.ALIPAY_RETURN_URL || 'http://localhost:3000/dashboard/membership',
        });
        // exec 返回的是 AlipaySdkCommonResult，其中 body 包含支付表单 HTML
        payUrl = (result as Record<string, unknown>).body as string || undefined;
      } catch (err) {
        this.logger.error('生成支付宝链接失败', err);
      }
    }

    return {
      orderId: order.id,
      outTradeNo: order.outTradeNo,
      subject: order.subject,
      totalAmount: order.totalAmount,
      payUrl,
    };
  }

  /**
   * 支付成功回调：更新订单状态 + 延长会员
   * 支付宝异步通知调用此方法
   */
  async handlePaymentSuccess(outTradeNo: string, userId?: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { outTradeNo },
    });
    if (!order) throw new BadRequestException('订单不存在');
    if (userId && order.userId !== userId) throw new ForbiddenException('无权操作此订单');
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
