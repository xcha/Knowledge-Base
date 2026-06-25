import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { ChatModule } from './chat/chat.module';
import { VectorModule } from './vector/vector.module';
import { AgentModule } from './agent/agent.module';
import { PaymentModule } from './payment/payment.module';
import { UserModule } from './user/user.module';
import { TeamModule } from './team/team.module';
import { SmsModule } from './sms/sms.module';
import { MailModule } from './mail/mail.module';
import { AdminModule } from './admin/admin.module';
import { TokenUsageService } from './common/token-usage.service';
import { TokenUsageController } from './common/token-usage.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    KnowledgeModule,
    ChatModule,
    VectorModule,
    AgentModule,
    PaymentModule,
    UserModule,
    TeamModule,
    SmsModule,
    MailModule,
    AdminModule,
  ],
  controllers: [AppController, TokenUsageController],
  providers: [AppService, TokenUsageService],
  exports: [TokenUsageService],
})
export class AppModule {}
