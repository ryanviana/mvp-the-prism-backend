import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PaymentStatus } from 'src/enums/payment.enum';

export type ImageDocument = Image & Document;

@Schema()
export class Image {
  @Prop({ required: true })
  prompt: string;

  @Prop()
  stampImg: string;

  @Prop({ required: true })
  previewImg: string;

  @Prop()
  paymentId?: string; // Field for storing payment ID

  @Prop()
  paymentEmail?: string;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus?: PaymentStatus; // Field for storing payment status with enum
}

export const ImageSchema = SchemaFactory.createForClass(Image);
