import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ImageDocument = Image & Document;

@Schema()
export class Image {
  @Prop()
  prompt: string;

  @Prop()
  stampImg: string;

  @Prop()
  previewImg: string;
}

export const ImageSchema = SchemaFactory.createForClass(Image);
