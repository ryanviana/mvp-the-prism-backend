import { IsString } from 'class-validator';

export class CreateImageDto {
  @IsString()
  readonly prompt: string;

  @IsString()
  readonly stampImg: string;

  @IsString()
  readonly previewImg: string;
}
