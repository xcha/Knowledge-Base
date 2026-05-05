import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { VectorModule } from '../vector/vector.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [VectorModule, KnowledgeModule],
  providers: [AgentService],
  controllers: [AgentController],
})
export class AgentModule {}
