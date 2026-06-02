import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import { AuthRequest } from '../common/types';

@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(private payment: PaymentService) {}

  // 获取价格列表（公开信息，但登录后可调）
  @Get('prices')
  getPrices() {
    return this.payment.getPriceList();
  }

  // 获取配额配置
  @Get('quotas')
  getQuotas() {
    return this.payment.getQuotaConfig();
  }

  // 创建支付订单
  @Post('orders')
  createOrder(
    @Request() req: AuthRequest,
    @Body() body: { membership: string; durationMonths: number },
  ) {
    return this.payment.createOrder(
      req.user.id,
      body.membership,
      body.durationMonths,
    );
  }

  // 支付成功回调（沙箱模式下前端模拟支付后调用）
  @Post('callback/:outTradeNo')
  handleCallback(@Param('outTradeNo') outTradeNo: string) {
    return this.payment.handlePaymentSuccess(outTradeNo);
  }

  // 用户订单列表
  @Get('orders')
  listOrders(@Request() req: AuthRequest) {
    return this.payment.getUserOrders(req.user.id);
  }
}
