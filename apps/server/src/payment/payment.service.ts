import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlipaySdk } from 'alipay-sdk';

/**
 * 会员价格配置（单位：元）
 * key: 会员等级 (basic=基础版, pro=高级版)
 * value: { month1: 月付价格, month3: 季付价格, month12: 年付价格 }
 *
 * 例：basic月付 19.9元，pro年付 349元
 */
const PRICE_CONFIG = {
  basic: { month1: 19.9, month3: 49.9, month12: 169 },
  pro: { month1: 39.9, month3: 99.9, month12: 349 },
} as const;

/**
 * 会员配额配置
 * 不同等级对应不同的功能上限
 *
 * free（免费版）：3个知识库、10个文档、每月10万token
 * basic（基础版）：10个知识库、50个文档、每月100万token
 * pro（高级版）：50个知识库、200个文档、每月1000万token
 */
const QUOTA_CONFIG = {
  free: { maxKnowledgeBases: 3, maxDocuments: 10, monthlyTokens: 100000 },
  basic: { maxKnowledgeBases: 10, maxDocuments: 50, monthlyTokens: 1000000 },
  pro: { maxKnowledgeBases: 50, maxDocuments: 200, monthlyTokens: 10000000 },
} as const;

/**
 * 支付服务
 *
 * 职责：
 * 1. 管理会员价格和配额配置
 * 2. 创建支付订单，生成支付宝支付表单
 * 3. 处理支付成功回调，更新用户会员状态
 * 4. 查询订单列表
 *
 * 支付宝接入流程：
 * - 配置 ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY 环境变量
 * - 未配置时自动降级为模拟支付（直接回调）
 * - 沙箱环境：https://openapi-sandbox.dl.alipaydev.com/gateway.do
 *
 * 支付流程：
 * 前端点击"立即支付" → createOrder() 创建订单 + 生成支付宝表单
 * → 前端渲染表单并自动提交 → 跳转到支付宝收银台
 * → 用户支付 → 支付宝异步回调 notifyUrl → handlePaymentSuccess()
 * → 更新订单状态 + 延长会员有效期 + 更新配额
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private alipaySdk: AlipaySdk | null = null;
  private appId = '';
  private gateway = '';

  constructor(private prisma: PrismaService) {
    // 从环境变量读取支付宝配置
    this.appId = process.env.ALIPAY_APP_ID || '';
    // 私钥必须是单行，去掉所有换行符（支付宝 SDK 要求）
    const privateKey = (process.env.ALIPAY_PRIVATE_KEY || '')
      .replace(/[\r\n]/g, '')
      .trim();
    const alipayPublicKey = (process.env.ALIPAY_PUBLIC_KEY || '')
      .replace(/[\r\n]/g, '')
      .trim();
    // 支付宝网关地址（沙箱/正式环境）
    this.gateway =
      process.env.ALIPAY_GATEWAY ||
      'https://openapi-sandbox.dl.alipaydev.com/gateway.do';

    // 如果三个密钥都配置了，初始化支付宝 SDK
    if (this.appId && privateKey && alipayPublicKey) {
      this.alipaySdk = new AlipaySdk({
        appId: this.appId,
        privateKey, // 应用私钥，用于签名
        alipayPublicKey, // 支付宝公钥，用于验签
        gateway: this.gateway,
        signType: 'RSA2', // 使用 RSA2（SHA256）签名，比 RSA 更安全
        timeout: 30000, // 请求超时 30 秒
      });
      this.logger.log('支付宝沙箱已初始化');
    } else {
      this.logger.warn('未配置支付宝密钥，将使用模拟支付');
    }
  }

  /**
   * 获取价格列表
   * 前端会员中心用此接口展示各套餐价格
   *
   * 返回格式：
   * { basic: { month1: 19.9, month3: 49.9, month12: 169 }, pro: { ... } }
   */
  getPriceList() {
    return PRICE_CONFIG;
  }

  /**
   * 获取配额配置
   * 前端会员中心用此接口展示各等级功能上限
   */
  getQuotaConfig() {
    return QUOTA_CONFIG;
  }

  /**
   * 创建支付订单
   *
   * 流程：
   * 1. 校验会员等级和购买时长
   * 2. 根据配置计算价格
   * 3. 生成唯一订单号（KB + 时间戳 + 随机串）
   * 4. 创建数据库订单记录
   * 5. 调用支付宝 SDK 生成支付表单 HTML
   * 6. 返回订单信息 + 支付表单（payUrl）
   *
   * @param userId - 用户 ID
   * @param membership - 会员等级（basic / pro）
   * @param durationMonths - 购买时长（1 / 3 / 12 个月）
   * @returns 订单信息 + 支付表单 HTML
   */
  async createOrder(
    userId: string,
    membership: string,
    durationMonths: number,
  ) {
    // 校验会员等级
    if (!['basic', 'pro'].includes(membership)) {
      throw new BadRequestException('不支持的会员等级');
    }
    // 校验购买时长
    if (![1, 3, 12].includes(durationMonths)) {
      throw new BadRequestException('不支持的购买时长');
    }

    // 根据等级和时长计算价格
    const monthKey =
      `month${durationMonths}` as keyof typeof PRICE_CONFIG.basic;
    const totalAmount =
      PRICE_CONFIG[membership as keyof typeof PRICE_CONFIG][monthKey].toFixed(
        2,
      );

    // 生成唯一商户订单号：KB + 时间戳 + 6位随机字母
    const outTradeNo = `KB${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // 写入数据库订单记录
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

    // ========== 生成支付宝支付表单 ==========
    // 如果配置了支付宝密钥，调用支付宝 API 生成支付表单
    // 表单是一个 HTML 页面，前端渲染后自动提交到支付宝收银台
    let payUrl: string | undefined;
    if (this.alipaySdk) {
      try {
        // 使用 pageExecute 方法获取 POST 表单 HTML
        // alipay.trade.page.pay 接口返回的是 HTML 表单，不是 JSON
        // 所以不能用 exec 方法（exec 用于 JSON 响应的接口）
        const html = this.alipaySdk.pageExecute('alipay.trade.page.pay', 'POST', {
          bizContent: {
            out_trade_no: outTradeNo,
            total_amount: totalAmount,
            subject: order.subject,
            product_code: 'FAST_INSTANT_TRADE_PAY',
          },
          returnUrl:
            process.env.ALIPAY_RETURN_URL ||
            'http://localhost:3000/dashboard/membership',
        }) as string;

        this.logger.log('支付宝 SDK 返回 HTML 表单，长度:', html?.length);

        // pageExecute 返回完整的 HTML 表单字符串
        if (html && typeof html === 'string' && html.includes('<form')) {
          payUrl = html;
        }
      } catch (err: unknown) {
        this.logger.error('支付宝支付失败:', String(err));
      }
    }

    // 如果未配置支付宝，payUrl 为 undefined
    // 前端检测到 payUrl 为空时，走模拟支付流程（直接回调）
    return {
      orderId: order.id,
      outTradeNo: order.outTradeNo,
      subject: order.subject,
      totalAmount: order.totalAmount,
      payUrl, // HTML 表单 或 undefined（模拟模式）
    };
  }

  /**
   * 支付成功回调
   *
   * 两个入口调用此方法：
   * 1. 支付宝异步回调 notifyUrl（POST /api/payment/notify）
   * 2. 前端模拟支付（POST /api/payment/callback/:outTradeNo）
   *
   * 处理逻辑：
   * 1. 查询订单，校验存在性和权限
   * 2. 更新订单状态为 paid
   * 3. 计算新的会员到期时间（如果当前会员未过期，从到期日往后加）
   * 4. 更新用户会员等级、到期时间、配额上限
   *
   * @param outTradeNo - 商户订单号
   * @param userId - 用户 ID（模拟支付时传入，支付宝回调时不传）
   * @param notifyParams - 支付宝回调参数（用于验签）
   * @returns 支付结果 + 新的会员信息
   */
  async handlePaymentSuccess(
    outTradeNo: string,
    userId?: string,
    notifyParams?: Record<string, string>,
  ) {
    // 支付宝异步回调时验签，防止伪造回调
    if (!userId && this.alipaySdk && notifyParams) {
      const signValid = this.alipaySdk.checkNotifySign(notifyParams);
      if (!signValid) {
        this.logger.warn('支付宝回调验签失败', outTradeNo);
        throw new ForbiddenException('签名验证失败');
      }
    }

    // 查询订单
    const order = await this.prisma.paymentOrder.findUnique({
      where: { outTradeNo },
    });
    if (!order) throw new BadRequestException('订单不存在');
    // 校验订单归属（防止越权操作）
    if (userId && order.userId !== userId)
      throw new ForbiddenException('无权操作此订单');
    // 防止重复处理
    if (order.status === 'paid')
      return { success: true, message: '订单已支付' };

    // 计算新的会员到期时间
    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
    });
    if (!user) throw new BadRequestException('用户不存在');

    // 如果当前会员未过期，从到期日往后加；否则从现在往后加
    // 这样支持「续费」场景：买了3个月还没到期，再买1个月 = 到期日 +1月
    const now = new Date();
    const baseDate =
      user.membershipExpiresAt && user.membershipExpiresAt > now
        ? new Date(user.membershipExpiresAt)
        : now;

    // 使用 setDate 避免月末日期偏移问题
    // 例如：1月31日 + 1个月 = 3月1日（而非2月28日）
    const expiresAt = new Date(baseDate);
    const targetMonth = expiresAt.getMonth() + order.durationMonths;
    expiresAt.setMonth(targetMonth);
    // 如果日期回退了（如31日->28日），说明溢出，设置为下月1日
    if (expiresAt.getMonth() !== targetMonth % 12) {
      expiresAt.setDate(1);
      expiresAt.setMonth(targetMonth + 1);
    }

    // 获取配额配置
    const quota = QUOTA_CONFIG[order.membership as keyof typeof QUOTA_CONFIG];
    if (!quota) {
      throw new BadRequestException('无效的会员等级');
    }

    // 使用事务确保数据一致性：订单状态和用户信息同时更新
    await this.prisma.$transaction([
      // 1. 更新订单状态为已支付
      this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: 'paid', paidAt: new Date() },
      }),
      // 2. 更新用户会员信息和配额
      this.prisma.user.update({
        where: { id: order.userId },
        data: {
          membership: order.membership, // 会员等级
          membershipExpiresAt: expiresAt, // 到期时间
          maxKnowledgeBases: quota.maxKnowledgeBases, // 知识库上限
          maxDocuments: quota.maxDocuments, // 文档上限
        },
      }),
    ]);

    return { success: true, membership: order.membership, expiresAt };
  }

  /**
   * 获取用户的支付订单列表
   * 按创建时间倒序排列（最新的在前）
   */
  async getUserOrders(userId: string) {
    return this.prisma.paymentOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
