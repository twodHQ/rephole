import { SharedEntitiesModule } from './shared-entities.module';
import { ContentBlobEntity, RepoStateEntity } from './entities';

describe('SharedEntitiesModule', () => {
  it('should be defined', () => {
    expect(SharedEntitiesModule).toBeDefined();
  });

  it('should export ContentBlobEntity', () => {
    expect(ContentBlobEntity).toBeDefined();
    expect(ContentBlobEntity.name).toBe('ContentBlobEntity');
  });

  it('should export RepoStateEntity', () => {
    expect(RepoStateEntity).toBeDefined();
    expect(RepoStateEntity.name).toBe('RepoStateEntity');
  });

  it('should have TypeORM module configuration', () => {
    const moduleMetadata = Reflect.getMetadata('imports', SharedEntitiesModule);
    expect(moduleMetadata).toBeDefined();
    expect(moduleMetadata.length).toBeGreaterThan(0);
  });

  it('should export TypeORM module', () => {
    const exportsMetadata = Reflect.getMetadata(
      'exports',
      SharedEntitiesModule,
    );
    expect(exportsMetadata).toBeDefined();
    expect(exportsMetadata.length).toBeGreaterThan(0);
  });
});
