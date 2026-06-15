import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamService } from './team.service';
import type { AuthRequest } from '../common/types';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamController {
  constructor(private team: TeamService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() body: { name: string; description?: string }) {
    return this.team.create(req.user.id, body.name, body.description);
  }

  @Get()
  listMine(@Request() req: AuthRequest) {
    return this.team.listMyTeams(req.user.id);
  }

  @Get(':id')
  getTeam(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.team.getTeam(id, req.user.id);
  }

  @Post(':id/members')
  invite(@Param('id') id: string, @Request() req: AuthRequest, @Body() body: { email: string }) {
    return this.team.inviteMember(id, req.user.id, body.email);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Request() req: AuthRequest,
  ) {
    return this.team.removeMember(id, req.user.id, targetUserId);
  }

  @Post(':id/knowledge-bases/:kbId')
  shareKb(
    @Param('id') teamId: string,
    @Param('kbId') kbId: string,
    @Request() req: AuthRequest,
  ) {
    return this.team.shareKnowledgeBase(kbId, req.user.id, teamId);
  }

  @Delete(':id/knowledge-bases/:kbId')
  unshareKb(
    @Param('kbId') kbId: string,
    @Request() req: AuthRequest,
  ) {
    return this.team.unshareKnowledgeBase(kbId, req.user.id);
  }
}
