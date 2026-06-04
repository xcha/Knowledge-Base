import { IsString, IsInt, IsIn } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsIn(['basic', 'pro'], { message: '会员等级只能是 basic 或 pro' })
  membership: string;

  @IsInt()
  @IsIn([1, 3, 12], { message: '购买时长只能是 1 / 3 / 12 个月' })
  durationMonths: number;
}
