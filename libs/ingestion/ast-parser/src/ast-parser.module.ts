import { Module } from '@nestjs/common';
import { AstSplitterService } from './services';

@Module({
  providers: [AstSplitterService],
  exports: [AstSplitterService],
})
export class AstParserModule {}
