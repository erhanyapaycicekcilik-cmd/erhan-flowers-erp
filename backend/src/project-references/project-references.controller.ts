import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { ProjectReferencesService } from './project-references.service'

// Public endpoint — site için
@Controller('public/references')
export class ProjectReferencesPublicController {
  constructor(private readonly svc: ProjectReferencesService) {}

  @Get()
  list() { return this.svc.listPublic() }
}

// Admin endpoint — ERP için
@Controller('project-references')
@UseGuards(AuthGuard)
export class ProjectReferencesController {
  constructor(private readonly svc: ProjectReferencesService) {}

  @Get()
  list() { return this.svc.listAdmin() }

  @Post()
  create(@Body() body: any) { return this.svc.create(body) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(Number(id), body) }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(Number(id)) }
}
