import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeAnalysisService } from './services/knowledge-analysis.service';
import { TextNormalizerService } from './services/text-normalizer.service';

@Module({
  imports: [AuthModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, KnowledgeAnalysisService, TextNormalizerService],
})
export class KnowledgeBaseModule {}
