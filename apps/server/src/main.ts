import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 允许前端 Next.js dev server 跨域访问
  app.enableCors({ origin: 'http://localhost:3000', credentials: true });

  // 全局校验管道：自动验证 @Body() DTO 的字段
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剔除 DTO 里未声明的字段
      transform: true, // 自动类型转换（如 string → number）
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}/api`);
}
bootstrap();
