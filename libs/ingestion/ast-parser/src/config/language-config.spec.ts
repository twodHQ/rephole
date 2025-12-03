import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  LANGUAGE_CONFIGS,
  LANGUAGE_CONFIG_MAP,
  SUPPORTED_LANGUAGES_COUNT,
  SUPPORTED_EXTENSIONS_COUNT,
  getConfigByExtension,
  getConfigByLanguage,
  getWasmPath,
  getSupportedExtensions,
  isExtensionSupported,
} from './language-config';

describe('LanguageConfig', () => {
  describe('LANGUAGE_CONFIGS', () => {
    it('should have 37 language configurations', () => {
      expect(LANGUAGE_CONFIGS.length).toBe(37);
    });

    it('should have unique language identifiers', () => {
      const languages = LANGUAGE_CONFIGS.map((c) => c.language);
      const uniqueLanguages = new Set(languages);
      expect(uniqueLanguages.size).toBe(languages.length);
    });

    it('should have non-empty queries for all languages', () => {
      for (const config of LANGUAGE_CONFIGS) {
        expect(config.query.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have valid WASM file names', () => {
      for (const config of LANGUAGE_CONFIGS) {
        expect(config.wasmFile).toMatch(/^tree-sitter-.+\.wasm$/);
      }
    });

    it('should have at least one extension per language', () => {
      for (const config of LANGUAGE_CONFIGS) {
        expect(config.extensions.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have extensions starting with a dot', () => {
      for (const config of LANGUAGE_CONFIGS) {
        for (const ext of config.extensions) {
          expect(ext.startsWith('.')).toBe(true);
        }
      }
    });
  });

  describe('LANGUAGE_CONFIG_MAP', () => {
    it('should be a Map', () => {
      expect(LANGUAGE_CONFIG_MAP).toBeInstanceOf(Map);
    });

    it('should have correct size based on all extensions', () => {
      expect(LANGUAGE_CONFIG_MAP.size).toBe(SUPPORTED_EXTENSIONS_COUNT);
    });

    it('should have lowercase keys', () => {
      for (const key of LANGUAGE_CONFIG_MAP.keys()) {
        expect(key).toBe(key.toLowerCase());
      }
    });
  });

  describe('getConfigByExtension', () => {
    it('should return TypeScript config for .ts', () => {
      const config = getConfigByExtension('.ts');
      expect(config).toBeDefined();
      expect(config?.language).toBe('typescript');
      expect(config?.wasmFile).toBe('tree-sitter-typescript.wasm');
    });

    it('should return TSX config for .tsx', () => {
      const config = getConfigByExtension('.tsx');
      expect(config).toBeDefined();
      expect(config?.language).toBe('tsx');
      expect(config?.wasmFile).toBe('tree-sitter-tsx.wasm');
    });

    it('should return Python config for .py', () => {
      const config = getConfigByExtension('.py');
      expect(config).toBeDefined();
      expect(config?.language).toBe('python');
      expect(config?.wasmFile).toBe('tree-sitter-python.wasm');
    });

    it('should return JavaScript config for .js', () => {
      const config = getConfigByExtension('.js');
      expect(config).toBeDefined();
      expect(config?.language).toBe('javascript');
    });

    it('should return undefined for unsupported extension', () => {
      const config = getConfigByExtension('.unknown');
      expect(config).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      const configLower = getConfigByExtension('.ts');
      const configUpper = getConfigByExtension('.TS');
      const configMixed = getConfigByExtension('.Ts');

      expect(configLower).toBeDefined();
      expect(configUpper).toEqual(configLower);
      expect(configMixed).toEqual(configLower);
    });

    it('should return Rust config for .rs', () => {
      const config = getConfigByExtension('.rs');
      expect(config).toBeDefined();
      expect(config?.language).toBe('rust');
    });

    it('should return Go config for .go', () => {
      const config = getConfigByExtension('.go');
      expect(config).toBeDefined();
      expect(config?.language).toBe('go');
    });
  });

  describe('getConfigByLanguage', () => {
    it('should return config for typescript', () => {
      const config = getConfigByLanguage('typescript');
      expect(config).toBeDefined();
      expect(config?.language).toBe('typescript');
    });

    it('should return config for python', () => {
      const config = getConfigByLanguage('python');
      expect(config).toBeDefined();
      expect(config?.language).toBe('python');
    });

    it('should be case-insensitive', () => {
      const configLower = getConfigByLanguage('typescript');
      const configUpper = getConfigByLanguage('TYPESCRIPT');
      const configMixed = getConfigByLanguage('TypeScript');

      expect(configLower).toBeDefined();
      expect(configUpper).toEqual(configLower);
      expect(configMixed).toEqual(configLower);
    });

    it('should return undefined for unknown language', () => {
      const config = getConfigByLanguage('unknown');
      expect(config).toBeUndefined();
    });
  });

  describe('getWasmPath', () => {
    it('should return absolute path', () => {
      const wasmPath = getWasmPath('tree-sitter-typescript.wasm');
      expect(path.isAbsolute(wasmPath)).toBe(true);
    });

    it('should include resources directory', () => {
      const wasmPath = getWasmPath('tree-sitter-typescript.wasm');
      expect(wasmPath).toContain('resources');
    });

    it('should end with the provided filename', () => {
      const wasmPath = getWasmPath('tree-sitter-typescript.wasm');
      expect(wasmPath).toMatch(/tree-sitter-typescript\.wasm$/);
    });
  });

  describe('getSupportedExtensions', () => {
    it('should return an array', () => {
      const extensions = getSupportedExtensions();
      expect(Array.isArray(extensions)).toBe(true);
    });

    it('should include common extensions', () => {
      const extensions = getSupportedExtensions();
      expect(extensions).toContain('.ts');
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.py');
      expect(extensions).toContain('.java');
      expect(extensions).toContain('.go');
      expect(extensions).toContain('.rs');
    });

    it('should match SUPPORTED_EXTENSIONS_COUNT', () => {
      const extensions = getSupportedExtensions();
      expect(extensions.length).toBe(SUPPORTED_EXTENSIONS_COUNT);
    });
  });

  describe('isExtensionSupported', () => {
    it('should return true for supported extensions', () => {
      expect(isExtensionSupported('.ts')).toBe(true);
      expect(isExtensionSupported('.py')).toBe(true);
      expect(isExtensionSupported('.js')).toBe(true);
      expect(isExtensionSupported('.go')).toBe(true);
    });

    it('should return false for unsupported extensions', () => {
      expect(isExtensionSupported('.unknown')).toBe(false);
      expect(isExtensionSupported('.abc')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isExtensionSupported('.TS')).toBe(true);
      expect(isExtensionSupported('.Py')).toBe(true);
    });
  });

  describe('WASM files existence', () => {
    // This test verifies that all configured WASM files exist in resources/
    it.each(LANGUAGE_CONFIGS)(
      'should have existing WASM file for $language',
      (config) => {
        const wasmPath = getWasmPath(config.wasmFile);
        const exists = fs.existsSync(wasmPath);
        if (!exists) {
          console.warn(`Missing WASM file: ${wasmPath}`);
        }
        // Note: In CI without resources, this might be skipped
        // For local dev, ensure resources/ folder has all WASM files
        expect(exists).toBe(true);
      },
    );
  });

  describe('SUPPORTED_LANGUAGES_COUNT', () => {
    it('should equal LANGUAGE_CONFIGS length', () => {
      expect(SUPPORTED_LANGUAGES_COUNT).toBe(LANGUAGE_CONFIGS.length);
    });

    it('should be 37', () => {
      expect(SUPPORTED_LANGUAGES_COUNT).toBe(37);
    });
  });
});

