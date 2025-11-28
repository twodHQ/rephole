export * from './repo-rag-producer.module';

// Re-export services for convenience
export {
  RepoIngestionService,
  DocGeneratorService,
} from '@app/ingestion/repo-rag';
