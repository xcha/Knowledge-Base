import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import type { AuthRequest } from '../common/types';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('knowledge/:kbId/sessions')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  createSession(
    @Param('kbId') kbId: string,
    @Request() req: AuthRequest,
    @Body() dto: CreateSessionDto,
  ) {
    return this.chatService.createSession(kbId, req.user.id, dto.title);
  }

  @Get()
  listSessions(@Param('kbId') kbId: string, @Request() req: AuthRequest) {
    return this.chatService.listSessions(kbId, req.user.id);
  }

  @Patch(':sessionId')
  renameSession(
    @Param('kbId') kbId: string,
    @Param('sessionId') sessionId: string,
    @Request() req: AuthRequest,
    @Body() body: { title: string },
  ) {
    return this.chatService.renameSession(
      sessionId,
      req.user.id,
      kbId,
      body.title,
    );
  }

  @Delete(':sessionId')
  deleteSession(
    @Param('kbId') kbId: string,
    @Param('sessionId') sessionId: string,
    @Request() req: AuthRequest,
  ) {
    return this.chatService.deleteSession(sessionId, req.user.id, kbId);
  }

  @Get(':sessionId/messages')
  getMessages(
    @Param('kbId') kbId: string,
    @Param('sessionId') sessionId: string,
    @Request() req: AuthRequest,
  ) {
    return this.chatService.getSessionMessages(sessionId, req.user.id, kbId);
  }

  @Post(':sessionId/chat')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthRequest,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    await this.chatService.chatStream(
      sessionId,
      req.user.id,
      dto.question,
      res,
      dto.model,
    );
  }

  // 消息反馈（点赞/踩）
  @Post(':sessionId/messages/:msgId/feedback')
  feedback(
    @Param('msgId') msgId: string,
    @Request() req: AuthRequest,
    @Body() body: { type: 'like' | 'dislike'; comment?: string },
  ) {
    return this.chatService.feedbackMessage(
      msgId,
      req.user.id,
      body.type,
      body.comment,
    );
  }

  @Get(':sessionId/messages/:msgId/feedback')
  getFeedback(@Param('msgId') msgId: string) {
    return this.chatService.getMessageFeedback(msgId);
  }
}
