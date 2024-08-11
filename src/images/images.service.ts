import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios, { GenericFormData } from 'axios';
import * as FormData from 'form-data';
import { Model } from 'mongoose';
import { Image, ImageDocument } from '../schemas/image.schema';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class ImagesService {
  private readonly apiKey: string;
  private readonly seed = 1454315;
  private readonly manShirtPath: string;
  private readonly manShirtMaskPath: string;
  private readonly manShirtInvertedMaskPath: string;

  constructor(
    private configService: ConfigService,
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
  ) {
    this.apiKey = this.configService.get<string>('STABILITY_API_KEY');
    this.manShirtPath = join(
      process.cwd(),
      this.configService.get<string>('MAN_T_SHIRT'),
    );
    this.manShirtMaskPath = join(
      process.cwd(),
      this.configService.get<string>('MAN_T_SHIRT_MASK'),
    );
    this.manShirtInvertedMaskPath = join(
      process.cwd(),
      this.configService.get<string>('MAN_T_SHIRT_INVERTED_MASK'),
    );
  }

  async txt2shirt_generatePreviewImage(prompt: string): Promise<ImageDocument> {
    const defaultPrompt =
      'The stamp should be centered on a clean, neutral background with no surrounding elements or borders. Ensure there is a balanced space between the design and the edges of the mask, so the stamp is not too close to the edges. The stamp should be moderately sized, fitting well within the mask without appearing overly large.';
    const negativePrompt =
      'Do not include blurry or distorted lines, overly large or tiny stamps, off-center designs, or any elements that extend beyond the edges of the stamp. Avoid dark or dull colors, unnecessary background details, borders, or any extraneous elements like text or symbols. The dragon should not appear deformed, with awkward anatomy or unnatural poses, and the design should be free from excessive shadows, gradients, or noise. Ensure the stamp is not crowded, overly complex, or abstract, and avoid any artifacts or imperfections in the image.';
    const formData = new FormData();
    formData.append('prompt', prompt + defaultPrompt);
    formData.append('negative_prompt', negativePrompt);
    formData.append('image', fs.createReadStream(this.manShirtPath));
    formData.append('mask', fs.createReadStream(this.manShirtMaskPath));
    formData.append('output_format', 'png');
    formData.append('seed', this.seed);

    const response = await this.makeStabilityAiRequest(
      'v2beta/stable-image/edit/inpaint',
      'image/*',
      null,
      formData,
    );

    const previewImg = Buffer.from(response).toString('base64');
    const image = new this.imageModel({ prompt, previewImg });
    return await image.save();
  }

  async txt2shirt_getStampFromPreviewImage(
    imageId: string,
  ): Promise<ImageDocument> {
    const image = await this.getImageById(imageId);

    const imageBuffer = Buffer.from(image.previewImg, 'base64');
    const maskStream = fs.createReadStream(this.manShirtInvertedMaskPath);

    // Create FormData instance
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png',
    });
    formData.append('mask', maskStream, {
      filename: 'mask.png',
      contentType: 'image/png',
    });
    formData.append('output_format', 'png');
    formData.append('seed', this.seed);

    this.makeStabilityAiRequest;
    const response = await this.makeStabilityAiRequest(
      'v2beta/stable-image/edit/erase',
      'image/*',
      null,
      formData,
    );

    const stampImg = Buffer.from(response).toString('base64');
    const stampImgNoBkg = await this.removeBackground(stampImg);
    // const upscaledStampImg = await this.upscaleImage(stampImgNoBkg);
    image.stampImg = stampImgNoBkg;
    return await image.save();
  }

  async removeBackground(imageBase64: string): Promise<string> {
    const formData = new FormData();
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png',
    });
    formData.append('output_format', 'png');
    const response = await this.makeStabilityAiRequest(
      'v2beta/stable-image/edit/remove-background',
      'image/*',
      null,
      formData,
    );
    return Buffer.from(response).toString('base64');
  }

  async upscaleImage(imageBase64: string): Promise<string> {
    const formData = new FormData();
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png',
    });
    const response = await this.makeStabilityAiRequest(
      'v1/generation/esrgan-v1-x2plus/image-to-image/upscale',
      'image/png',
      null,
      formData,
    );
    return Buffer.from(response).toString('base64');
  }

  async getAllImages(): Promise<ImageDocument[]> {
    return this.imageModel.find().exec();
  }

  async getImageById(id: string): Promise<ImageDocument> {
    const image = await this.imageModel.findById(id).exec();
    if (!image) {
      throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
    }
    return image;
  }

  async deleteImageById(id: string): Promise<{ message: string }> {
    const result = await this.imageModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new HttpException('Image not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Image deleted successfully' };
  }

  async deleteAllImages(): Promise<{ message: string }> {
    await this.imageModel.deleteMany({}).exec();
    return { message: 'All images deleted successfully' };
  }

  private async makeStabilityAiRequest(
    endpoint: string,
    accept: string,
    payload?: object,
    formData?: FormData,
  ): Promise<Buffer> {
    try {
      let body: any = {};
      if (payload) {
        body = axios.toFormData(payload);
      }
      if (formData) {
        body = formData;
      }
      const response = await axios.postForm(
        `https://api.stability.ai/${endpoint}`,
        body,
        {
          headers: {
            Authorization: `Bearer sk-${this.apiKey}`,
            Accept: accept,
          },
          responseType: 'arraybuffer',
        },
      );

      if (response.status === 200) {
        return response.data;
      } else {
        throw new HttpException(
          `${response.status}: ${response.data.toString()}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any): never {
    if (error.response) {
      let errorData: { name?: any; errors?: any; message?: any };
      if (Buffer.isBuffer(error.response.data)) {
        const errorString = error.response.data.toString('utf8');
        try {
          errorData = JSON.parse(errorString);
        } catch {
          errorData = { message: errorString };
        }
      } else {
        errorData = error.response.data;
      }

      throw new HttpException(
        `API Error: ${error.response.status} - ${errorData.name || 'Unknown Error'}\nDetails: ${JSON.stringify(errorData.errors || errorData)}`,
        HttpStatus.BAD_REQUEST,
      );
    } else if (error.request) {
      throw new HttpException(
        'No response received from the API.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
