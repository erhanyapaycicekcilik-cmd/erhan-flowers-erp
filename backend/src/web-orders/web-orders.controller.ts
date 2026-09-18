import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { WebOrdersService } from './web-orders.service'
import { CreateWebOrderDto } from './dto/create-web-order.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly svc: WebOrdersService) {}

  @Post()
  create(@Body() dto: CreateWebOrderDto) {
    return this.svc.create(dto)
  }
}

@Controller('web-orders')
@UseGuards(JwtAuthGuard)
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
