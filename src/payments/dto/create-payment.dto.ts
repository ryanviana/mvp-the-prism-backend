// create-payment.dto.ts

export class CreatePaymentDto {
  itemTitle: string;
  itemPrice: number;
  backUrlSuccess: string;
  externalReference: string;
  notificationUrl: string;
  payerEmail: string;
}
