"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const knowledge_module_1 = require("./knowledge/knowledge.module");
const chat_module_1 = require("./chat/chat.module");
const vector_module_1 = require("./vector/vector.module");
const agent_module_1 = require("./agent/agent.module");
const payment_module_1 = require("./payment/payment.module");
const user_module_1 = require("./user/user.module");
const team_module_1 = require("./team/team.module");
const sms_module_1 = require("./sms/sms.module");
const mail_module_1 = require("./mail/mail.module");
const admin_module_1 = require("./admin/admin.module");
const token_usage_service_1 = require("./common/token-usage.service");
const token_usage_controller_1 = require("./common/token-usage.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            knowledge_module_1.KnowledgeModule,
            chat_module_1.ChatModule,
            vector_module_1.VectorModule,
            agent_module_1.AgentModule,
            payment_module_1.PaymentModule,
            user_module_1.UserModule,
            team_module_1.TeamModule,
            sms_module_1.SmsModule,
            mail_module_1.MailModule,
            admin_module_1.AdminModule,
        ],
        controllers: [app_controller_1.AppController, token_usage_controller_1.TokenUsageController],
        providers: [app_service_1.AppService, token_usage_service_1.TokenUsageService],
        exports: [token_usage_service_1.TokenUsageService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map