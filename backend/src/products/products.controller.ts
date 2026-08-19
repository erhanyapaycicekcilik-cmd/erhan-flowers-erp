import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { GeminiContentService } from './gemini-content.service';
import { ProductsService } from './products.service';

@UseGuards(AuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly geminiContent: GeminiContentService,
  ) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.products.create(body);
  }

  @Post('gemini-seo')
  generateSeoContent(@Body() body: unknown) {
    return this.geminiContent.generate(body);
  }

  @Post('gemini-reference-search')
  generateReferenceSearch(@Body() body: unknown) {
    return this.geminiContent.generateReferenceSearch(body);
  }

  @Post('barcode')
  generateBarcode(@Body() body: unknown) {
    return this.products.generateBarcode(body);
  }

  @Post('identity-check')
  checkIdentity(@Body() body: unknown) {
    return this.products.checkIdentity(body);
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
