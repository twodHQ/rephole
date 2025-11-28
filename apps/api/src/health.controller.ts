import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Health check',
    description: 'Health check',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check',
    example: { status: 'ok' },
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
      },
    },
  })
  healthCheck() {
    return { status: 'ok' };
  }
}
