import { Controller, Post, Get, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

class RegisterDto {
  email: string;
  password: string;
  name?: string;
}

class LoginDto {
  email: string;
  password: string;
}

class SendSmsDto {
  phone: string;
  type?: string;      // register | login | reset_password
  captchaId?: string;  // 图片验证码ID
  captchaAnswer?: string; // 图片验证码答案
}

class RegisterPhoneDto {
  phone: string;
  smsCode: string;
  password: string;
  captchaId?: string;
  captchaAnswer?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // ---- 图片验证码 ----
  @Get('captcha')
  getCaptcha(@Res() res: Response) {
    const { id, svg } = this.auth.generateCaptcha();
    // 把验证码ID存到前端（通过Header），答案存在服务端内存
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('X-Captcha-Id', id);
    res.send(svg);
  }

  // ---- 短信验证码 ----
  @Post('send-sms')
  async sendSms(@Body() dto: SendSmsDto) {
    // 如果前端传了图片验证码，先验证
    if (dto.captchaId && dto.captchaAnswer) {
      // 验证逻辑由 sendSmsCode 内部调用 verifyCaptcha
      const valid = this.auth.verifyCaptcha(dto.captchaId, dto.captchaAnswer);
      if (!valid) {
        return { success: false, message: '图片验证码错误' };
      }
    }
    return this.auth.sendSmsCode(dto.phone, dto.type ?? 'register');
  }

  // ---- 邮箱注册 ----
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name);
  }

  // ---- 手机号注册 ----
  @Post('register-phone')
  registerPhone(@Body() dto: RegisterPhoneDto) {
    return this.auth.registerByPhone(
      dto.phone,
      dto.smsCode,
      dto.password,
      dto.captchaId,
      dto.captchaAnswer,
    );
  }

  // ---- 登录 ----
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
