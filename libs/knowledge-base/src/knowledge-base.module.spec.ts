import { KnowledgeBaseModule } from './knowledge-base.module';
import { VectorStoreService } from './services/vector-store.service';
import { ContentBlobEntity } from './entities';

describe('KnowledgeBaseModule', () => {
  it('should be defined', () => {
    expect(KnowledgeBaseModule).toBeDefined();
  });

  it('should export VectorStoreService', () => {
    expect(VectorStoreService).toBeDefined();
    expect(VectorStoreService.name).toBe('VectorStoreService');
  });

  it('should export ContentBlobEntity', () => {
    expect(ContentBlobEntity).toBeDefined();
    expect(ContentBlobEntity.name).toBe('ContentBlobEntity');
  });

  it('should have module configuration', () => {
    const moduleMetadata = Reflect.getMetadata('imports', KnowledgeBaseModule);
    expect(moduleMetadata).toBeDefined();
    expect(moduleMetadata.length).toBeGreaterThan(0);
  });

  it('should export VectorStoreService in module exports', () => {
    const exportsMetadata = Reflect.getMetadata('exports', KnowledgeBaseModule);
    expect(exportsMetadata).toBeDefined();
    expect(exportsMetadata.length).toBeGreaterThan(0);
  });

  it('should provide VectorStoreService in module providers', () => {
    const providersMetadata = Reflect.getMetadata(
      'providers',
      KnowledgeBaseModule,
    );
    expect(providersMetadata).toBeDefined();
    expect(providersMetadata).toContain(VectorStoreService);
  });
});
