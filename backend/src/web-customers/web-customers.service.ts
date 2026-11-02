import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'

export interface RegisterDto {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  birthDate?: string
  city?: string
  district?: string
  address?: string
  postalCode?: string
}

export interface LoginDto {
  email: string
  password: string
}

@Injectable()
export class WebCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.webCustomer.findUnique({ where: { email: dto.email.toLowerCase().trim() } })
    if (exists) throw new ConflictException('Bu e-posta adresi zaten kayıtlı')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const customer = await this.prisma.webCustomer.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        city: dto.city?.trim() || null,
        district: dto.district?.trim() || null,
        address: dto.address?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
      },
    })

    const token = this.jwt.sign({ sub: customer.id, email: customer.email })
    return { token, customer: this.safeCustomer(customer) }
  }

  async login(dto: LoginDto) {
    const customer = await this.prisma.webCustomer.findUnique({ where: { email: dto.email.toLowerCase().trim() } })
    if (!customer) throw new UnauthorizedException('E-posta veya şifre hatalı')

    const ok = await bcrypt.compare(dto.password, customer.passwordHash)
    if (!ok) throw new UnauthorizedException('E-posta veya şifre hatalı')

    const token = this.jwt.sign({ sub: customer.id, email: customer.email })
    return { token, customer: this.safeCustomer(customer) }
  }

  async getProfile(customerId: number) {
    const customer = await this.prisma.webCustomer.findUnique({ where: { id: customerId } })
    if (!customer) throw new NotFoundException('Müşteri bulunamadı')
    return this.safeCustomer(customer)
  }

  async updateProfile(customerId: number, dto: Partial<RegisterDto>) {
    const data: any = {}
    if (dto.firstName) data.firstName = dto.firstName.trim()
    if (dto.lastName) data.lastName = dto.lastName.trim()
    if (dto.phone !== undefined) data.phone = dto.phone?.trim() || null
    if (dto.birthDate !== undefined) data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null
    if (dto.city !== undefined) data.city = dto.city?.trim() || null
    if (dto.district !== undefined) data.district = dto.district?.trim() || null
    if (dto.address !== undefined) data.address = dto.address?.trim() || null
    if (dto.postalCode !== undefined) data.postalCode = dto.postalCode?.trim() || null

    const customer = await this.prisma.webCustomer.update({ where: { id: customerId }, data })
    return this.safeCustomer(customer)
  }

  async getOrders(customerId: number) {
    return this.prisma.webOrder.findMany({
      where: { customerId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Link an existing order to a customer by orderNumber + email match
  async linkOrder(customerId: number, orderNumber: string) {
    const customer = await this.prisma.webCustomer.findUnique({ where: { id: customerId } })
    if (!customer) throw new NotFoundException('Müşteri bulunamadı')

    const order = await this.prisma.webOrder.findFirst({
      where: { orderNumber, customerEmail: customer.email },
    })
    if (!order) throw new NotFoundException('Sipariş bulunamadı')

    return this.prisma.webOrder.update({ where: { id: order.id }, data: { customerId } })
  }

  private safeCustomer(c: any) {
    const { passwordHash: _, ...safe } = c
    return safe
  }
}
