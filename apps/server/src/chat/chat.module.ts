import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { VectorModule } from '../vector/vector.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { TokenUsageService } from '../common/token-usage.service';

@Module({
  imports: [VectorModule, KnowledgeModule],
  providers: [ChatService, TokenUsageService],
  controllers: [ChatController],
})
export class ChatModule {}
