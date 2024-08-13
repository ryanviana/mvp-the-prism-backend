import { Injectable, NotFoundException } from '@nestjs/common';
import MercadoPago, { Preference } from 'mercadopago';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Image, ImageDocument } from '../schemas/image.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from 'src/enums/payment.enum';
import { Request } from 'express';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

@Injectable()
export class PaymentsService {
  private readonly EMAIL_LOGIN: string;
  private readonly EMAIL_PASSWORD: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
  ) {
    this.EMAIL_LOGIN = this.configService.get<string>('EMAIL_LOGIN');
    this.EMAIL_PASSWORD = this.configService.get<string>('EMAIL_PASSWORD');
  }

  async create(createPaymentDto: CreatePaymentDto) {
    const MERCADO_PAGO_API_KEY = this.configService.get<string>(
      'MERCADOPAGO_API_KEY',
    );

    const client = new MercadoPago({ accessToken: MERCADO_PAGO_API_KEY });
    const preference = new Preference(client);

    const randomId = randomBytes(16).toString('hex');

    const body = {
      items: [
        {
          id: randomId,
          title: createPaymentDto.itemTitle,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: createPaymentDto.itemPrice,
        },
      ],
      back_urls: {
        success: createPaymentDto.backUrlSuccess,
      },
      expires: true,
      auto_return: 'approved',
      expiration_date_to: new Date(
        new Date().getTime() + 30 * 60000,
      ).toISOString(),
      external_reference: createPaymentDto.externalReference,
      notification_url: createPaymentDto.notificationUrl,
    };

    try {
      const response = await preference.create({ body });
      console.log('Payment preference created:', response);
      return response;
    } catch (error) {
      console.error('Error creating payment preference:', error);
      throw new Error('Could not create payment preference');
    }
  }

  async createPaymentForImage(
    imageId: string,
    createPaymentDto: CreatePaymentDto,
  ) {
    const paymentResponse = await this.create(createPaymentDto);

    const paymentId = paymentResponse.id; // Get the payment ID from MercadoPago response
    const paymentStatus = PaymentStatus.PENDING; // Set initial payment status

    // Update the image record with paymentId, paymentStatus, and external_reference
    const updatedImage = await this.imageModel.findByIdAndUpdate(
      imageId,
      {
        paymentId,
        paymentStatus,
        external_reference: createPaymentDto.externalReference, // Add this line
      },
      { new: true },
    );

    return updatedImage;
  }

  async updatePaymentStatus(imageId: string, status: PaymentStatus) {
    const image = await this.imageModel.findById(imageId);

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    image.paymentStatus = status;
    await image.save();
    return image;
  }

  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const MERCADO_PAGO_API_KEY = this.configService.get<string>(
        'MERCADOPAGO_API_KEY',
      );
      const response = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${MERCADO_PAGO_API_KEY}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching payment details via HTTP:', error);
      throw new Error('Failed to fetch payment details via HTTP');
    }
  }

  async handleSuccessfulPayment(
    paymentExternalReference: string,
  ): Promise<void> {
    // paymentExternalReference is the image id
    const imageId = paymentExternalReference;
    console.log(`Payment ${paymentExternalReference} was approved!`);

    // Fetch the image from the database
    const image = await this.imageModel.findById(imageId);
    if (!image) {
      throw new Error(`Image with ID ${imageId} not found`);
    }

    // Convert the stampImg from base64 to a Buffer
    const buffer = Buffer.from(image.stampImg, 'base64');

    // Send the PNG image via email using the buffer
    await this.sendEmailWithAttachment(
      'ryanvianatv@gmail.com', // Replace with the actual recipient's email address
      'Your Image is Ready',
      'Please find your image attached.',
      buffer,
      `${imageId}.png`,
    );
  }

  async sendEmailWithAttachment(
    to: string,
    subject: string,
    text: string,
    attachmentBuffer: Buffer,
    attachmentName: string,
  ): Promise<void> {
    // Configure the email transporter
    console.log('EMAIL_LOGIN', this.EMAIL_LOGIN);
    console.log('EMAIL_PASSWORD', this.EMAIL_PASSWORD);

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // use false para STARTTLS; true para SSL na porta 465
      auth: {
        user: this.EMAIL_LOGIN,
        pass: this.EMAIL_PASSWORD,
      },
    });

    // Define the email options
    const mailOptions = {
      from: this.EMAIL_LOGIN, // Sender address
      to,
      subject,
      text,
      attachments: [
        {
          filename: attachmentName,
          content: attachmentBuffer,
        },
      ],
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  }

  verifyWebhookAuthenticity(req: Request): boolean {
    return true;
  }

  findAll() {
    return `This action returns all payments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: any) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
