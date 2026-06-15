import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import type { AuthRequest } from '../common/types';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  getProfile(@Request() req: AuthRequest) {
    return this.userService.getProfile(req.user.id);
  }

  @Get('statistics')
  getStatistics(@Request() req: AuthRequest) {
    return this.userService.getStatistics(req.user.id);
  }
}
