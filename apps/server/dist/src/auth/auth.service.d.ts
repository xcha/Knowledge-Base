import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
export declare class AuthService {
    private prisma;
    private jwt;
    private sms;
    constructor(prisma: PrismaService, jwt: JwtService, sms: SmsService);
    generateCaptcha(): {
        id: string;
        svg: string;
    };
    verifyCaptcha(id: string, answer: string): boolean;
    sendSmsCode(phone: string, type?: string): Promise<{
        success: boolean;
    }>;
    verifySmsCode(phone: string, code: string, type: string): Promise<boolean>;
    register(email: string, password: string, name?: string): Promise<{
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
    registerByPhone(phone: string, smsCode: string | undefined, password: string, captchaId?: string, captchaAnswer?: string): Promise<{
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
    login(email: string, password: string): Promise<{
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
    private signToken;
}
