import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { WebOrdersService } from './web-orders.service'
import { CreateWebOrderDto } from './dto/create-web-order.dto'
import { AuthGuard } from '../auth/auth.guard'

@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly svc: WebOrdersService) {}

  @Post()
  create(@Body() dto: CreateWebOrderDto) {
    return this.svc.create(dto)
  }

  /** Site, TAMI tahsilatı (complete-3ds) başarılı olunca çağırır; imza: HMAC-SHA256(TAMI_SECRET_KEY, orderNumber) */
  @Post(':orderNumber/payment-confirmed')
  paymentConfirmed(
    @Param('orderNumber') orderNumber: string,
    @Headers('x-payment-signature') signature: string,
    @Body() body: { bankAuthCode?: string; amount?: number },
  ) {
    return this.svc.confirmPayment(orderNumber, signature, body ?? {})
  }
}

@Controller('web-orders')
@UseGuards(AuthGuard)
export class WebOrdersController {
  constructor(private readonly svc: WebOrdersService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.svc.findAll({ status, page: +page, limit: +limit })
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(+id)
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateStatus(+id, status)
  }
}
