import { Controller, Post, Get, Patch, Body, Req, UseGuards, HttpCode } from '@nestjs/common'
import { WebCustomersService, RegisterDto, LoginDto } from './web-customers.service'
import { WebCustomerGuard } from './web-customer.guard'

@Controller('web-customers')
export class WebCustomersController {
  constructor(private readonly svc: WebCustomersService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.svc.register(dto)
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.svc.login(dto)
  }

  @Get('me')
  @UseGuards(WebCustomerGuard)
  getProfile(@Req() req: any) {
    return this.svc.getProfile(req.customerId)
  }

  @Patch('me')
  @UseGuards(WebCustomerGuard)
  updateProfile(@Req() req: any, @Body() dto: Partial<RegisterDto>) {
    return this.svc.updateProfile(req.customerId, dto)
  }

  @Get('me/orders')
  @UseGuards(WebCustomerGuard)
  getOrders(@Req() req: any) {
    return this.svc.getOrders(req.customerId)
  }

  @Post('me/link-order')
  @UseGuards(WebCustomerGuard)
  linkOrder(@Req() req: any, @Body() body: { orderNumber: string }) {
    return this.svc.linkOrder(req.customerId, body.orderNumber)
  }
}
