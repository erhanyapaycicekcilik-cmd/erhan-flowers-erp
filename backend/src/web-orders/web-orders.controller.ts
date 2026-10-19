import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common'
import { Request, Response } from 'express'
import { WebOrdersService } from './web-orders.service'
import { TamiCallbackBody, TamiCardInput, TamiService } from './tami.service'
import { CreateWebOrderDto } from './dto/create-web-order.dto'
import { AuthGuard } from '../auth/auth.guard'

@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly svc: WebOrdersService) {}

  @Post()
  create(@Body() dto: CreateWebOrderDto) {
    return this.svc.create(dto)
  }
}

// TAMI sanal POS — AuthGuard YOK (müşteri sitesi + TAMI callback)
@Controller('public/payments/tami')
export class TamiPaymentController {
  constructor(private readonly tami: TamiService) {}

  @Get('status')
  status() {
    return { enabled: this.tami.isEnabled() }
  }

  @Post('start')
  start(@Body() body: { orderNumber: string; card: TamiCardInput }, @Req() req: Request) {
    const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? '').split(',')[0].trim()
    return this.tami.startPayment(String(body?.orderNumber ?? ''), body?.card, ip)
  }

  // Banka 3D doğrulamasından sonra TAMI bu adrese form POST eder
  @Post('callback')
  async callback(@Body() body: TamiCallbackBody, @Res() res: Response) {
    let url: string
    try {
      url = await this.tami.handleCallback(body)
    } catch {
      url = `${this.tami.siteUrl}/odeme-basarisiz?kod=sunucu_hata`
    }
    res.redirect(303, url)
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
