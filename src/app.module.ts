// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ImagesModule } from './images/images.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the module available globally
    }),
    MongooseModule.forRoot(process.env.MONGO_URI), // Load MongoDB URI from .env
    ImagesModule,
  ],
})
export class AppModule {}
