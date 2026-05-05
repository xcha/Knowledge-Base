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
import { AuthRequest } from '../common/types';

@UseGuards(JwtAuthGuard)
@Controller('knowledge/:kbId/agent')
export class AgentController {
  constructor(private agentService: AgentService) {}

  // Agent 模式问答：模型自主决定是否调用工具
  // 与 /chat 接口的区别：这里走 ReAct Agent，支持多轮工具调用
  @Post('chat')
  async agentChat(
    @Param('kbId') kbId: string,
    @Request() req: AuthRequest,
    @Body() body: { question: string; sessionId?: string },
    @Res() res: Response,
  ) {
    await this.agentService.agentStream(
      kbId,
      req.user.id,
      body.question,
      body.sessionId,
      res,
    );
  }
}
