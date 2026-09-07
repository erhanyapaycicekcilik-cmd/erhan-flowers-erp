import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.headers['x-admin-token'] as string | undefined;
    const secret = process.env.ADMIN_SECRET_PASSWORD;
    if (!secret || !token || token !== secret) {
      throw new UnauthorizedException('Admin erişimi reddedildi.');
    }
    return true;
  }
}
