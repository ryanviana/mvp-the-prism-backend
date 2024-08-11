import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import MercadoPago, { Preference } from 'mercadopago';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(private readonly configService: ConfigService) {}

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
          id: randomId, // Usando o ID aleatório gerado
          title: createPaymentDto.itemType, // Tipo de item passado no DTO
          quantity: 1,
          currency_id: 'BRL',
          unit_price: createPaymentDto.price, // Preço passado no DTO
        },
      ],
      back_urls: {
        success: createPaymentDto.backUrlSuccess, // URL de retorno para sucesso
        failure: createPaymentDto.backUrlSuccess, // URL de retorno para falha (você pode personalizar)
        pending: createPaymentDto.backUrlSuccess, // URL de retorno para pendente (você pode personalizar)
      },
      auto_return: 'approved',
      expires: true,
      expiration_date_to: new Date(
        new Date().getTime() + 30 * 60000,
      ).toISOString(), // Expiração em 30 minutos
    };

    try {
      const response = await preference.create({ body });
      return response;
    } catch (error) {
      console.error('Error creating payment preference:', error);
      throw new Error('Could not create payment preference');
    }
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
