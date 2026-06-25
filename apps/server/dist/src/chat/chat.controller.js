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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const chat_service_1 = require("./chat.service");
const create_session_dto_1 = require("./dto/create-session.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
let ChatController = class ChatController {
    chatService;
    constructor(chatService) {
        this.chatService = chatService;
    }
    createSession(kbId, req, dto) {
        return this.chatService.createSession(kbId, req.user.id, dto.title);
    }
    listSessions(kbId, req) {
        return this.chatService.listSessions(kbId, req.user.id);
    }
    renameSession(kbId, sessionId, req, body) {
        return this.chatService.renameSession(sessionId, req.user.id, kbId, body.title);
    }
    deleteSession(kbId, sessionId, req) {
        return this.chatService.deleteSession(sessionId, req.user.id, kbId);
    }
    getMessages(kbId, sessionId, req) {
        return this.chatService.getSessionMessages(sessionId, req.user.id, kbId);
    }
    async sendMessage(sessionId, req, dto, res) {
        await this.chatService.chatStream(sessionId, req.user.id, dto.question, res, dto.model);
    }
    feedback(msgId, req, body) {
        return this.chatService.feedbackMessage(msgId, req.user.id, body.type, body.comment);
    }
    getFeedback(msgId) {
        return this.chatService.getMessageFeedback(msgId);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('kbId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_session_dto_1.CreateSessionDto]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('kbId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "listSessions", null);
__decorate([
    (0, common_1.Patch)(':sessionId'),
    __param(0, (0, common_1.Param)('kbId')),
    __param(1, (0, common_1.Param)('sessionId')),
    __param(2, (0, common_1.Request)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "renameSession", null);
__decorate([
    (0, common_1.Delete)(':sessionId'),
    __param(0, (0, common_1.Param)('kbId')),
    __param(1, (0, common_1.Param)('sessionId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "deleteSession", null);
__decorate([
    (0, common_1.Get)(':sessionId/messages'),
    __param(0, (0, common_1.Param)('kbId')),
    __param(1, (0, common_1.Param)('sessionId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)(':sessionId/chat'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, send_message_dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)(':sessionId/messages/:msgId/feedback'),
    __param(0, (0, common_1.Param)('msgId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "feedback", null);
__decorate([
    (0, common_1.Get)(':sessionId/messages/:msgId/feedback'),
    __param(0, (0, common_1.Param)('msgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getFeedback", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('knowledge/:kbId/sessions'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map