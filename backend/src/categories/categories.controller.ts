import { Body, Controller, Delete, Get, Param, Patch, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
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

  @Post()
  create(
    @Body()
    body: {
      name: string;
      codePrefix: string;
      startCode: number;
      description?: string;
      platforms?: string[];
      hasBanner?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.categories.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      trendyolCategoryId?: number | null;
      platforms?: string[];
      hasBanner?: boolean;
      sortOrder?: number;
      description?: string;
    },
  ) {
    return this.categories.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(id);
  }
}
