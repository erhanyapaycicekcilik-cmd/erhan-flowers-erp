import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const key = request.headers['x-internal-key'];
    const expected = process.env.INTERNAL_SYNC_KEY;
    if (!expected || key !== expected) throw new UnauthorizedException('Geçersiz internal key');
    return true;
  }
}
