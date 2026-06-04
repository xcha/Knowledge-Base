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
  handleCallback(@Param('outTradeNo') outTradeNo: string) {
    return this.payment.handlePaymentSuccess(outTradeNo);
  }

  @Get('orders')
  listOrders(@Request() req: AuthRequest) {
    return this.payment.getUserOrders(req.user.id);
  }
}
