import { Module } from '@nestjs/common';
import {
  AnthropicProvider,
  LLM_PROVIDERS,
  LLMGatewayService,
  OpenAIProvider,
} from './llm-gateway';
import { EmbeddingsService } from './embeddings';

@Module({
  providers: [
    OpenAIProvider,
    AnthropicProvider,
    {
      provide: LLM_PROVIDERS,
      useFactory: (openai: OpenAIProvider, anthropic: AnthropicProvider) => [
        openai,
        anthropic,
      ],
      inject: [OpenAIProvider, AnthropicProvider],
    },
    LLMGatewayService,
    EmbeddingsService,
  ],
  exports: [LLMGatewayService, EmbeddingsService],
})
export class AiFoundationModule {}
