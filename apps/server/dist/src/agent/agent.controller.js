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
exports.AgentController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const agent_service_1 = require("./agent.service");
const agent_chat_dto_1 = require("./dto/agent-chat.dto");
let AgentController = class AgentController {
    agentService;
    constructor(agentService) {
        this.agentService = agentService;
    }
    async agentChat(kbId, req, dto, res) {
        await this.agentService.agentStream(kbId, req.user.id, dto.question, dto.sessionId, res);
    }
};
exports.AgentController = AgentController;
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Param)('kbId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, agent_chat_dto_1.AgentChatDto, Object]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "agentChat", null);
exports.AgentController = AgentController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('knowledge/:kbId/agent'),
    __metadata("design:paramtypes", [agent_service_1.AgentService])
], AgentController);
//# sourceMappingURL=agent.controller.js.map