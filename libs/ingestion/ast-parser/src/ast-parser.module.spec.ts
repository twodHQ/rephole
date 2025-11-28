import { Test, TestingModule } from '@nestjs/testing';
import { AstParserModule } from './ast-parser.module';
import { AstSplitterService } from './services';

describe('AstParserModule', () => {
  let module: TestingModule;
  let astSplitterService: AstSplitterService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AstParserModule],
    }).compile();

    astSplitterService = module.get<AstSplitterService>(AstSplitterService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide AstSplitterService', () => {
    expect(astSplitterService).toBeDefined();
    expect(astSplitterService).toBeInstanceOf(AstSplitterService);
  });

  it('should export AstSplitterService for other modules', () => {
    // This tests that the service can be injected by other modules
    const exports = Reflect.getMetadata('exports', AstParserModule) || [];
    expect(exports).toContain(AstSplitterService);
  });

  describe('AstSplitterService integration', () => {
    it('should have split method available', () => {
      expect(astSplitterService.split).toBeDefined();
      expect(typeof astSplitterService.split).toBe('function');
    });

    it('should have onModuleInit lifecycle hook', () => {
      expect(astSplitterService.onModuleInit).toBeDefined();
      expect(typeof astSplitterService.onModuleInit).toBe('function');
    });
  });

  describe('module configuration', () => {
    it('should be a valid NestJS module', () => {
      // Check that the module has proper metadata
      const providers = Reflect.getMetadata('providers', AstParserModule);
      const exports = Reflect.getMetadata('exports', AstParserModule);
      expect(providers).toBeDefined();
      expect(exports).toBeDefined();
    });

    it('should have providers defined', () => {
      const providers = Reflect.getMetadata('providers', AstParserModule) || [];
      expect(providers.length).toBeGreaterThan(0);
      expect(providers).toContain(AstSplitterService);
    });
  });
});
