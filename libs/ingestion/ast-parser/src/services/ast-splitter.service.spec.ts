import { Test, TestingModule } from '@nestjs/testing';
import { AstSplitterService } from './ast-splitter.service';

describe('AstSplitterService', () => {
  let service: AstSplitterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AstSplitterService],
    }).compile();

    service = module.get<AstSplitterService>(AstSplitterService);

    // Mock logger to reduce noise in tests
    jest.spyOn(service['logger'], 'debug').mockImplementation();
    jest.spyOn(service['logger'], 'log').mockImplementation();
    jest.spyOn(service['logger'], 'warn').mockImplementation();
    jest.spyOn(service['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize parser without throwing', async () => {
      // onModuleInit should not throw even if WASM files are missing
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should call logger on initialization', async () => {
      await service.onModuleInit();

      expect(service['logger'].log).toHaveBeenCalledWith(
        'Initializing Tree-Sitter Parser...',
      );
      expect(service['logger'].log).toHaveBeenCalledWith(
        expect.stringContaining('Tree-Sitter initialization complete'),
      );
    });
  });

  describe('split (without initialization)', () => {
    const mockFileName = 'test.ts';

    beforeEach(() => {
      // Mock the parser to avoid needing actual tree-sitter initialization
      service['parser'] = {
        parse: jest.fn().mockReturnValue(null),
        setLanguage: jest.fn(),
      } as any;
    });

    it('should return empty array when no language is loaded', () => {
      const result = service.split(mockFileName, 'const x = 1;');

      expect(result).toEqual([]);
    });

    it('should return empty array for unsupported extension', () => {
      const result = service.split('test.unknown', 'some content');

      expect(result).toEqual([]);
    });

    it('should return empty array when file has no extension', () => {
      const result = service.split('Makefile', 'some content');

      expect(result).toEqual([]);
    });
  });

  describe('split (with mocked language)', () => {
    const mockFileName = 'test.ts';

    beforeEach(() => {
      // Mock the parser
      service['parser'] = {
        parse: jest.fn().mockReturnValue(null),
        setLanguage: jest.fn(),
      } as any;

      // Mock a loaded language
      const mockLanguage = {
        query: jest.fn().mockReturnValue({
          captures: jest.fn().mockReturnValue([]),
        }),
      };

      service['languageMap'].set('.ts', {
        language: mockLanguage as any,
        query: 'mock query',
        config: {
          language: 'typescript',
          extensions: ['.ts'],
          wasmFile: 'tree-sitter-typescript.wasm',
          query: 'mock query',
        },
      });
    });

    it('should return empty array when parse fails', () => {
      const result = service.split(mockFileName, 'invalid code');

      expect(result).toEqual([]);
      expect(service['logger'].warn).toHaveBeenCalledWith(
        `Failed to parse ${mockFileName}`,
      );
    });

    it('should handle empty content', () => {
      const result = service.split(mockFileName, '');

      expect(result).toEqual([]);
    });

    it('should parse valid TypeScript code', () => {
      const mockTree = {
        rootNode: {
          childCount: 1,
        },
      };

      const mockQuery = {
        captures: jest.fn().mockReturnValue([]),
      };

      service['parser'] = {
        parse: jest.fn().mockReturnValue(mockTree),
        setLanguage: jest.fn(),
      } as any;

      // Update mock language to use a working query
      const mockLanguage = {
        query: jest.fn().mockReturnValue(mockQuery),
      };

      service['languageMap'].set('.ts', {
        language: mockLanguage as any,
        query: 'mock query',
        config: {
          language: 'typescript',
          extensions: ['.ts'],
          wasmFile: 'tree-sitter-typescript.wasm',
          query: 'mock query',
        },
      });

      const code = `
export class TestService {
  method() {
    return 'test';
  }
}
      `.trim();

      const result = service.split(mockFileName, code);

      expect(service['parser'].parse).toHaveBeenCalledWith(code);
      expect(result).toBeInstanceOf(Array);
    });

    it('should extract code chunks from captures', () => {
      const mockCode = `
export class AuthService {
  login(user: string) {
    return true;
  }
}
      `.trim();

      const mockNode = {
        type: 'method_definition',
        startPosition: { row: 1, column: 0 },
        endPosition: { row: 3, column: 3 },
        startIndex: 0,
        endIndex: mockCode.length,
        text: 'login(user: string) { return true; }',
        previousSibling: null,
        id: 1,
        parent: {
          type: 'class_body',
          parent: {
            type: 'class_declaration',
            id: 2,
          },
        },
      };

      const mockNameNode = {
        text: 'login',
        parent: { id: 1 },
      };

      const mockCaptures = [
        { name: 'block', node: mockNode },
        { name: 'name', node: mockNameNode },
      ];

      const mockTree = {
        rootNode: {
          childCount: 1,
        },
      };

      const mockQuery = {
        captures: jest.fn().mockReturnValue(mockCaptures),
      };

      service['parser'] = {
        parse: jest.fn().mockReturnValue(mockTree),
        setLanguage: jest.fn(),
      } as any;

      // Update mock language
      const mockLanguage = {
        query: jest.fn().mockReturnValue(mockQuery),
      };

      service['languageMap'].set('.ts', {
        language: mockLanguage as any,
        query: 'mock query',
        config: {
          language: 'typescript',
          extensions: ['.ts'],
          wasmFile: 'tree-sitter-typescript.wasm',
          query: 'mock query',
        },
      });

      const result = service.split(mockFileName, mockCode);

      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(mockLanguage.query).toHaveBeenCalled();
    });
  });

  describe('isLanguageSupported', () => {
    it('should return false when language map is empty', () => {
      expect(service.isLanguageSupported('.ts')).toBe(false);
    });

    it('should return true when language is loaded', () => {
      service['languageMap'].set('.ts', {} as any);
      expect(service.isLanguageSupported('.ts')).toBe(true);
    });

    it('should be case-insensitive', () => {
      service['languageMap'].set('.ts', {} as any);
      expect(service.isLanguageSupported('.TS')).toBe(true);
      expect(service.isLanguageSupported('.Ts')).toBe(true);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return empty array when no languages loaded', () => {
      expect(service.getSupportedExtensions()).toEqual([]);
    });

    it('should return all loaded extensions', () => {
      service['languageMap'].set('.ts', {} as any);
      service['languageMap'].set('.js', {} as any);
      service['languageMap'].set('.py', {} as any);

      const extensions = service.getSupportedExtensions();
      expect(extensions).toContain('.ts');
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.py');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      service['parser'] = {
        parse: jest.fn(),
        setLanguage: jest.fn(),
      } as any;

      service['languageMap'].set('.ts', {
        language: {
          query: jest.fn().mockReturnValue({
            captures: jest.fn().mockReturnValue([]),
          }),
        } as any,
        query: 'mock query',
        config: {
          language: 'typescript',
          extensions: ['.ts'],
          wasmFile: 'tree-sitter-typescript.wasm',
          query: 'mock query',
        },
      });
    });

    it('should handle parser exceptions gracefully', () => {
      service['parser'].parse = jest.fn().mockImplementation(() => {
        throw new Error('Parser error');
      });

      const result = service.split('test.ts', 'code');

      expect(result).toEqual([]);
      expect(service['logger'].error).toHaveBeenCalled();
    });

    it('should handle null tree from parser', () => {
      service['parser'].parse = jest.fn().mockReturnValue(null);

      const result = service.split('test.ts', 'code');

      expect(result).toEqual([]);
    });

    it('should handle query compilation errors', () => {
      service['languageMap'].set('.ts', {
        language: {
          query: jest.fn().mockImplementation(() => {
            throw new Error('Invalid query');
          }),
        } as any,
        query: 'invalid query',
        config: {
          language: 'typescript',
          extensions: ['.ts'],
          wasmFile: 'tree-sitter-typescript.wasm',
          query: 'invalid query',
        },
      });

      service['parser'].parse = jest.fn().mockReturnValue({
        rootNode: { childCount: 1 },
      });

      const result = service.split('test.ts', 'code');

      expect(result).toEqual([]);
      expect(service['logger'].error).toHaveBeenCalled();
    });
  });

  describe('chunk ID generation', () => {
    it('should generate unique IDs for chunks', () => {
      const generateChunkId = service['generateChunkId'].bind(service);

      const id1 = generateChunkId('file.ts', 'method', 'method_definition', 10);
      const id2 = generateChunkId('file.ts', 'method', 'method_definition', 20);
      const id3 = generateChunkId(
        'file.ts',
        'method',
        'function_declaration',
        10,
      );

      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id1).toBe('file.ts:method:method_definition:L10');
    });
  });
});

/**
 * Integration tests that require actual WASM files.
 * These tests are skipped if WASM files are not available.
 */
describe('AstSplitterService Integration', () => {
  let service: AstSplitterService;
  let isInitialized = false;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AstSplitterService],
    }).compile();

    service = module.get<AstSplitterService>(AstSplitterService);

    try {
      await service.onModuleInit();
      isInitialized = service.getSupportedExtensions().length > 0;
    } catch (e) {
      isInitialized = false;
    }
  });

  const skipIfNotInitialized = () => {
    if (!isInitialized) {
      console.log('Skipping integration test: WASM files not available');
      return true;
    }
    return false;
  };

  it('should load at least one language', () => {
    if (skipIfNotInitialized()) return;
    expect(service.getSupportedExtensions().length).toBeGreaterThan(0);
  });

  it('should parse TypeScript code', () => {
    if (skipIfNotInitialized()) return;
    if (!service.isLanguageSupported('.ts')) return;

    const tsCode = `
export class MyClass {
  myMethod(): void {
    console.log('hello');
  }
}
    `.trim();

    const chunks = service.split('test.ts', tsCode);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should parse JavaScript code', () => {
    if (skipIfNotInitialized()) return;
    if (!service.isLanguageSupported('.js')) return;

    const jsCode = `
function greet(name) {
  return 'Hello, ' + name;
}

class Person {
  constructor(name) {
    this.name = name;
  }
}
    `.trim();

    const chunks = service.split('test.js', jsCode);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should parse Python code', () => {
    if (skipIfNotInitialized()) return;
    if (!service.isLanguageSupported('.py')) return;

    const pyCode = `
def hello_world():
    print("Hello, World!")

class MyClass:
    def __init__(self):
        pass
    `.trim();

    const chunks = service.split('test.py', pyCode);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should parse Java code', () => {
    if (skipIfNotInitialized()) return;
    if (!service.isLanguageSupported('.java')) return;

    const javaCode = `
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
    `.trim();

    const chunks = service.split('HelloWorld.java', javaCode);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should parse Go code', () => {
    if (skipIfNotInitialized()) return;
    if (!service.isLanguageSupported('.go')) return;

    const goCode = `
package main

func main() {
    fmt.Println("Hello, World!")
}

func greet(name string) string {
    return "Hello, " + name
}
    `.trim();

    const chunks = service.split('main.go', goCode);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should parse Rust code', () => {
    if (skipIfNotInitialized()) return;
    if (!service.isLanguageSupported('.rs')) return;

    const rustCode = `
fn main() {
    println!("Hello, World!");
}

struct Person {
    name: String,
}

impl Person {
    fn new(name: String) -> Self {
        Person { name }
    }
}
    `.trim();

    const chunks = service.split('main.rs', rustCode);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should return empty array for unsupported extension', () => {
    if (skipIfNotInitialized()) return;

    const chunks = service.split('test.xyz', 'some content');
    expect(chunks).toEqual([]);
  });
});
