import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as svgCaptcha from 'svg-captcha';

// 图片验证码内存存储：key=验证码ID, value={text, expiresAt}
const captchaStore = new Map<string, { text: string; expiresAt: number }>();

// 定时清理过期验证码（每5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of captchaStore) {
    if (val.expiresAt < now) captchaStore.delete(key);
  }
}, 5 * 60 * 1000);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ========== 图片验证码 ==========
  // 返回 SVG 图片和验证码 ID，前端用 ID 带着答案提交
  generateCaptcha(): { id: string; svg: string } {
    const captcha = svgCaptcha.create({
      size: 4,          // 4位字符
      noise: 3,          // 3条干扰线
      color: true,       // 彩色字符
      background: '#f0f0f0',
      width: 120,
      height: 42,
      fontSize: 48,
    });

    // 生成唯一 ID，存入内存，5分钟过期
    const id = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    captchaStore.set(id, {
      text: captcha.text.toLowerCase(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return { id, svg: captcha.data };
  }

  // 验证图片验证码，返回 true/false
  verifyCaptcha(id: string, answer: string): boolean {
    const record = captchaStore.get(id);
    if (!record) return false;
    captchaStore.delete(id); // 一次性使用
    if (record.expiresAt < Date.now()) return false;
    return record.text === answer.toLowerCase().trim();
  }

  // ========== 短信验证码 ==========
  // 生成6位随机码，存入 DB，返回验证码（开发阶段直接返回，生产通过短信发送）
  async sendSmsCode(phone: string, type: string = 'register'): Promise<{ success: boolean; code?: string }> {
    // 60秒内不允许重复发送
    const recent = await this.prisma.smsCode.findFirst({
      where: { phone, type, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
    });
    if (recent) throw new BadRequestException('发送过于频繁，请60秒后再试');

    // 生成6位随机数字验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));

    await this.prisma.smsCode.create({
      data: {
        phone,
        code,
        type,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5分钟有效
      },
    });

    // TODO: 生产环境接入阿里云短信发送
    // await this.sendViaAlibabaSms(phone, code);

    // 开发阶段直接返回验证码，方便调试
    console.log(`[SMS] 手机号 ${phone} 验证码: ${code}`);
    return { success: true, code };
  }

  // 验证短信验证码
  async verifySmsCode(phone: string, code: string, type: string): Promise<boolean> {
    const record = await this.prisma.smsCode.findFirst({
      where: { phone, code, type, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return false;
    if (record.expiresAt < new Date()) return false;

    // 标记已使用
    await this.prisma.smsCode.update({ where: { id: record.id }, data: { used: true } });
    return true;
  }

  // ========== 邮箱注册 ==========
  async register(email: string, password: string, name?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('邮箱已被注册');

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hashed, name },
      select: { id: true, email: true, name: true, phone: true, membership: true, createdAt: true },
    });

    return { user, token: this.signToken(user.id, user.email) };
  }

  // ========== 手机号注册（短信验证码） ==========
  async registerByPhone(
    phone: string,
    smsCode: string,
    password: string,
    captchaId?: string,
    captchaAnswer?: string,
  ) {
    // 1. 先验证图片验证码（如果有）
    if (captchaId && captchaAnswer) {
      if (!this.verifyCaptcha(captchaId, captchaAnswer)) {
        throw new BadRequestException('图片验证码错误');
      }
    }

    // 2. 验证短信验证码
    const smsValid = await this.verifySmsCode(phone, smsCode, 'register');
    if (!smsValid) throw new BadRequestException('短信验证码错误或已过期');

    // 3. 检查手机号是否已注册
    const exists = await this.prisma.user.findUnique({ where: { phone } });
    if (exists) throw new ConflictException('手机号已被注册');

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { phone, phoneVerified: true, email: `${phone}@phone.user`, password: hashed },
      select: { id: true, email: true, name: true, phone: true, membership: true, createdAt: true },
    });

    return { user, token: this.signToken(user.id, user.phone ?? user.email) };
  }

  // ========== 登录 ==========
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('邮箱或密码错误');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('邮箱或密码错误');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        membership: user.membership,
        membershipExpiresAt: user.membershipExpiresAt,
      },
      token: this.signToken(user.id, user.email),
    };
  }

  private signToken(userId: string, email: string): string {
    return this.jwt.sign({ sub: userId, email });
  }
}
