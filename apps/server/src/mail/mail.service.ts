import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 端口用 SSL
        auth: { user, pass },
      });
      this.logger.log(`邮件服务已初始化: ${host}:${port}`);
    } else {
      this.logger.warn('未配置 SMTP，邮件将以日志模式运行');
    }
  }

  /**
   * 发送邮件验证码
   * @param to 收件人邮箱
   * @param code 验证码
   * @param type 验证码类型（register/login/reset）
   */
  async sendCode(
    to: string,
    code: string,
    type: string = 'register',
  ): Promise<boolean> {
    const typeMap: Record<string, string> = {
      register: '注册',
      login: '登录',
      reset: '重置密码',
    };
    const typeName = typeMap[type] || '验证';

    // 未配置 SMTP 时，日志模式
    if (!this.transporter) {
      this.logger.warn(`[DEV MAIL] ${to} -> ${typeName}验证码: ${code}`);
      return true;
    }

    try {
      const from = process.env.SMTP_FROM || process.env.SMTP_USER;
      await this.transporter.sendMail({
        from,
        to,
        subject: `【AI知识库】${typeName}验证码`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
            <h2 style="color: #333;">AI知识库 - ${typeName}验证码</h2>
            <p>您正在进行${typeName}操作，验证码为：</p>
            <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #1677ff; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666;">验证码 5 分钟内有效，请勿泄露给他人。</p>
            <p style="color: #999; font-size: 12px;">如非本人操作，请忽略此邮件。</p>
          </div>
        `,
      });
      this.logger.log(`邮件已发送: ${to}`);
      return true;
    } catch (err) {
      this.logger.error('邮件发送失败', err);
      return false;
    }
  }
}
