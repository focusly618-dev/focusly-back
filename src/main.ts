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
    origin: [
      'https://focusly-front-psi.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  await nestApp.init();
  return nestApp;
}

const ALLOWED_ORIGINS = [
  'https://focusly-front-psi.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Export the underlying server for Vercel
export default async (req: Request, res: Response) => {
  const origin = req.headers.origin as string;
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  // Always set CORS headers — even on 500 errors, so the browser shows the real error
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  );

  // Handle OPTIONS preflight immediately — skip NestJS bootstrap
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
    return;
  }

  try {
    if (!app) {
      app = await bootstrap();
    }
    const server = app.getHttpAdapter().getInstance() as (
      req: Request,
      res: Response,
    ) => void;
    server(req, res);
  } catch (error) {
    console.error('Bootstrap/handler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error
          ? error.message
          : 'Unknown error during bootstrap',
    });
  }
};

// Local development support
if (process.env.NODE_ENV !== 'production') {
  bootstrap()
    .then(async (a) => {
      await a.listen(process.env.PORT ?? 3000);
    })
    .catch((err) => console.error(err));
}
