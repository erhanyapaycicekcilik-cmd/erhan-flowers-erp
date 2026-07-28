import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ModelCodesService } from './model-codes.service';

@UseGuards(AuthGuard)
@Controller('model-codes')
export class ModelCodesController {
  constructor(private readonly modelCodes: ModelCodesService) {}

  @Post('generate')
  generate(@Body() body: { categoryId: number }) {
    return this.modelCodes.generate(Number(body.categoryId));
  }
}

