import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { VectorModule } from '../vector/vector.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { TokenUsageService } from '../common/token-usage.service';

@Module({
  imports: [VectorModule, KnowledgeModule],
  providers: [AgentService, TokenUsageService],
  controllers: [AgentController],
})
export class AgentModule {}
