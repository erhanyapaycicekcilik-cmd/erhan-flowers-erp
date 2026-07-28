import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string, rememberMe: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { email: email?.trim().toLowerCase() },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const passwordOk = await bcrypt.compare(password ?? '', user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    const token = await this.jwt.signAsync({ sub: user.id, rememberMe });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { rememberToken: rememberMe ? token : null },
    });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
