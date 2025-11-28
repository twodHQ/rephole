import { Observable } from 'rxjs';

export interface GenerateTextOptions {
  model: string;
  instructions?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface ILLMProvider {
  supportsModel(model: string): boolean;
  generateText(prompt: string, options?: GenerateTextOptions): Promise<string>;
  generateStream(prompt: string): Observable<string>;
}
