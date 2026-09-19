import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { ShopCategoriesService } from './shop-categories.service'
import { AuthGuard } from '../auth/auth.guard'

@Controller('shop-categories')
@UseGuards(AuthGuard)
export class ShopCategoriesController {
  constructor(private readonly service: ShopCategoriesService) {}

  @Get()
  list() { return this.service.list() }

  @Post()
  create(@Body() body: any) { return this.service.create(body) }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.service.update(id, body) }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id) }
}
