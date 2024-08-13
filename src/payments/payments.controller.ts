import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentStatus } from 'src/enums/payment.enum';
import { Request, Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('/create')
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    try {
      return await this.paymentsService.create(createPaymentDto);
    } catch (error) {
      throw new HttpException(
        'Failed to create payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/notification')
  async handleNotification(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
  ) {
    const isValid = this.paymentsService.verifyWebhookAuthenticity(req);

    if (!isValid) {
      return res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
    }

    const { topic, resource, action, data } = req.body;

    try {
      if (topic === 'payment' && resource) {
        const paymentId = resource.split('/').pop();
        const paymentDetails =
          await this.paymentsService.getPaymentDetails(paymentId);
        console.log(
          'NOTIFICATION: Payment details:',
          JSON.stringify(paymentDetails, null, 2),
        );

        if (paymentDetails.status === 'approved') {
          await this.paymentsService.handleSuccessfulPayment(
            paymentDetails.external_reference,
            paymentDetails.payer.email,
          );
          return res.status(HttpStatus.OK).send('Payment processed');
        } else {
          console.warn('Payment not approved:', paymentDetails.status);
          return res.status(HttpStatus.OK).send('Payment not approved');
        }
      } else if (topic === 'merchant_order' && resource) {
        const orderId = resource.split('/').pop();
        // Handle merchant order notifications here if needed
        return res.status(HttpStatus.OK).send('Merchant order processed');
      } else {
        console.warn('Invalid notification payload');
        return res
          .status(HttpStatus.BAD_REQUEST)
          .send('Invalid notification payload');
      }
    } catch (error) {
      console.error('Error handling notification:', error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send('Error handling notification');
    }
  }

  @Post('image/:imageId')
  async createPaymentForImage(
    @Param('imageId') imageId: string,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    if (!imageId || !createPaymentDto) {
      throw new HttpException('Invalid input', HttpStatus.BAD_REQUEST);
    }

    try {
      const updatedImage = await this.paymentsService.createPaymentForImage(
        imageId,
        createPaymentDto,
      );
      return updatedImage;
    } catch (error) {
      throw new HttpException(
        'Failed to create payment and update image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.paymentsService.findAll();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve payments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.paymentsService.findOne(+id);
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve payment with id ${id}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':imageId/status')
  async updatePaymentStatus(
    @Param('imageId') imageId: string,
    @Body('status') status: PaymentStatus,
  ) {
    if (!imageId || !status) {
      throw new HttpException('Invalid input', HttpStatus.BAD_REQUEST);
    }

    try {
      const updatedImage = await this.paymentsService.updatePayment(
        imageId,
        status,
      );
      return updatedImage;
    } catch (error) {
      throw new HttpException(
        'Failed to update payment status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.paymentsService.remove(+id);
    } catch (error) {
      throw new HttpException(
        `Failed to remove payment with id ${id}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
