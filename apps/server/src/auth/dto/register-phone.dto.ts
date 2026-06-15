import { IsString, IsOptional, MinLength } from 'class-validator';

export class RegisterPhoneDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  smsCode?: string;

  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  password: string;

  @IsOptional()
  @IsString()
  captchaId?: string;

  @IsOptional()
  @IsString()
  captchaAnswer?: string;
}
