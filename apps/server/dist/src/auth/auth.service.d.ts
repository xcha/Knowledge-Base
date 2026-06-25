import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.service';
export declare class AuthService {
    private prisma;
    private jwt;
    private sms;
    private mail;
    private config;
    constructor(prisma: PrismaService, jwt: JwtService, sms: SmsService, mail: MailService, config: ConfigService);
    generateCaptcha(): {
        id: string;
        svg: string;
    };
    verifyCaptcha(id: string, answer: string): boolean;
    sendSmsCode(phone: string, type?: string): Promise<{
        success: boolean;
    }>;
    verifySmsCode(phone: string, code: string, type: string): Promise<boolean>;
    sendEmailCode(email: string, type?: string): Promise<{
        success: boolean;
    }>;
    verifyEmailCode(email: string, code: string, type: string): Promise<boolean>;
    private signTokenPair;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<{
        success: boolean;
    }>;
    register(email: string, password: string, name?: string, emailCode?: string): Promise<{
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
    registerByPhone(phone: string, smsCode: string | undefined, password: string, captchaId?: string, captchaAnswer?: string): Promise<{
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
