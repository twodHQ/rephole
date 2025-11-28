import { Injectable } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { GenerateTextOptions, ILLMProvider } from '../interfaces';

@Injectable()
export class AnthropicProvider implements ILLMProvider {
  supportsModel(model: string): boolean {
    return /^claude/i.test(model);
  }

  async generateText(
    prompt: string,
    options?: GenerateTextOptions,
  ): Promise<string> {
    return `[anthropic] ${prompt}`;
  }

  generateStream(prompt: string): Observable<string> {
    return of(`[anthropic] ${prompt}`);
  }
}
