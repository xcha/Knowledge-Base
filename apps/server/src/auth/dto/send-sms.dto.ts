import { IsString, IsOptional } from 'class-validator';

export class SendSmsDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  captchaId?: string;

  @IsOptional()
  @IsString()
  captchaAnswer?: string;
}
