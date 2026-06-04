import { IsString, IsOptional } from 'class-validator';

export class CreateKbDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
