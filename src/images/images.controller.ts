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

  @Post('generate')
  async generateImage(@Body('prompt') prompt: string) {
    if (!prompt) {
      throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
    }

    const image = await this.imagesService.generateImage(prompt);
    return { id: image.id, stampImg: image.stampImg, previewImg: image.previewImg };
  }

  @Post('sketch')
  @UseInterceptors(FileInterceptor('sketch'))
  async generateImageFromSketch(
    @Body('prompt') prompt: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!prompt || !file) {
      throw new HttpException('Prompt and sketch are required', HttpStatus.BAD_REQUEST);
    }

    const sketchImg = file.buffer.toString('base64');
    const image = await this.imagesService.generateImageFromSketch(prompt, sketchImg);
    return { id: image.id, stampImg: image.stampImg, previewImg: image.previewImg };
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
  getAllImages() {
    return this.imagesService.getAllImages();
  }

  @Get(':id')
  getImageById(@Param('id') id: string) {
    const image = this.imagesService.getImageById(id);
    if (!image) {
      throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
    }
    return image;
  }

  @Delete(':id')
  deleteImageById(@Param('id') id: string) {
    const deleted = this.imagesService.deleteImageById(id);
    if (!deleted) {
      throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Image deleted successfully' };
  }

  @Delete()
  deleteAllImages() {
    return this.imagesService.deleteAllImages();
  }
}
