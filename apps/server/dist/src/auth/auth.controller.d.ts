import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { RegisterPhoneDto } from './dto/register-phone.dto';
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
            phone: string | null;
            createdAt: Date;
            name: string | null;
            email: string;
            membership: string;
        };
        token: string;
    }>;
    registerPhone(dto: RegisterPhoneDto): Promise<{
        user: {
            id: string;
            phone: string | null;
            createdAt: Date;
            name: string | null;
            email: string;
            membership: string;
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
