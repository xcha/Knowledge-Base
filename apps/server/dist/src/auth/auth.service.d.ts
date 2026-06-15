import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
export declare class AuthService {
    private prisma;
    private jwt;
    private sms;
    private config;
    constructor(prisma: PrismaService, jwt: JwtService, sms: SmsService, config: ConfigService);
    generateCaptcha(): {
        id: string;
        svg: string;
    };
    verifyCaptcha(id: string, answer: string): boolean;
    sendSmsCode(phone: string, type?: string): Promise<{
        success: boolean;
    }>;
    verifySmsCode(phone: string, code: string, type: string): Promise<boolean>;
    private signTokenPair;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    register(email: string, password: string, name?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            phone: string | null;
            createdAt: Date;
            name: string | null;
            email: string;
            membership: string;
        };
    }>;
    registerByPhone(phone: string, smsCode: string | undefined, password: string, captchaId?: string, captchaAnswer?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            phone: string | null;
            createdAt: Date;
            name: string | null;
            email: string;
            membership: string;
        };
    }>;
    login(email: string, password: string): Promise<{
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
}
