import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  role?: string;
};

@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    if (request.user?.role === 'OWNER') return true;
    throw new ForbiddenException('Bu bölümü sadece sistem sahibi görebilir.');
  }
}
