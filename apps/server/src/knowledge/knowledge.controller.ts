import {
  Controller, Get, Post, Delete, Patch, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';
import type { AuthRequest } from '../common/types';
import { CreateKbDto } from './dto/create-kb.dto';
const { PDFParse } = require('pdf-parse');

async function extractText(file: Express.Multer.File): Promise<string> {
  if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
    // pdf-parse v2 要求 Uint8Array，不能用 Node Buffer
    const pdf = new PDFParse(new Uint8Array(file.buffer));
    const result = await pdf.getText();
    return result.text;
  }
  if (
    file.mimetype === 'text/plain' || file.mimetype === 'text/markdown' ||
    file.originalname.endsWith('.md') || file.originalname.endsWith('.txt')
  ) {
    return file.buffer.toString('utf-8');
  }
  throw new Error(`暂不支持的文件类型: ${file.mimetype}`);
}

@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private knowledge: KnowledgeService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateKbDto) {
    return this.knowledge.createKnowledgeBase(req.user.id, dto.name, dto.description);
  }

  @Get()
  list(@Request() req: AuthRequest) {
    return this.knowledge.listKnowledgeBases(req.user.id);
  }

  @Patch(':id')
  updateKb(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.knowledge.updateKnowledgeBase(id, req.user.id, body);
  }

  @Delete(':id')
  deleteKb(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.knowledge.deleteKnowledgeBase(id, req.user.id);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  async uploadDocument(
    @Param('id') knowledgeBaseId: string,
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('tags') tags?: string,
  ) {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const content = await extractText(file);
    return this.knowledge.uploadDocument(knowledgeBaseId, req.user.id, file, content, tags);
  }

  @Get(':id/documents')
  listDocuments(
    @Param('id') knowledgeBaseId: string,
    @Request() req: AuthRequest,
    @Query('tag') tag?: string,
    @Query('folder') folder?: string,
  ) {
    return this.knowledge.listDocuments(knowledgeBaseId, req.user.id, tag, folder);
  }

  // 获取文件夹树
  @Get(':id/folders')
  getFolders(@Param('id') knowledgeBaseId: string, @Request() req: AuthRequest) {
    return this.knowledge.getAllFolders(knowledgeBaseId, req.user.id);
  }

  // 重命名文档
  @Patch(':id/documents/:docId')
  renameDocument(
    @Param('docId') docId: string,
    @Request() req: AuthRequest,
    @Body() body: { originalName: string },
  ) {
    return this.knowledge.renameDocument(docId, req.user.id, body.originalName);
  }

  // 更新文档文件夹
  @Patch(':id/documents/:docId/folder')
  updateFolder(
    @Param('docId') docId: string,
    @Request() req: AuthRequest,
    @Body() body: { folder: string },
  ) {
    return this.knowledge.updateDocumentFolder(docId, req.user.id, body.folder);
  }

  // 更新文档内容（重新分块+向量化）
  @Patch(':id/documents/:docId/content')
  updateContent(
    @Param('docId') docId: string,
    @Request() req: AuthRequest,
    @Body() body: { content: string },
  ) {
    return this.knowledge.updateDocumentContent(docId, req.user.id, body.content);
  }

  // 文档完整内容（给 AI 摘要用）
  @Get(':id/documents/:docId/content')
  getDocumentContent(
    @Param('docId') docId: string,
    @Request() req: AuthRequest,
  ) {
    return this.knowledge.getDocumentContent(docId, req.user.id);
  }

  // 文档标签
  @Get(':id/tags')
  getTags(@Param('id') knowledgeBaseId: string, @Request() req: AuthRequest) {
    return this.knowledge.getAllTags(knowledgeBaseId, req.user.id);
  }

  @Post(':id/documents/:docId/tags')
  updateTags(
    @Param('docId') docId: string,
    @Request() req: AuthRequest,
    @Body() body: { tags: string },
  ) {
    return this.knowledge.updateDocumentTags(docId, req.user.id, body.tags);
  }

  // 混合搜索
  @Get(':id/hybrid-search')
  hybridSearch(
    @Param('id') knowledgeBaseId: string,
    @Request() req: AuthRequest,
    @Query('q') query: string,
    @Query('topK') topK?: string,
  ) {
    return this.knowledge.hybridSearch(
      knowledgeBaseId, req.user.id, query,
      topK ? parseInt(topK, 10) : 5,
    );
  }

  @Get(':id/search')
  search(
    @Param('id') knowledgeBaseId: string,
    @Request() req: AuthRequest,
    @Query('q') query: string,
    @Query('topK') topK?: string,
  ) {
    return this.knowledge.searchDocuments(
      knowledgeBaseId, req.user.id, query,
      topK ? parseInt(topK, 10) : 5,
    );
  }

  // 文档版本历史
  @Get(':id/documents/:docId/versions')
  getVersions(@Param('docId') docId: string, @Request() req: AuthRequest) {
    return this.knowledge.getDocumentVersions(docId, req.user.id);
  }

  // 知识图谱
  @Get(':id/graph')
  getGraph(@Param('id') knowledgeBaseId: string, @Request() req: AuthRequest) {
    return this.knowledge.getKnowledgeGraph(knowledgeBaseId, req.user.id);
  }

  @Delete(':id/documents/:docId')
  deleteDocument(@Param('docId') docId: string, @Request() req: AuthRequest) {
    return this.knowledge.deleteDocument(docId, req.user.id);
  }
}
