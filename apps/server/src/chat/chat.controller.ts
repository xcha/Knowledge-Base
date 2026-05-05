import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { AuthRequest } from '../common/types';

@UseGuards(JwtAuthGuard)
@Controller('knowledge/:kbId/sessions')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  createSession(
    @Param('kbId') kbId: string,
    @Request() req: AuthRequest,
    @Body() body: { title?: string },
  ) {
    return this.chatService.createSession(kbId, req.user.id, body.title);
  }

  @Get()
  listSessions(@Param('kbId') kbId: string, @Request() req: AuthRequest) {
    return this.chatService.listSessions(kbId, req.user.id);
  }

  @Delete(':sessionId')
  deleteSession(@Param('sessionId') sessionId: string) {
    return this.chatService.deleteSession(sessionId);
  }

  @Get(':sessionId/messages')
  getMessages(@Param('sessionId') sessionId: string) {
    return this.chatService.getSessionMessages(sessionId);
  }

  // SSE 流式问答接口
  // 注意：@Res() 拿到原生 response 对象后，NestJS 不再自动处理响应，
  // 必须在 service 里手动调用 res.end()
  @Post(':sessionId/chat')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthRequest,
    @Body() body: { question: string },
    @Res() res: Response,
  ) {
    await this.chatService.chatStream(sessionId, req.user.id, body.question, res);
  }
}
