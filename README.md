# The Prism Backend

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)

NestJS backend API for **The Prism**, an AI-powered custom t-shirt design platform. Users describe a design in plain text, the API generates a photorealistic t-shirt preview using Stability AI inpainting, extracts a standalone print-ready stamp, processes payment through MercadoPago, and emails the final design file to the buyer upon confirmation.

**Frontend:** [ryanviana/the-prism](https://github.com/ryanviana/the-prism)

## Architecture

The application is organized into two NestJS modules:

- **ImagesModule** -- AI-powered image generation (Stability AI Stable Diffusion inpainting, background removal, image erasing) and full CRUD for image records stored in MongoDB.
- **PaymentsModule** -- MercadoPago payment preference creation, webhook handling for payment notifications, and automated email delivery of print-ready designs via Gmail SMTP.

```
src/
  app.module.ts             # Root module (ConfigModule, MongooseModule)
  main.ts                   # Bootstrap, CORS config, listens on port 3000
  enums/
    payment.enum.ts         # PaymentStatus: PENDING | APPROVED | REJECTED | EXPIRED
  schemas/
    image.schema.ts         # Mongoose schema (prompt, previewImg, stampImg, payment fields)
  images/
    images.module.ts
    images.controller.ts    # /images endpoints
    images.service.ts       # Stability AI integration
    base-images/            # T-shirt mockup + mask PNGs for inpainting
    dto/
  payments/
    payments.module.ts
    payments.controller.ts  # /payments endpoints
    payments.service.ts     # MercadoPago + Nodemailer integration
    dto/
```

## How It Works

1. **Generate preview** -- The user submits a text prompt. The service uses Stability AI's inpainting endpoint to paint the described design onto a t-shirt mockup image using a mask, then stores the result in MongoDB and returns a base64 preview.
2. **Extract stamp** -- The preview is processed through Stability AI's erase endpoint with an inverted mask to isolate the design area, followed by automatic background removal, producing a standalone print-ready stamp image.
3. **Create payment** -- A MercadoPago payment preference is created for the design. The image record is updated with payment ID, status, and payer email.
4. **Webhook confirmation** -- When MercadoPago sends an approved payment notification, the service marks the payment as approved and emails the print-ready stamp PNG to the buyer as an attachment.

## API Endpoints

### Images

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/images/txt2shirt/preview` | Generate a t-shirt preview from a text prompt |
| `POST` | `/images/txt2shirt/stamp/:id` | Extract the standalone stamp design from a preview |
| `POST` | `/images/remove-background` | Remove the background from an uploaded image (multipart) |
| `GET` | `/images` | List all images |
| `GET` | `/images/:id` | Get a single image by ID |
| `GET` | `/images/:id/paymentInfo` | Get payment info for an image |
| `DELETE` | `/images/:id` | Delete an image by ID |
| `DELETE` | `/images` | Delete all images |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payments/create` | Create a MercadoPago payment preference |
| `POST` | `/payments/image/:imageId` | Create a payment linked to a specific image |
| `POST` | `/payments/notification` | MercadoPago webhook for payment notifications |
| `GET` | `/payments` | List all payments |
| `GET` | `/payments/:id` | Get a payment by ID |
| `PATCH` | `/payments/:imageId/status` | Update payment status for an image |
| `DELETE` | `/payments/:id` | Delete a payment by ID |

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** NestJS 10
- **Database:** MongoDB via Mongoose 8
- **AI:** Stability AI API (Stable Diffusion inpainting, erase, background removal)
- **Payments:** MercadoPago SDK
- **Email:** Nodemailer with Gmail SMTP
- **Validation:** class-validator, class-transformer
- **HTTP Client:** Axios
- **File Uploads:** Multer

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm
- MongoDB instance
- [Stability AI API key](https://platform.stability.ai/)
- [MercadoPago API key](https://www.mercadopago.com.br/developers/)
- Gmail account with an app password for SMTP

### Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://localhost:27017/the-prism
STABILITY_API_KEY=your_stability_api_key

MERCADOPAGO_API_KEY=your_mercadopago_access_token

MAN_T_SHIRT=src/images/base-images/man-shirt.png
MAN_T_SHIRT_MASK=src/images/base-images/man-shirt-mask.png
MAN_T_SHIRT_INVERTED_MASK=src/images/base-images/man-shirt-inverted-mask.png

EMAIL_LOGIN=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

### Installation

```bash
npm install
```

### Running

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The server starts on port **3000** by default.

### Testing

```bash
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report
```

## License

This project is unlicensed (private).
