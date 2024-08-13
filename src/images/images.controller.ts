import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { ImagesService } from './images.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('txt2shirt/preview')
  async generateImage(@Body('prompt') prompt: string) {
    if (!prompt) {
      throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
    }

    const image =
      await this.imagesService.txt2shirt_generatePreviewImage(prompt);
    return {
      id: image.id,
      previewImg: image.previewImg,
    };
  }

  @Post('txt2shirt/stamp/:id')
  async getStampFromPreviewImage(@Param('id') id: string) {
    if (!id) {
      throw new HttpException('Image ID is required', HttpStatus.BAD_REQUEST);
    }

    const image =
      await this.imagesService.txt2shirt_getStampFromPreviewImage(id);
    return { stampImg: image.stampImg };
  }

  @Post('remove-background')
  @UseInterceptors(FileInterceptor('image'))
  async removeBackground(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('Image file is required', HttpStatus.BAD_REQUEST);
    }

    const imageBase64 = file.buffer.toString('base64');
    const result = await this.imagesService.removeBackground(imageBase64);
    return { result };
  }

  @Get()
  async getAllImages() {
    return await this.imagesService.getAllImages();
  }

  @Get(':id')
  async getImageById(@Param('id') id: string) {
    const image = await this.imagesService.getImageById(id);
    if (!image) {
      throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
    }
    return image;
  }

  @Get(':id/paymentInfo')
  async getPaymentInfo(@Param('id') id: string) {
    const image = await this.imagesService.getImageById(id);
    if (!image) {
      throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
    }
    return {
      paymentId: image.paymentId,
      paymentEmail: image.paymentEmail,
      paymentStatus: image.paymentStatus,
    };
  }

  @Delete(':id')
  async deleteImageById(@Param('id') id: string) {
    const deleted = await this.imagesService.deleteImageById(id);
    if (!deleted) {
      throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Image deleted successfully' };
  }

  @Delete()
  async deleteAllImages() {
    return await this.imagesService.deleteAllImages();
  }
}
