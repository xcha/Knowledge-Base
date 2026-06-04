import { Controller, Post, Get, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { RegisterPhoneDto } from './dto/register-phone.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Get('captcha')
  getCaptcha(@Res() res: Response) {
    const { id, svg } = this.auth.generateCaptcha();
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('X-Captcha-Id', id);
    res.send(svg);
  }

  @Post('send-sms')
  async sendSms(@Body() dto: SendSmsDto) {
    if (dto.captchaId && dto.captchaAnswer) {
      const valid = this.auth.verifyCaptcha(dto.captchaId, dto.captchaAnswer);
      if (!valid) {
        return { success: false, message: '图片验证码错误' };
      }
    }
    return this.auth.sendSmsCode(dto.phone, dto.type ?? 'register');
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name);
  }

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

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
