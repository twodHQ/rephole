import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerAppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Setup process-level memory monitoring to detect OOM issues early
 */
function setupMemoryMonitoring() {
  const logger = new Logger('MemoryMonitor');

  // Log memory usage every 30 seconds
  const memoryCheckInterval = setInterval(() => {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);

    // Warn if heap usage is high (>70% of total)
    const heapUsagePercent = (mem.heapUsed / mem.heapTotal) * 100;
    if (heapUsagePercent > 70) {
      logger.warn(
        `[HIGH MEMORY] Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round(heapUsagePercent)}%), RSS: ${rssMB}MB`,
      );
    } else {
      logger.debug(
        `[MEMORY] Heap: ${heapUsedMB}MB / ${heapTotalMB}MB, RSS: ${rssMB}MB`,
      );
    }
  }, 30000); // Every 30 seconds

  // Handle process warnings (Node.js issues memory warnings before OOM)
  process.on('warning', (warning) => {
    logger.error(
      `[PROCESS WARNING] ${warning.name}: ${warning.message}`,
      warning.stack,
    );

    // Log memory state when warning occurs
    const mem = process.memoryUsage();
    logger.error(
      `[MEMORY AT WARNING] Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    );
  });

  // Handle uncaught exceptions (log memory state before crash)
  process.on('uncaughtException', (error) => {
    logger.error('[UNCAUGHT EXCEPTION] Process will exit', error.stack);

    const mem = process.memoryUsage();
    logger.error(
      `[MEMORY AT CRASH] Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    );

    // Allow time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // Cleanup on shutdown
  process.on('SIGTERM', () => {
    clearInterval(memoryCheckInterval);
  });

  logger.log(
    `Memory monitoring enabled. Node started with ${global.gc ? '--expose-gc' : 'NO --expose-gc flag'}`,
  );
}

async function bootstrap() {
  if (process.env.MEMORY_MONITORING === 'true') setupMemoryMonitoring();

  const app = await NestFactory.create(WorkerAppModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const port = process.env.PORT || 3002; // Use different port from API
  await app.listen(port);
  console.log(
    `🚀 Rephole Worker Application is running on: http://localhost:${port}`,
  );
}
bootstrap();
