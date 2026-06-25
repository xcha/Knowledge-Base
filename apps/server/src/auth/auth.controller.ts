import { Controller, Post, Get, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { SendEmailCodeDto } from './dto/send-email-code.dto';
import { RegisterPhoneDto } from './dto/register-phone.dto';
import { RefreshDto } from './dto/refresh.dto';

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

  @Post('send-email-code')
  async sendEmailCode(@Body() dto: SendEmailCodeDto) {
    if (dto.captchaId && dto.captchaAnswer) {
      const valid = this.auth.verifyCaptcha(dto.captchaId, dto.captchaAnswer);
      if (!valid) {
        return { success: false, message: '图片验证码错误' };
      }
    }
    return this.auth.sendEmailCode(dto.email, dto.type ?? 'register');
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name, dto.emailCode);
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

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }
}
