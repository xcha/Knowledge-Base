"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const sms_service_1 = require("../sms/sms.service");
const bcrypt = __importStar(require("bcryptjs"));
const svgCaptcha = __importStar(require("svg-captcha"));
const crypto_1 = require("crypto");
const captchaStore = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of captchaStore) {
        if (val.expiresAt < now)
            captchaStore.delete(key);
    }
}, 5 * 60 * 1000);
let AuthService = class AuthService {
    prisma;
    jwt;
    sms;
    constructor(prisma, jwt, sms) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.sms = sms;
    }
    generateCaptcha() {
        const captcha = svgCaptcha.create({
            size: 4,
            noise: 3,
            color: true,
            background: '#f0f0f0',
            width: 120,
            height: 42,
            fontSize: 48,
        });
        const id = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        captchaStore.set(id, {
            text: captcha.text.toLowerCase(),
            expiresAt: Date.now() + 5 * 60 * 1000,
        });
        return { id, svg: captcha.data };
    }
    verifyCaptcha(id, answer) {
        const record = captchaStore.get(id);
        if (!record)
            return false;
        captchaStore.delete(id);
        if (record.expiresAt < Date.now())
            return false;
        return record.text === answer.toLowerCase().trim();
    }
    async sendSmsCode(phone, type = 'register') {
        const recent = await this.prisma.smsCode.findFirst({
            where: {
                phone,
                type,
                createdAt: { gte: new Date(Date.now() - 60 * 1000) },
            },
        });
        if (recent)
            throw new common_1.BadRequestException('发送过于频繁，请60秒后再试');
        const code = String((0, crypto_1.randomInt)(100000, 1000000));
        await this.prisma.smsCode.create({
            data: {
                phone,
                code,
                type,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            },
        });
        await this.sms.sendCode(phone, code);
        console.log('短信已发送');
        return { success: true };
    }
    async verifySmsCode(phone, code, type) {
        const record = await this.prisma.smsCode.findFirst({
            where: { phone, code, type, used: false },
            orderBy: { createdAt: 'desc' },
        });
        if (!record)
            return false;
        if (record.expiresAt < new Date())
            return false;
        await this.prisma.smsCode.update({
            where: { id: record.id },
            data: { used: true },
        });
        return true;
    }
    async register(email, password, name) {
        const exists = await this.prisma.user.findUnique({ where: { email } });
        if (exists)
            throw new common_1.ConflictException('邮箱已被注册');
        const hashed = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
            data: { email, password: hashed, name },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                membership: true,
                createdAt: true,
            },
        });
        return { user, token: this.signToken(user.id, user.email) };
    }
    async registerByPhone(phone, smsCode, password, captchaId, captchaAnswer) {
        if (captchaId && captchaAnswer) {
            if (!this.verifyCaptcha(captchaId, captchaAnswer)) {
                throw new common_1.BadRequestException('图片验证码错误');
            }
        }
        if (smsCode) {
            const smsValid = await this.verifySmsCode(phone, smsCode, 'register');
            if (!smsValid)
                throw new common_1.BadRequestException('短信验证码错误或已过期');
        }
        const exists = await this.prisma.user.findUnique({ where: { phone } });
        if (exists)
            throw new common_1.ConflictException('手机号已被注册');
        const hashed = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
            data: {
                phone,
                phoneVerified: true,
                email: `${phone}@phone.user`,
                password: hashed,
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                membership: true,
                createdAt: true,
            },
        });
        return { user, token: this.signToken(user.id, user.phone ?? user.email) };
    }
    async login(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.UnauthorizedException('邮箱或密码错误');
        const valid = await bcrypt.compare(password, user.password);
        if (!valid)
            throw new common_1.UnauthorizedException('邮箱或密码错误');
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                membership: user.membership,
                membershipExpiresAt: user.membershipExpiresAt,
            },
            token: this.signToken(user.id, user.email),
        };
    }
    signToken(userId, email) {
        return this.jwt.sign({ sub: userId, email });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        sms_service_1.SmsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map