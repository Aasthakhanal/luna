import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import { AuthGuard } from './guards/auth/auth.guard';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalGuards(new AuthGuard(new JwtService(), new Reflector()));

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();