import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';
import type { AuthRequest } from '../common/types';
import { CreateKbDto } from './dto/create-kb.dto';

async function extractText(file: Express.Multer.File): Promise<string> {
  if (
    file.mimetype === 'text/plain' ||
    file.mimetype === 'text/markdown' ||
    file.originalname.endsWith('.md') ||
    file.originalname.endsWith('.txt')
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
  ) {
    // multer 默认用 latin1 解码文件名，中文会乱码，需重新用 utf8 解码
    file.originalname = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );
    const content = await extractText(file);
    return this.knowledge.uploadDocument(knowledgeBaseId, req.user.id, file, content);
  }

  @Get(':id/documents')
  listDocuments(@Param('id') knowledgeBaseId: string, @Request() req: AuthRequest) {
    return this.knowledge.listDocuments(knowledgeBaseId, req.user.id);
  }

  @Get(':id/search')
  search(
    @Param('id') knowledgeBaseId: string,
    @Request() req: AuthRequest,
    @Query('q') query: string,
    @Query('topK') topK?: string,
  ) {
    return this.knowledge.searchDocuments(
      knowledgeBaseId,
      req.user.id,
      query,
      topK ? parseInt(topK, 10) : 5,
    );
  }

  @Delete(':id/documents/:docId')
  deleteDocument(@Param('docId') docId: string, @Request() req: AuthRequest) {
    return this.knowledge.deleteDocument(docId, req.user.id);
  }
}
