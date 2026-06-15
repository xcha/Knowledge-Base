import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgentService } from './agent.service';
import type { AuthRequest } from '../common/types';
import { AgentChatDto } from './dto/agent-chat.dto';

@UseGuards(JwtAuthGuard)
@Controller('knowledge/:kbId/agent')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Post('chat')
  async agentChat(
    @Param('kbId') kbId: string,
    @Request() req: AuthRequest,
    @Body() dto: AgentChatDto,
    @Res() res: Response,
  ) {
    await this.agentService.agentStream(
      kbId,
      req.user.id,
      dto.question,
      dto.sessionId,
      res,
    );
  }
}
