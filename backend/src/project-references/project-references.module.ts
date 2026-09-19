import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { ProjectReferencesService } from './project-references.service'
import { ProjectReferencesController, ProjectReferencesPublicController } from './project-references.controller'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProjectReferencesController, ProjectReferencesPublicController],
  providers: [ProjectReferencesService],
})
export class ProjectReferencesModule {}
