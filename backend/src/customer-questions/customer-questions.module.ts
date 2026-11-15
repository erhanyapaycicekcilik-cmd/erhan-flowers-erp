import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { CustomerQuestionsController } from './customer-questions.controller';
import { PublicWholesaleController } from './public-wholesale.controller';
import { CustomerQuestionsService } from './customer-questions.service';
import { PushNotificationService } from './push-notification.service';

@Module({
  imports: [PrismaModule, AuthModule, IntegrationsModule],
  controllers: [CustomerQuestionsController, PublicWholesaleController],
  providers: [CustomerQuestionsService, PushNotificationService],
  exports: [PushNotificationService],
})
export class CustomerQuestionsModule {}
