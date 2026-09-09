import { Body, Controller, Get, Param, Patch, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CategoriesService } from './categories.service';

@UseGuards(AuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.list();
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: { trendyolCategoryId?: number | null }) {
    return this.categories.update(id, body);
  }
}

