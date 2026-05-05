import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { ChatModule } from './chat/chat.module';
import { VectorModule } from './vector/vector.module';

@Module({
  imports: [
    // isGlobal: true 让所有模块都能用 ConfigService，无需重复 import
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    KnowledgeModule,
    ChatModule,
    VectorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
