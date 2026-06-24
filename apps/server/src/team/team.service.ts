import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  // ---- 创建团队 ----
  async create(userId: string, name: string, description?: string) {
    const team = await this.prisma.team.create({
      data: { name, description, ownerId: userId },
    });
    // 创建者自动成为 owner 成员
    await this.prisma.teamMember.create({
      data: { teamId: team.id, userId, role: 'owner' },
    });
    return team;
  }

  // ---- 我的团队列表 ----
  async listMyTeams(userId: string) {
    return this.prisma.team.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true, knowledgeBases: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- 团队详情 ----
  async getTeam(teamId: string, userId: string) {
    await this.requireMembership(teamId, userId);
    return this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        knowledgeBases: {
          include: { _count: { select: { documents: true } } },
        },
      },
    });
  }

  // ---- 邀请成员 ----
  async inviteMember(teamId: string, ownerId: string, targetEmail: string) {
    await this.requireRole(teamId, ownerId, ['owner', 'admin']);

    const targetUser = await this.prisma.user.findUnique({
      where: { email: targetEmail },
    });
    if (!targetUser)
      throw new NotFoundException('用户不存在，请确认邮箱是否正确');

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUser.id } },
    });
    if (existing) throw new BadRequestException('该用户已在团队中');

    return this.prisma.teamMember.create({
      data: { teamId, userId: targetUser.id, role: 'member' },
    });
  }

  // ---- 移除成员 ----
  async removeMember(teamId: string, operatorId: string, targetUserId: string) {
    await this.requireRole(teamId, operatorId, ['owner', 'admin']);
    const target = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('成员不存在');
    if (target.role === 'owner')
      throw new BadRequestException('不能移除团队创建者');
    return this.prisma.teamMember.delete({ where: { id: target.id } });
  }

  // ---- 分享知识库到团队 ----
  async shareKnowledgeBase(kbId: string, userId: string, teamId: string) {
    // 检查 KB 属于该用户
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: kbId, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');
    // 检查操作者是团队成员
    await this.requireMembership(teamId, userId);

    return this.prisma.knowledgeBase.update({
      where: { id: kbId },
      data: { teamId },
    });
  }

  // ---- 取消分享 ----
  async unshareKnowledgeBase(kbId: string, userId: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: kbId, userId },
    });
    if (!kb) throw new NotFoundException('知识库不存在');
    return this.prisma.knowledgeBase.update({
      where: { id: kbId },
      data: { teamId: null },
    });
  }

  // ---- 获取团队的所有知识库 ----
  async listTeamKnowledgeBases(teamId: string, userId: string) {
    await this.requireMembership(teamId, userId);
    return this.prisma.knowledgeBase.findMany({
      where: { teamId },
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- 检查团队知识库访问权限（给 KnowledgeService 用） ----
  async canAccessKnowledgeBase(kbId: string, userId: string): Promise<boolean> {
    const kb = await this.prisma.knowledgeBase.findUnique({
      where: { id: kbId },
      select: { userId: true, teamId: true },
    });
    if (!kb) return false;
    if (kb.userId === userId) return true; // 自己的 KB
    if (!kb.teamId) return false;
    // 检查是否是团队成员
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: kb.teamId, userId } },
    });
    return !!member;
  }

  // ---- 权限辅助 ----
  private async requireMembership(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) throw new ForbiddenException('你不是该团队成员');
  }

  private async requireRole(teamId: string, userId: string, roles: string[]) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('权限不足');
    }
  }
}
