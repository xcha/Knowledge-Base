import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ========== 数据统计 ==========

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ========== 用户管理 ==========

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      parseInt(page || '1'),
      parseInt(pageSize || '20'),
      search,
    );
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Put('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      role?: string;
      membership?: string;
      membershipExpiresAt?: string;
      maxKnowledgeBases?: number;
      maxDocuments?: number;
    },
  ) {
    return this.adminService.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.adminService.resetPassword(id, body.password);
  }

  // ========== 订单管理 ==========

  @Get('orders')
  getOrders(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOrders(
      parseInt(page || '1'),
      parseInt(pageSize || '20'),
      status,
      search,
    );
  }

  @Post('orders/:id/manual-pay')
  manualPayOrder(@Param('id') id: string) {
    return this.adminService.manualPayOrder(id);
  }

  @Post('orders/:id/close')
  closeOrder(@Param('id') id: string) {
    return this.adminService.closeOrder(id);
  }

  // ========== 系统设置 ==========

  @Get('configs')
  getConfigs() {
    return this.adminService.getConfigs();
  }

  @Put('configs/:key')
  setConfig(@Param('key') key: string, @Body() body: { value: string }) {
    return this.adminService.setConfig(key, body.value);
  }

  @Delete('configs/:key')
  deleteConfig(@Param('key') key: string) {
    return this.adminService.deleteConfig(key);
  }

  // ========== 管理员初始化（无需鉴权） ==========
  // 注意：此端点在 AppModule 中单独配置，不经过此控制器的守卫
}
