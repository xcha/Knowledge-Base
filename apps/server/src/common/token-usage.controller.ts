import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TokenUsageService } from './token-usage.service';
import type { AuthRequest } from './types';

@UseGuards(JwtAuthGuard)
@Controller('token-usage')
export class TokenUsageController {
  constructor(private tokenUsage: TokenUsageService) {}

  @Get('stats')
  getStats(@Request() req: AuthRequest) {
    return this.tokenUsage.getUserStats(req.user.id);
  }
}
