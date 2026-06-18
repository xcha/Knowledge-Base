import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { AdminService } from './admin/admin.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // 初始化管理员（仅首次使用，无需鉴权）
  @Post('init-admin')
  initAdmin(@Body() body: { email: string; password: string }) {
    return this.adminService.initAdmin(body.email, body.password);
  }
}
