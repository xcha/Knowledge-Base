import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global 让 PrismaService 无需在每个模块重复 import 即可注入
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
