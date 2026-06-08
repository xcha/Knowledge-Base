import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import type { AuthRequest } from '../common/types';
import { CreateOrderDto } from './dto/create-order.dto';

@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(private payment: PaymentService) {}

  @Get('prices')
  getPrices() {
    return this.payment.getPriceList();
  }

  @Get('quotas')
  getQuotas() {
    return this.payment.getQuotaConfig();
  }

  @Post('orders')
  createOrder(
    @Request() req: AuthRequest,
    @Body() dto: CreateOrderDto,
  ) {
    return this.payment.createOrder(req.user.id, dto.membership, dto.durationMonths);
  }

  @Post('callback/:outTradeNo')
  handleCallback(
    @Param('outTradeNo') outTradeNo: string,
    @Request() req: AuthRequest,
  ) {
    // 只允许订单所属用户触发回调（防止任意人伪造支付）
    return this.payment.handlePaymentSuccess(outTradeNo, req.user.id);
  }

  @Get('orders')
  listOrders(@Request() req: AuthRequest) {
    return this.payment.getUserOrders(req.user.id);
  }
}
