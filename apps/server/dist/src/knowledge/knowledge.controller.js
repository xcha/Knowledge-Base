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
exports.KnowledgeController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const knowledge_service_1 = require("./knowledge.service");
const types_1 = require("../common/types");
async function extractText(file) {
    if (file.mimetype === 'text/plain' ||
        file.mimetype === 'text/markdown' ||
        file.originalname.endsWith('.md') ||
        file.originalname.endsWith('.txt')) {
        return file.buffer.toString('utf-8');
    }
    throw new Error(`暂不支持的文件类型: ${file.mimetype}`);
}
let KnowledgeController = class KnowledgeController {
    knowledge;
    constructor(knowledge) {
        this.knowledge = knowledge;
    }
    create(req, body) {
        return this.knowledge.createKnowledgeBase(req.user.id, body.name, body.description);
    }
    list(req) {
        return this.knowledge.listKnowledgeBases(req.user.id);
    }
    deleteKb(id, req) {
        return this.knowledge.deleteKnowledgeBase(id, req.user.id);
    }
    async uploadDocument(knowledgeBaseId, req, file) {
        const content = await extractText(file);
        return this.knowledge.uploadDocument(knowledgeBaseId, req.user.id, file, content);
    }
    listDocuments(knowledgeBaseId, req) {
        return this.knowledge.listDocuments(knowledgeBaseId, req.user.id);
    }
    deleteDocument(docId, req) {
        return this.knowledge.deleteDocument(docId, req.user.id);
    }
};
exports.KnowledgeController = KnowledgeController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [types_1.AuthRequest, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [types_1.AuthRequest]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "list", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, types_1.AuthRequest]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "deleteKb", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: undefined })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, types_1.AuthRequest, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)(':id/documents'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, types_1.AuthRequest]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Delete)(':id/documents/:docId'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, types_1.AuthRequest]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "deleteDocument", null);
exports.KnowledgeController = KnowledgeController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('knowledge'),
    __metadata("design:paramtypes", [knowledge_service_1.KnowledgeService])
], KnowledgeController);
//# sourceMappingURL=knowledge.controller.js.map