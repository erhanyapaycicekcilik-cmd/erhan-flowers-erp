import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class WebCustomerGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    const auth = req.headers['authorization'] as string | undefined
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Token gerekli')

    try {
      const payload = this.jwt.verify(auth.slice(7))
      req.customerId = payload.sub
      return true
    } catch {
      throw new UnauthorizedException('Geçersiz token')
    }
  }
}
