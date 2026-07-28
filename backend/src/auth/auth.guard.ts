import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = request.cookies?.auth_token ?? this.getBearerToken(request) ?? this.getQueryToken(request);

    if (!token) {
      throw new UnauthorizedException('Oturum bulunamadı.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Kullanıcı aktif değil.');
      }

      request.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Oturum geçersiz.');
    }
  }

  private getBearerToken(request: Request) {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice(7);
  }

  private getQueryToken(request: Request) {
    const token = request.query?.token;
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  }
}
