import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SalesService } from './sales.service';

type AuthenticatedRequest = Request & { user?: { id: number; name: string; email: string; role: string } };

@UseGuards(AuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('products/search')
  searchProducts(@Query('q') query = '') {
    return this.sales.searchProducts(query);
  }

  @Get('customers/search')
  searchCustomers(@Query('q') query = '', @Query('phone') phone = '') {
    return this.sales.searchCustomers(query || phone);
  }

  @Get('crm/dashboard')
  crmDashboard() { return this.sales.crmDashboard(); }

  @Get('crm/customers')
  crmCustomers(@Query() query: Record<string, string>) { return this.sales.crmCustomers(query); }

  @Get('crm/reports')
  crmReports() { return this.sales.crmReports(); }

  @Get('crm/reminders')
  listReminders() { return this.sales.listReminders(); }

  @Post('crm/reminders')
  createReminder(@Body() body: unknown, @Req() request: AuthenticatedRequest) { return this.sales.createReminder(body, request.user!.id); }

  @Patch('crm/reminders/:id')
  updateReminder(@Param('id') id: string, @Body() body: unknown) { return this.sales.updateReminder(Number(id), body); }

  @Get('crm/sources')
  listSources() { return this.sales.listCustomerSources(); }

  @Post('crm/sources')
  createSource(@Body() body: unknown) { return this.sales.createCustomerSource(body); }

  @Patch('crm/sources/:id')
  updateSource(@Param('id') id: string, @Body() body: unknown) { return this.sales.updateCustomerSource(Number(id), body); }

  @Get('customers/:id')
  getCustomer(@Param('id') id: string) {
    return this.sales.getCustomer(Number(id));
  }

  @Post('customers')
  createCustomer(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.sales.createCustomer(body, request.user!.id);
  }

  @Get('customer-tags/list')
  listCustomerTags() {
    return this.sales.listCustomerTags();
  }

  @Post('customer-tags')
  createCustomerTag(@Body() body: unknown) {
    return this.sales.createCustomerTag(body);
  }

  @Post('customers/:id/addresses')
  addAddress(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.sales.addAddress(Number(id), body, request.user!.id);
  }

  @Post('customers/:id/notes')
  addCustomerNote(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) { return this.sales.addCustomerNote(Number(id), body, request.user!.id); }

  @Patch('customers/:id/status')
  updateCustomerStatus(@Param('id') id: string, @Body() body: unknown) { return this.sales.updateCustomerStatus(Number(id), body); }

  @Patch('customers/:id/profile')
  updateCustomerProfile(@Param('id') id: string, @Body() body: unknown) { return this.sales.updateCustomerProfile(Number(id), body); }

  @Post('customers/:id/files')
  addCustomerFile(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) { return this.sales.addCustomerFile(Number(id), body, request.user!.id); }

  @Patch('customers/:customerId/addresses/:addressId/default')
  setDefaultAddress(@Param('customerId') customerId: string, @Param('addressId') addressId: string) { return this.sales.setDefaultAddress(Number(customerId), Number(addressId)); }

  @Patch('customer-tags/:id')
  updateCustomerTag(@Param('id') id: string, @Body() body: unknown) { return this.sales.updateCustomerTag(Number(id), body); }

  @Get()
  listSales() {
    return this.sales.listSales();
  }

  @Post()
  createSale(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.sales.createSale(body, request.user!.id);
  }

  @Get('next-number')
  nextSaleNumber() {
    return this.sales.previewNextSaleNumber();
  }

  @Get(':id')
  getSale(@Param('id') id: string) {
    return this.sales.getSale(Number(id));
  }

  @Post(':id/complete')
  completeSale(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.sales.completeSale(Number(id), request.user!.id);
  }

  @Post(':id/cancel')
  cancelSale(@Param('id') id: string, @Body() body: { reason?: string }, @Req() request: AuthenticatedRequest) {
    return this.sales.cancelSale(Number(id), body.reason ?? '', request.user!.id);
  }

  @Post(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.sales.updateStatus(Number(id), body, request.user!.id);
  }

  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.sales.addPayment(Number(id), body, request.user!.id);
  }

  @Get(':id/print/address-label')
  addressLabel(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.sales.printData(Number(id), 'ADDRESS_LABEL_10X15', request.user!.id);
  }

  @Get(':id/print/delivery-form')
  deliveryForm(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.sales.printData(Number(id), 'DELIVERY_FORM_A5', request.user!.id);
  }

  @Get(':id/print/order-form')
  orderForm(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.sales.printData(Number(id), 'ORDER_FORM_A4', request.user!.id);
  }

}
