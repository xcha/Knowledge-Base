import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { SendEmailCodeDto } from './dto/send-email-code.dto';
import { RegisterPhoneDto } from './dto/register-phone.dto';
import { RefreshDto } from './dto/refresh.dto';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    getCaptcha(res: Response): void;
    sendSms(dto: SendSmsDto): Promise<{
        success: boolean;
    } | {
        success: boolean;
        message: string;
    }>;
    sendEmailCode(dto: SendEmailCodeDto): Promise<{
        success: boolean;
    } | {
        success: boolean;
        message: string;
    }>;
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            membership: string;
            createdAt: Date;
            name: string | null;
            email: string;
            phone: string | null;
        };
    }>;
    registerPhone(dto: RegisterPhoneDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            membership: string;
            createdAt: Date;
            name: string | null;
            email: string;
            phone: string | null;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            phone: string | null;
            membership: string;
            membershipExpiresAt: Date | null;
        };
    }>;
    refresh(dto: RefreshDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(dto: RefreshDto): Promise<{
        success: boolean;
    }>;
}
