import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

@Module({
  imports: [
    WinstonModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, context, stack }) => {
                const contextStr = context ? `[${context}]` : '';
                const stackStr = stack ? `\n${stack}` : '';
                return `${timestamp} ${level} ${contextStr} ${message}${stackStr}`;
              },
            ),
          ),
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class CoreLoggingModule {}
