import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { ValidationPipe, INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { Request, Response } from 'express';

let app: INestApplication;

async function bootstrap(): Promise<INestApplication> {
  const nestApp = await NestFactory.create(AppModule);

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  nestApp.use(cookieParser());
  nestApp.enableCors({
    origin: true,
    credentials: true,
  });

  await nestApp.init();
  return nestApp;
}

// Export the underlying server for Vercel
export default async (req: Request, res: Response) => {
  if (!app) {
    app = await bootstrap();
  }
  const server = app.getHttpAdapter().getInstance() as (
    req: Request,
    res: Response,
  ) => void;
  server(req, res);
};

// Local development support
if (process.env.NODE_ENV !== 'production') {
  bootstrap()
    .then(async (a) => {
      await a.listen(process.env.PORT ?? 3000);
    })
    .catch((err) => console.error(err));
}
