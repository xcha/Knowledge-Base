import { IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  question: string;
}
