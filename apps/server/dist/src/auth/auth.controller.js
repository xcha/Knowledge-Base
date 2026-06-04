"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const send_sms_dto_1 = require("./dto/send-sms.dto");
const register_phone_dto_1 = require("./dto/register-phone.dto");
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    getCaptcha(res) {
        const { id, svg } = this.auth.generateCaptcha();
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('X-Captcha-Id', id);
        res.send(svg);
    }
    async sendSms(dto) {
        if (dto.captchaId && dto.captchaAnswer) {
            const valid = this.auth.verifyCaptcha(dto.captchaId, dto.captchaAnswer);
            if (!valid) {
                return { success: false, message: '图片验证码错误' };
            }
        }
        return this.auth.sendSmsCode(dto.phone, dto.type ?? 'register');
    }
    register(dto) {
        return this.auth.register(dto.email, dto.password, dto.name);
    }
    registerPhone(dto) {
        return this.auth.registerByPhone(dto.phone, dto.smsCode, dto.password, dto.captchaId, dto.captchaAnswer);
    }
    login(dto) {
        return this.auth.login(dto.email, dto.password);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('captcha'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getCaptcha", null);
__decorate([
    (0, common_1.Post)('send-sms'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_sms_dto_1.SendSmsDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendSms", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('register-phone'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_phone_dto_1.RegisterPhoneDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "registerPhone", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map