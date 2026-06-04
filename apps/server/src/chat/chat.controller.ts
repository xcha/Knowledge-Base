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

  @Delete(':sessionId')
  deleteSession(@Param('sessionId') sessionId: string) {
    return this.chatService.deleteSession(sessionId);
  }

  @Get(':sessionId/messages')
  getMessages(@Param('sessionId') sessionId: string) {
    return this.chatService.getSessionMessages(sessionId);
  }

  @Post(':sessionId/chat')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthRequest,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    await this.chatService.chatStream(sessionId, req.user.id, dto.question, res);
  }
}
