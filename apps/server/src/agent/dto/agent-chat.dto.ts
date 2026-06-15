import { IsString, IsOptional } from 'class-validator';

export class AgentChatDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
