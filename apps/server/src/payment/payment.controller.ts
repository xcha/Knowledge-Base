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
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentService } from './payment.service';
import type { AuthRequest } from '../common/types';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private payment: PaymentService) {}

  @Get('prices')
  getPrices() {
    return this.payment.getPriceList();
  }

  @Get('quotas')
  getQuotas() {
    return this.payment.getQuotaConfig();
  }

  @UseGuards(JwtAuthGuard)
  @Post('orders')
  createOrder(
    @Request() req: AuthRequest,
    @Body() dto: CreateOrderDto,
  ) {
    return this.payment.createOrder(req.user.id, dto.membership, dto.durationMonths);
  }

  /**
   * 沙箱模拟支付回调（前端直接调用）
   */
  @UseGuards(JwtAuthGuard)
  @Post('callback/:outTradeNo')
  handleCallback(
    @Param('outTradeNo') outTradeNo: string,
    @Request() req: AuthRequest,
  ) {
    return this.payment.handlePaymentSuccess(outTradeNo, req.user.id);
  }

  /**
   * 支付宝异步通知（支付宝服务器调用，无需鉴权）
   * 支付宝会 POST form-data 到此地址
   */
  @Post('notify')
  async handleAlipayNotify(@Body() body: Record<string, string>) {
    this.logger.log('收到支付宝异步通知', body.out_trade_no);

    // 验证签名（生产环境必须验证，沙箱可简化）
    // const signValid = this.alipaySdk.checkNotifySign(body);
    // if (!signValid) return 'failure';

    if (body.trade_status === 'TRADE_SUCCESS' || body.trade_status === 'TRADE_FINISHED') {
      await this.payment.handlePaymentSuccess(body.out_trade_no);
    }
    return 'success';
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  listOrders(@Request() req: AuthRequest) {
    return this.payment.getUserOrders(req.user.id);
  }
}
