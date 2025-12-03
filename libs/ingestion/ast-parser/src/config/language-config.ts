import * as path from 'node:path';
import {
  TYPESCRIPT_QUERY,
  TSX_QUERY,
  JAVASCRIPT_QUERY,
  PYTHON_QUERY,
  JAVA_QUERY,
  C_QUERY,
  CPP_QUERY,
  CSHARP_QUERY,
  OBJC_QUERY,
  GO_QUERY,
  RUST_QUERY,
  RUBY_QUERY,
  PHP_QUERY,
  LUA_QUERY,
  KOTLIN_QUERY,
  SWIFT_QUERY,
  SCALA_QUERY,
  DART_QUERY,
  ELIXIR_QUERY,
  OCAML_QUERY,
  ZIG_QUERY,
  SOLIDITY_QUERY,
  RESCRIPT_QUERY,
  ELISP_QUERY,
  HTML_QUERY,
  CSS_QUERY,
  VUE_QUERY,
  JSON_QUERY,
  YAML_QUERY,
  TOML_QUERY,
  MARKDOWN_QUERY,
  BASH_QUERY,
  TLAPLUS_QUERY,
  EMBEDDED_TEMPLATE_QUERY,
  SYSTEMRDL_QUERY,
} from '../constants/queries';

/**
 * Configuration for a supported programming language.
 */
export interface LanguageConfig {
  /** Language identifier (e.g., 'typescript', 'python') */
  language: string;
  /** File extensions that map to this language (e.g., ['.ts', '.tsx']) */
  extensions: string[];
  /** Filename of the WASM grammar file in resources/ */
  wasmFile: string;
  /** Tree-sitter query string for semantic chunk extraction */
  query: string;
}

/**
 * All supported language configurations.
 * Each language can have multiple file extensions.
 */
export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  // ============================================================================
  // TypeScript / JavaScript Family
  // ============================================================================
  {
    language: 'typescript',
    extensions: ['.ts', '.mts', '.cts'],
    wasmFile: 'tree-sitter-typescript.wasm',
    query: TYPESCRIPT_QUERY,
  },
  {
    language: 'tsx',
    extensions: ['.tsx'],
    wasmFile: 'tree-sitter-tsx.wasm',
    query: TSX_QUERY,
  },
  {
    language: 'javascript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    wasmFile: 'tree-sitter-javascript.wasm',
    query: JAVASCRIPT_QUERY,
  },

  // ============================================================================
  // Python
  // ============================================================================
  {
    language: 'python',
    extensions: ['.py', '.pyw', '.pyi'],
    wasmFile: 'tree-sitter-python.wasm',
    query: PYTHON_QUERY,
  },

  // ============================================================================
  // JVM Languages
  // ============================================================================
  {
    language: 'java',
    extensions: ['.java'],
    wasmFile: 'tree-sitter-java.wasm',
    query: JAVA_QUERY,
  },
  {
    language: 'kotlin',
    extensions: ['.kt', '.kts'],
    wasmFile: 'tree-sitter-kotlin.wasm',
    query: KOTLIN_QUERY,
  },
  {
    language: 'scala',
    extensions: ['.scala', '.sc'],
    wasmFile: 'tree-sitter-scala.wasm',
    query: SCALA_QUERY,
  },

  // ============================================================================
  // C Family
  // ============================================================================
  {
    language: 'c',
    extensions: ['.c', '.h'],
    wasmFile: 'tree-sitter-c.wasm',
    query: C_QUERY,
  },
  {
    language: 'cpp',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx', '.hh', '.c++', '.h++'],
    wasmFile: 'tree-sitter-cpp.wasm',
    query: CPP_QUERY,
  },
  {
    language: 'csharp',
    extensions: ['.cs'],
    wasmFile: 'tree-sitter-c_sharp.wasm',
    query: CSHARP_QUERY,
  },
  {
    language: 'objc',
    extensions: ['.m', '.mm'],
    wasmFile: 'tree-sitter-objc.wasm',
    query: OBJC_QUERY,
  },

  // ============================================================================
  // Systems Programming
  // ============================================================================
  {
    language: 'go',
    extensions: ['.go'],
    wasmFile: 'tree-sitter-go.wasm',
    query: GO_QUERY,
  },
  {
    language: 'rust',
    extensions: ['.rs'],
    wasmFile: 'tree-sitter-rust.wasm',
    query: RUST_QUERY,
  },
  {
    language: 'zig',
    extensions: ['.zig'],
    wasmFile: 'tree-sitter-zig.wasm',
    query: ZIG_QUERY,
  },

  // ============================================================================
  // Mobile Development
  // ============================================================================
  {
    language: 'swift',
    extensions: ['.swift'],
    wasmFile: 'tree-sitter-swift.wasm',
    query: SWIFT_QUERY,
  },
  {
    language: 'dart',
    extensions: ['.dart'],
    wasmFile: 'tree-sitter-dart.wasm',
    query: DART_QUERY,
  },

  // ============================================================================
  // Scripting Languages
  // ============================================================================
  {
    language: 'ruby',
    extensions: ['.rb', '.rake', '.gemspec'],
    wasmFile: 'tree-sitter-ruby.wasm',
    query: RUBY_QUERY,
  },
  {
    language: 'php',
    extensions: ['.php', '.phtml', '.php5', '.php7'],
    wasmFile: 'tree-sitter-php.wasm',
    query: PHP_QUERY,
  },
  {
    language: 'lua',
    extensions: ['.lua'],
    wasmFile: 'tree-sitter-lua.wasm',
    query: LUA_QUERY,
  },
  {
    language: 'elixir',
    extensions: ['.ex', '.exs'],
    wasmFile: 'tree-sitter-elixir.wasm',
    query: ELIXIR_QUERY,
  },

  // ============================================================================
  // Functional Languages
  // ============================================================================
  {
    language: 'ocaml',
    extensions: ['.ml', '.mli'],
    wasmFile: 'tree-sitter-ocaml.wasm',
    query: OCAML_QUERY,
  },
  {
    language: 'rescript',
    extensions: ['.res', '.resi'],
    wasmFile: 'tree-sitter-rescript.wasm',
    query: RESCRIPT_QUERY,
  },

  // ============================================================================
  // Web3 / Blockchain
  // ============================================================================
  {
    language: 'solidity',
    extensions: ['.sol'],
    wasmFile: 'tree-sitter-solidity.wasm',
    query: SOLIDITY_QUERY,
  },

  // ============================================================================
  // Web Technologies
  // ============================================================================
  {
    language: 'html',
    extensions: ['.html', '.htm', '.xhtml'],
    wasmFile: 'tree-sitter-html.wasm',
    query: HTML_QUERY,
  },
  {
    language: 'css',
    extensions: ['.css'],
    wasmFile: 'tree-sitter-css.wasm',
    query: CSS_QUERY,
  },
  {
    language: 'vue',
    extensions: ['.vue'],
    wasmFile: 'tree-sitter-vue.wasm',
    query: VUE_QUERY,
  },
  {
    language: 'embedded_template',
    extensions: ['.erb', '.ejs', '.eta'],
    wasmFile: 'tree-sitter-embedded_template.wasm',
    query: EMBEDDED_TEMPLATE_QUERY,
  },

  // ============================================================================
  // Config / Data Languages
  // ============================================================================
  {
    language: 'json',
    extensions: ['.json', '.jsonc'],
    wasmFile: 'tree-sitter-json.wasm',
    query: JSON_QUERY,
  },
  {
    language: 'yaml',
    extensions: ['.yml', '.yaml'],
    wasmFile: 'tree-sitter-yaml.wasm',
    query: YAML_QUERY,
  },
  {
    language: 'toml',
    extensions: ['.toml'],
    wasmFile: 'tree-sitter-toml.wasm',
    query: TOML_QUERY,
  },
  {
    language: 'markdown',
    extensions: ['.md', '.markdown', '.mdx'],
    wasmFile: 'tree-sitter-markdown.wasm',
    query: MARKDOWN_QUERY,
  },

  // ============================================================================
  // Shell
  // ============================================================================
  {
    language: 'bash',
    extensions: ['.sh', '.bash', '.zsh', '.fish'],
    wasmFile: 'tree-sitter-bash.wasm',
    query: BASH_QUERY,
  },

  // ============================================================================
  // Lisp Family
  // ============================================================================
  {
    language: 'elisp',
    extensions: ['.el', '.elc'],
    wasmFile: 'tree-sitter-elisp.wasm',
    query: ELISP_QUERY,
  },

  // ============================================================================
  // Formal Methods / Verification
  // ============================================================================
  {
    language: 'tlaplus',
    extensions: ['.tla'],
    wasmFile: 'tree-sitter-tlaplus.wasm',
    query: TLAPLUS_QUERY,
  },

  // ============================================================================
  // Hardware Description
  // ============================================================================
  {
    language: 'systemrdl',
    extensions: ['.rdl'],
    wasmFile: 'tree-sitter-systemrdl.wasm',
    query: SYSTEMRDL_QUERY,
  },
];

/**
 * Map for O(1) lookup of language config by file extension.
 * Pre-built from LANGUAGE_CONFIGS array for performance.
 */
export const LANGUAGE_CONFIG_MAP: Map<string, LanguageConfig> = (() => {
  const map = new Map<string, LanguageConfig>();

  for (const config of LANGUAGE_CONFIGS) {
    for (const ext of config.extensions) {
      const normalizedExt = ext.toLowerCase();
      if (map.has(normalizedExt)) {
        // Duplicate extension detected, keep first definition
        console.warn(
          `[LanguageConfig] Duplicate extension '${normalizedExt}' detected. Keeping first definition (${map.get(normalizedExt)?.language}).`,
        );
        continue;
      }
      map.set(normalizedExt, config);
    }
  }

  return map;
})();

/**
 * Get language configuration by file extension.
 * Uses O(1) Map lookup for performance.
 *
 * @param extension - File extension including the dot (e.g., '.ts', '.py')
 * @returns LanguageConfig if found, undefined otherwise
 */
export function getConfigByExtension(
  extension: string,
): LanguageConfig | undefined {
  return LANGUAGE_CONFIG_MAP.get(extension.toLowerCase());
}

/**
 * Get the absolute path to a WASM grammar file.
 *
 * @param wasmFile - The WASM filename (e.g., 'tree-sitter-typescript.wasm')
 * @returns Absolute path to the WASM file
 */
export function getWasmPath(wasmFile: string): string {
  return path.resolve(process.cwd(), 'resources', wasmFile);
}

/**
 * Get all supported file extensions.
 *
 * @returns Array of all supported extensions
 */
export function getSupportedExtensions(): string[] {
  return Array.from(LANGUAGE_CONFIG_MAP.keys());
}

/**
 * Check if a file extension is supported.
 *
 * @param extension - File extension to check (e.g., '.ts')
 * @returns true if the extension is supported
 */
export function isExtensionSupported(extension: string): boolean {
  return LANGUAGE_CONFIG_MAP.has(extension.toLowerCase());
}

/**
 * Get language configuration by language name.
 *
 * @param language - Language identifier (e.g., 'typescript', 'python')
 * @returns LanguageConfig if found, undefined otherwise
 */
export function getConfigByLanguage(
  language: string,
): LanguageConfig | undefined {
  return LANGUAGE_CONFIGS.find(
    (config) => config.language.toLowerCase() === language.toLowerCase(),
  );
}

/**
 * Total number of supported languages.
 */
export const SUPPORTED_LANGUAGES_COUNT = LANGUAGE_CONFIGS.length;

/**
 * Total number of supported file extensions.
 */
export const SUPPORTED_EXTENSIONS_COUNT = LANGUAGE_CONFIG_MAP.size;
