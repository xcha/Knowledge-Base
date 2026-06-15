import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 使用 nest 的 logger，确保输出可见
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // 全局请求日志
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS：支持通过环境变量配置，多个源用逗号分隔
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:3000', 'http://localhost:5000'];
  app.enableCors({ origin: corsOrigins, credentials: true });

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
  Logger.log(`Server running on http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
