import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import * as FormData from 'form-data';
import { Model } from 'mongoose';
import { Image, ImageDocument } from '../schemas/image.schema';

@Injectable()
export class ImagesService {
  private apiKey: string;
  private seed: number = 429431294;

  constructor(
    private configService: ConfigService,
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
  ) {
    this.apiKey = this.configService.get<string>('STABILITY_API_KEY');
  }

  async generateImage(_prompt: string): Promise<ImageDocument> {
    const defaultPrompt =
      'A minimalist and elegant design featuring a simple yet beautiful central element on a plain white background. The design is suitable for printing on a t-shirt, with limited colors, clean lines, and no distracting elements. The central element should be visually striking but not overly complex, using soft, harmonious colors that stand out against the white background.';

    const payload = {
      prompt: defaultPrompt + _prompt,
      output_format: 'webp',
    };

    try {
      const formData = new FormData();
      formData.append('prompt', _prompt);
      formData.append('output_format', 'webp');
      formData.append('seed', this.seed.toString());

      const response = await axios.postForm(
        `https://api.stability.ai/v2beta/stable-image/generate/core`,
        axios.toFormData(payload, new FormData()),
        {
          validateStatus: undefined,
          responseType: 'arraybuffer',
          headers: {
            Authorization: `Bearer sk-${this.apiKey}`,
            Accept: 'image/*',
          },
        },
      );

      if (response.status === 200) {
        const stampImgB64 = Buffer.from(response.data).toString('base64');
        const previewImgb64 = await this.generatePreviewImage(stampImgB64);
        const imagePayload = {
          prompt: _prompt,
          stampImg: stampImgB64,
          previewImg: previewImgb64,
        };
        const image = new this.imageModel(imagePayload);
        return await image.save();
      } else {
        throw new HttpException(
          `${response.status}: ${response.data.toString()}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async generatePreviewImage(stampImg: string): Promise<string> {
    const negativePrompt =
      'blurry stamp, distorted stamp, large stamp, off-center stamp, stamp on sleeves, stamp on edges, stamp on neck, partially visible stamp, rotated stamp, stamp with shadows, altered stamp, deformed t-shirt, overly complex background, abstract patterns on t-shirt, distorted t-shirt shape, t-shirt wrinkles';
    const prompt =
      'Place the stamp image conservatively on the center of a plain white t-shirt. The t-shirt should be worn by a person, and the stamp image should be clearly visible but not overly large.';

    try {
      const formData = new FormData();

      // Append the payload fields to the FormData instance
      formData.append('model', 'SD3 Medium');
      formData.append('strength', '0.75');
      formData.append('mode', 'image-to-image');
      formData.append('prompt', prompt);
      formData.append('negative_prompt', negativePrompt);
      formData.append('output_format', 'webp');
      formData.append('seed', this.seed); // Replace 'your-seed-value' with the actual seed if needed

      // Append the image as a Buffer
      formData.append('image', Buffer.from(stampImg, 'base64'), {
        filename: 'stampImg.webp',
        contentType: 'image/webp',
      });
      const response = await axios.post(
        `https://api.stability.ai/v2beta/stable-image/edit/inpaint`,
        formData,
        {
          headers: {
            Authorization: `Bearer sk-${this.apiKey}`,
            ...formData.getHeaders(), // This ensures the boundary is included
          },
          responseType: 'arraybuffer',
        },
      );

      if (response.status === 200) {
        console.log('Response successful, converting to base64');
        const base64Image = Buffer.from(response.data).toString('base64');
        return base64Image;
      } else {
        console.error(
          'API responded with an error:',
          response.status,
          response.data.toString(),
        );
        throw new HttpException(
          `${response.status}: ${response.data.toString()}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error.response) {
        // Check if the response data is a Buffer
        let errorData;
        if (Buffer.isBuffer(error.response.data)) {
          // Convert the Buffer to a string and then parse it as JSON
          const errorString = error.response.data.toString('utf8');
          try {
            errorData = JSON.parse(errorString);
          } catch (parseError) {
            console.error('Failed to parse error response:', errorString);
            errorData = { message: errorString };
          }
        } else {
          errorData = error.response.data;
        }

        console.error('API responded with an error:', errorData);
        throw new HttpException(
          `API Error: ${error.response.status} - ${errorData.name || 'Unknown Error'}\nDetails: ${JSON.stringify(errorData.errors || errorData)}`,
          HttpStatus.BAD_REQUEST,
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from the API:', error.request);
        throw new HttpException(
          'No response received from the API.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error(
          'Error occurred in setting up the request:',
          error.message,
        );
        throw new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  async generateImageFromSketch(
    prompt: string,
    sketchImg: string,
  ): Promise<ImageDocument> {
    try {
      const formData = new FormData();
      formData.append('image', Buffer.from(sketchImg, 'base64'), {
        filename: 'sketchImg.webp',
        contentType: 'image/webp',
      });
      formData.append('prompt', prompt);
      formData.append('control_strength', '0.6');
      formData.append('output_format', 'webp');

      const response = await axios.postForm(
        `https://api.stability.ai/v2beta/stable-image/control/sketch`,
        axios.toFormData(formData, new FormData()),
        {
          headers: {
            Authorization: `Bearer sk-${this.apiKey}`,
            Accept: 'image/*',
          },
          responseType: 'arraybuffer',
        },
      );

      if (response.status === 200) {
        const stampImg = Buffer.from(response.data).toString('base64');
        const previewImg = await this.generatePreviewImage(stampImg);
        const image = new this.imageModel({ prompt, stampImg, previewImg });
        return await image.save();
      } else {
        throw new HttpException(
          `${response.status}: ${response.data.toString()}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async removeBackground(imageBase64: string): Promise<ImageDocument> {
    try {
      const formData = new FormData();
      formData.append('image', Buffer.from(imageBase64, 'base64'), {
        filename: 'image.webp',
        contentType: 'image/webp',
      });
      formData.append('output_format', 'webp');

      const response = await axios.postForm(
        `https://api.stability.ai/v2beta/stable-image/edit/remove-background`,
        axios.toFormData(formData, new FormData()),
        {
          headers: {
            Authorization: `Bearer sk-${this.apiKey}`,
            Accept: 'image/*',
          },
          responseType: 'arraybuffer',
        },
      );

      if (response.status === 200) {
        const removedBackgroundImg = Buffer.from(response.data).toString(
          'base64',
        );
        const image = new this.imageModel({ removedBackgroundImg });
        return await image.save();
      } else {
        throw new HttpException(
          `${response.status}: ${response.data.toString()}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
}
