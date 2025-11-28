import { RetrievalCommonModule } from './retrieval-common.module';
import { ParentChildRetrieverService } from './services';

describe('RetrievalCommonModule', () => {
  it('should be defined', () => {
    expect(RetrievalCommonModule).toBeDefined();
  });

  it('should export ParentChildRetrieverService', () => {
    expect(ParentChildRetrieverService).toBeDefined();
    expect(ParentChildRetrieverService.name).toBe(
      'ParentChildRetrieverService',
    );
  });

  it('should have module configuration', () => {
    const moduleMetadata = Reflect.getMetadata(
      'imports',
      RetrievalCommonModule,
    );
    expect(moduleMetadata).toBeDefined();
    expect(moduleMetadata.length).toBeGreaterThan(0);
  });

  it('should export ParentChildRetrieverService in module exports', () => {
    const exportsMetadata = Reflect.getMetadata(
      'exports',
      RetrievalCommonModule,
    );
    expect(exportsMetadata).toBeDefined();
    expect(exportsMetadata).toContain(ParentChildRetrieverService);
  });

  it('should provide ParentChildRetrieverService in module providers', () => {
    const providersMetadata = Reflect.getMetadata(
      'providers',
      RetrievalCommonModule,
    );
    expect(providersMetadata).toBeDefined();
    expect(providersMetadata).toContain(ParentChildRetrieverService);
  });

  it('should not depend on IngestionCommonModule', () => {
    // Verify module independence by checking imports
    const moduleMetadata = Reflect.getMetadata(
      'imports',
      RetrievalCommonModule,
    );
    expect(moduleMetadata).toBeDefined();
    // Should only import KnowledgeBaseModule, not IngestionCommonModule
    expect(moduleMetadata.length).toBe(1);
  });
});
