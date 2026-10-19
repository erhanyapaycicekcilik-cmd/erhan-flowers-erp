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
  items!: CreateWebOrderItemDto[]
}
