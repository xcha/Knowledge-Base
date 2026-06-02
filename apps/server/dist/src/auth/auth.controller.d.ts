import type { Response } from 'express';
import { AuthService } from './auth.service';
declare class RegisterDto {
    email: string;
    password: string;
    name?: string;
}
declare class LoginDto {
    email: string;
    password: string;
}
declare class SendSmsDto {
    phone: string;
    type?: string;
    captchaId?: string;
    captchaAnswer?: string;
}
declare class RegisterPhoneDto {
    phone: string;
    smsCode: string;
    password: string;
    captchaId?: string;
    captchaAnswer?: string;
}
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    getCaptcha(res: Response): void;
    sendSms(dto: SendSmsDto): Promise<{
        success: boolean;
        code?: string;
    } | {
        success: boolean;
        message: string;
    }>;
    register(dto: RegisterDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            phone: string | null;
            membership: string;
            createdAt: Date;
        };
        token: string;
    }>;
    registerPhone(dto: RegisterPhoneDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            phone: string | null;
            membership: string;
            createdAt: Date;
        };
        token: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            phone: string | null;
            membership: string;
            membershipExpiresAt: Date | null;
        };
        token: string;
    }>;
}
export {};
