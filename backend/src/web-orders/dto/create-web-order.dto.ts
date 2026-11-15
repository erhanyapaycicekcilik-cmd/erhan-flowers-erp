export class CreateWebOrderItemDto {
  productId!: string
  productName!: string
  productSlug!: string
  productImage?: string
  unitPrice!: number
  quantity!: number
}

export class CreateWebOrderDto {
  paymentMethod!: 'WHATSAPP' | 'EFT' | 'ONLINE'
  customerName!: string
  customerPhone!: string
  customerEmail?: string
  city!: string
  district?: string
  address!: string
  postalCode?: string
  note?: string
  tcKimlik?: string
  faturaKurumsal?: boolean
  firmaUnvan?: string
  vergiNo?: string
  vergiDairesi?: string
  items!: CreateWebOrderItemDto[]
  customerId?: number
  /** Sadece site sunucusu (x-site-key ile) gönderebilir; doğrulanmış promosyon kodu */
  promo?: { code: string; type: 'percent' | 'fixed'; value: number }
}
