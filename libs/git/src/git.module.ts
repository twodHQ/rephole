import { Module } from '@nestjs/common';
import { GitService } from './services';

@Module({
  providers: [GitService],
  exports: [GitService],
})
export class GitModule {}
