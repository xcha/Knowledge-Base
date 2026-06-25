import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendEmailCodeDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  type?: string; // register | login | reset

  @IsOptional()
  @IsString()
  captchaId?: string;

  @IsOptional()
  @IsString()
  captchaAnswer?: string;
}
