import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiServerModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CircuitBreakerInterceptor } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(ApiServerModule);

  app.useGlobalInterceptors(new CircuitBreakerInterceptor());

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Enable global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configure Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Rephole API')
    .setDescription(
      'REST API for repository ingestion with AI-powered processing. ' +
        'Supports Git repository analysis.',
    )
    .setVersion('1.0.0')
    .addTag('Ingestions', 'Document and repository ingestion endpoints')
    .addTag('Health', 'Health check and monitoring endpoints')
    .addTag('Jobs', 'Monitoring and execute actions on job endpoints')
    .addTag('Queries', 'Query search endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Rephole Ingestion API Documentation',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(
    `🚀 Rephole Ingestion API Application is running on: http://localhost:${port}`,
  );
  console.log(
    `📚 Rephole Ingestion API Swagger documentation: http://localhost:${port}/api-docs`,
  );
}

bootstrap();
