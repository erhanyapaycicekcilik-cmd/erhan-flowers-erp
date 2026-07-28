import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ProductsService } from './products.service';

@UseGuards(AuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.products.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.products.update(Number(id), body);
  }

  @Patch(':id/passive')
  passive(@Param('id') id: string) {
    return this.products.passive(Number(id));
  }
}

