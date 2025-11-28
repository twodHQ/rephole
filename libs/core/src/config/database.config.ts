import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  postgres: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    logging: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  chroma: {
    host: string;
    port: number;
    ssl: boolean;
  };
}

export default registerAs('database', (): DatabaseConfig => {
  // Validate required environment variables
  const requiredEnvVars = [
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}. ` +
        `Please ensure these are set in your .env file or environment.`,
    );
  }

  return {
    postgres: {
      host: process.env.POSTGRES_HOST!,
      port: parseInt(process.env.POSTGRES_PORT!, 10),
      username: process.env.POSTGRES_USER!,
      password: process.env.POSTGRES_PASSWORD!,
      database: process.env.POSTGRES_DB!,
      synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true',
      logging: process.env.POSTGRES_LOGGING === 'true',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },
    chroma: {
      host: process.env.CHROMA_HOST || 'localhost',
      port: parseInt(process.env.CHROMA_PORT || '8000', 10),
      ssl: process.env.CHROMA_SSL === 'true',
    },
  };
});
