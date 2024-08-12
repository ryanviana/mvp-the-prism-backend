// create-payment.dto.ts

export class CreatePaymentDto {
  itemTitle: string;
  itemPrice: number;
  backUrlSuccess: string;
  external_reference: string;
  notificationUrl: string;
}
