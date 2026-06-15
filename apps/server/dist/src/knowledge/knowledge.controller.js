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
const create_kb_dto_1 = require("./dto/create-kb.dto");
const { PDFParse } = require('pdf-parse');
async function extractText(file) {
    if (file.mimetype === 'application/pdf' ||
        file.originalname.endsWith('.pdf')) {
        const pdf = new PDFParse(new Uint8Array(file.buffer));
        const result = await pdf.getText();
        return result.text;
    }
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
    create(req, dto) {
        return this.knowledge.createKnowledgeBase(req.user.id, dto.name, dto.description);
    }
    list(req) {
        return this.knowledge.listKnowledgeBases(req.user.id);
    }
    updateKb(id, req, body) {
        return this.knowledge.updateKnowledgeBase(id, req.user.id, body);
    }
    deleteKb(id, req) {
        return this.knowledge.deleteKnowledgeBase(id, req.user.id);
    }
    async uploadDocument(knowledgeBaseId, req, file, tags) {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const content = await extractText(file);
        return this.knowledge.uploadDocument(knowledgeBaseId, req.user.id, file, content, tags);
    }
    listDocuments(knowledgeBaseId, req, tag, folder) {
        return this.knowledge.listDocuments(knowledgeBaseId, req.user.id, tag, folder);
    }
    getFolders(knowledgeBaseId, req) {
        return this.knowledge.getAllFolders(knowledgeBaseId, req.user.id);
    }
    renameDocument(docId, req, body) {
        return this.knowledge.renameDocument(docId, req.user.id, body.originalName);
    }
    updateFolder(docId, req, body) {
        return this.knowledge.updateDocumentFolder(docId, req.user.id, body.folder);
    }
    updateContent(docId, req, body) {
        return this.knowledge.updateDocumentContent(docId, req.user.id, body.content);
    }
    getDocumentContent(docId, req) {
        return this.knowledge.getDocumentContent(docId, req.user.id);
    }
    getSuggestedQuestions(knowledgeBaseId, req) {
        return this.knowledge.getSuggestedQuestions(knowledgeBaseId, req.user.id);
    }
    getTags(knowledgeBaseId, req) {
        return this.knowledge.getAllTags(knowledgeBaseId, req.user.id);
    }
    updateTags(docId, req, body) {
        return this.knowledge.updateDocumentTags(docId, req.user.id, body.tags);
    }
    hybridSearch(knowledgeBaseId, req, query, topK) {
        return this.knowledge.hybridSearch(knowledgeBaseId, req.user.id, query, topK ? parseInt(topK, 10) : 5);
    }
    search(knowledgeBaseId, req, query, topK) {
        return this.knowledge.searchDocuments(knowledgeBaseId, req.user.id, query, topK ? parseInt(topK, 10) : 5);
    }
    getVersions(docId, req) {
        return this.knowledge.getDocumentVersions(docId, req.user.id);
    }
    getGraph(knowledgeBaseId, req) {
        return this.knowledge.getKnowledgeGraph(knowledgeBaseId, req.user.id);
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
    __metadata("design:paramtypes", [Object, create_kb_dto_1.CreateKbDto]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "updateKb", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "deleteKb", null);
__decorate([
    (0, common_1.Post)(':id/documents'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: undefined })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)('tags')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)(':id/documents'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('tag')),
    __param(3, (0, common_1.Query)('folder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Get)(':id/folders'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "getFolders", null);
__decorate([
    (0, common_1.Patch)(':id/documents/:docId'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "renameDocument", null);
__decorate([
    (0, common_1.Patch)(':id/documents/:docId/folder'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "updateFolder", null);
__decorate([
    (0, common_1.Patch)(':id/documents/:docId/content'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "updateContent", null);
__decorate([
    (0, common_1.Get)(':id/documents/:docId/content'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "getDocumentContent", null);
__decorate([
    (0, common_1.Get)(':id/suggested-questions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "getSuggestedQuestions", null);
__decorate([
    (0, common_1.Get)(':id/tags'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "getTags", null);
__decorate([
    (0, common_1.Post)(':id/documents/:docId/tags'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "updateTags", null);
__decorate([
    (0, common_1.Get)(':id/hybrid-search'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('topK')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "hybridSearch", null);
__decorate([
    (0, common_1.Get)(':id/search'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('topK')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(':id/documents/:docId/versions'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "getVersions", null);
__decorate([
    (0, common_1.Get)(':id/graph'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "getGraph", null);
__decorate([
    (0, common_1.Delete)(':id/documents/:docId'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], KnowledgeController.prototype, "deleteDocument", null);
exports.KnowledgeController = KnowledgeController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('knowledge'),
    __metadata("design:paramtypes", [knowledge_service_1.KnowledgeService])
], KnowledgeController);
//# sourceMappingURL=knowledge.controller.js.map