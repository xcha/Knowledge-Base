import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import * as bcrypt from 'bcryptjs';
import * as svgCaptcha from 'svg-captcha';
import { randomInt, randomBytes } from 'crypto';

// 图片验证码内存存储：key=验证码ID, value={text, expiresAt}
const captchaStore = new Map<string, { text: string; expiresAt: number }>();

// 定时清理过期验证码（每5分钟）
setInterval(
  () => {
    const now = Date.now();
    for (const [key, val] of captchaStore) {
      if (val.expiresAt < now) captchaStore.delete(key);
    }
  },
  5 * 60 * 1000,
);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private sms: SmsService,
    private config: ConfigService,
  ) {}

  // ========== 图片验证码 ==========
  generateCaptcha(): { id: string; svg: string } {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 3,
      color: true,
      background: '#f0f0f0',
      width: 120,
      height: 42,
      fontSize: 48,
    });

    const id = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    captchaStore.set(id, {
      text: captcha.text.toLowerCase(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return { id, svg: captcha.data };
  }

  verifyCaptcha(id: string, answer: string): boolean {
    const record = captchaStore.get(id);
    if (!record) return false;
    captchaStore.delete(id);
    if (record.expiresAt < Date.now()) return false;
    return record.text === answer.toLowerCase().trim();
  }

  // ========== 短信验证码 ==========
  async sendSmsCode(
    phone: string,
    type: string = 'register',
  ): Promise<{ success: boolean }> {
    const recent = await this.prisma.smsCode.findFirst({
      where: {
        phone,
        type,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });
    if (recent) throw new BadRequestException('发送过于频繁，请60秒后再试');

    const code = String(randomInt(100000, 1000000));

    await this.prisma.smsCode.create({
      data: {
        phone,
        code,
        type,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await this.sms.sendCode(phone, code);
    return { success: true };
  }

  async verifySmsCode(
    phone: string,
    code: string,
    type: string,
  ): Promise<boolean> {
    const record = await this.prisma.smsCode.findFirst({
      where: { phone, code, type, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return false;
    if (record.expiresAt < new Date()) return false;

    await this.prisma.smsCode.update({
      where: { id: record.id },
      data: { used: true },
    });
    return true;
  }

  // ========== 双 Token 签发 ==========
  private async signTokenPair(userId: string, email: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email, type: 'access' },
      { expiresIn: '15m' },
    );

    const refreshToken = randomBytes(40).toString('hex');
    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiresIn));

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  // ========== 刷新 Token ==========
  async refresh(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!record) throw new UnauthorizedException('无效的刷新令牌');
    if (record.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: record.id } });
      throw new UnauthorizedException('刷新令牌已过期');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    });
    if (!user) throw new UnauthorizedException('用户不存在');

    // 删除旧的 refresh token（一次性使用）
    await this.prisma.refreshToken.delete({ where: { id: record.id } });

    // 签发新的 token pair
    return this.signTokenPair(user.id, user.email);
  }

  // ========== 登出（清除 refresh token） ==========
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { success: true };
  }

  // ========== 邮箱注册 ==========
  async register(email: string, password: string, name?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('邮箱已被注册');

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hashed, name },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        membership: true,
        createdAt: true,
      },
    });

    const tokens = await this.signTokenPair(user.id, user.email);
    return { user, ...tokens };
  }

  // ========== 手机号注册 ==========
  async registerByPhone(
    phone: string,
    smsCode: string | undefined,
    password: string,
    captchaId?: string,
    captchaAnswer?: string,
  ) {
    if (captchaId && captchaAnswer) {
      if (!this.verifyCaptcha(captchaId, captchaAnswer)) {
        throw new BadRequestException('图片验证码错误');
      }
    }

    if (smsCode) {
      const smsValid = await this.verifySmsCode(phone, smsCode, 'register');
      if (!smsValid) throw new BadRequestException('短信验证码错误或已过期');
    }

    const exists = await this.prisma.user.findUnique({ where: { phone } });
    if (exists) throw new ConflictException('手机号已被注册');

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone,
        phoneVerified: true,
        email: `${phone}@phone.user`,
        password: hashed,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        membership: true,
        createdAt: true,
      },
    });

    const tokens = await this.signTokenPair(user.id, user.phone ?? user.email);
    return { user, ...tokens };
  }

  // ========== 登录 ==========
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('邮箱或密码错误');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('邮箱或密码错误');

    const tokens = await this.signTokenPair(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        membership: user.membership,
        membershipExpiresAt: user.membershipExpiresAt,
      },
      ...tokens,
    };
  }
}
