import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Language,
  type Node as SyntaxNode,
  Parser,
  Query,
  type QueryCapture,
  type Tree,
} from 'web-tree-sitter';
import * as path from 'node:path';
import {
  LANGUAGE_CONFIGS,
  getConfigByExtension,
  getWasmPath,
  type LanguageConfig,
} from '../config';

/**
 * Represents a semantic code chunk extracted from source code.
 */
export interface CodeChunk {
  /** Unique identifier in format: "filePath:name:nodeType:L{line}" */
  id: string;
  /** AST node type: "method_definition", "class_declaration", "function_definition", etc. */
  type: string;
  /** The actual code snippet */
  content: string;
  /** One-indexed start line number */
  startLine: number;
  /** One-indexed end line number */
  endLine: number;
}

/**
 * Loaded language data containing the tree-sitter Language and its associated query.
 */
interface LoadedLanguage {
  language: Language;
  query: string;
  config: LanguageConfig;
}

/**
 * Service for parsing source code and extracting semantic chunks using tree-sitter.
 * Supports multiple programming languages based on file extension.
 */
@Injectable()
export class AstSplitterService implements OnModuleInit {
  private parser!: Parser;
  private readonly logger = new Logger(AstSplitterService.name);

  /**
   * Map of file extensions to loaded Language instances.
   * Pre-populated during module initialization for O(1) lookup.
   */
  private readonly languageMap = new Map<string, LoadedLanguage>();

  /**
   * Track which languages failed to load for debugging purposes.
   */
  private readonly failedLanguages = new Set<string>();

  /**
   * Initialize the tree-sitter parser and load all supported language grammars.
   */
  async onModuleInit() {
    this.logger.log('Initializing Tree-Sitter Parser...');
    await Parser.init();
    this.logger.debug('Parser.init() completed');

    // Create the shared parser instance
    this.parser = new Parser();
    let successCount = 0;
    let failCount = 0;

    for (const config of LANGUAGE_CONFIGS) {
      try {
        await this.loadLanguageGrammar(config);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to load language ${config.language}: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.failedLanguages.add(config.language);
        failCount++;
      }
    }

    this.logger.log(
      `Tree-Sitter initialization complete: ${successCount} languages loaded, ${failCount} failed`,
    );

    if (this.languageMap.size === 0) {
      this.logger.error(
        'No languages were loaded! AST splitting will not work.',
      );
    }

    // Log supported extensions
    this.logger.debug(
      `Supported extensions: ${Array.from(this.languageMap.keys()).join(', ')}`,
    );
  }

  /**
   * Load a single language grammar from WASM file.
   * Registers all extensions for the language in the languageMap.
   */
  private async loadLanguageGrammar(config: LanguageConfig): Promise<void> {
    const wasmPath = getWasmPath(config.wasmFile);

    this.logger.debug(`Loading ${config.language}`);
    const language = await Language.load(wasmPath);

    // Register all extensions for this language
    for (const ext of config.extensions) {
      const normalizedExt = ext.toLowerCase();

      // Skip if already registered (shouldn't happen with our config, but be safe)
      if (this.languageMap.has(normalizedExt)) {
        this.logger.debug(
          `Extension ${normalizedExt} already registered, skipping`,
        );
        continue;
      }

      this.languageMap.set(normalizedExt, {
        language,
        query: config.query,
        config,
      });
    }

    this.logger.debug(
      `${config.language} grammar loaded successfully (${config.extensions.join(', ')})`,
    );
  }

  /**
   * Get the loaded language data for a file extension.
   *
   * @param extension - File extension including dot (e.g., '.ts')
   * @returns LoadedLanguage if available, undefined otherwise
   */
  private getLoadedLanguage(extension: string): LoadedLanguage | undefined {
    return this.languageMap.get(extension.toLowerCase());
  }

  /**
   * Check if a file extension is supported and its grammar is loaded.
   *
   * @param extension - File extension to check
   * @returns true if the extension is supported and ready
   */
  isLanguageSupported(extension: string): boolean {
    return this.languageMap.has(extension.toLowerCase());
  }

  /**
   * Get list of all supported file extensions.
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.languageMap.keys());
  }

  /**
   * Smartly splits source code into semantic chunks based on AST analysis.
   * Automatically detects the language from file extension.
   *
   * @param fileName - File path (used for extension detection and chunk IDs)
   * @param content - Source code content to parse
   * @returns Array of CodeChunk objects, empty array if parsing fails or extension unsupported
   */
  split(fileName: string, content: string): CodeChunk[] {
    // Extract file extension
    const ext = path.extname(fileName).toLowerCase();

    if (!ext) {
      this.logger.warn(`No file extension found for: ${fileName}`);
      return [];
    }

    // Get the loaded language for this extension
    const loadedLang = this.getLoadedLanguage(ext);

    if (!loadedLang) {
      // Check if it's a known but failed language
      const config = getConfigByExtension(ext);
      if (config && this.failedLanguages.has(config.language)) {
        this.logger.warn(
          `Language ${config.language} failed to load, cannot parse ${fileName}`,
        );
      } else if (!config) {
        this.logger.debug(`Unsupported file extension: ${ext} (${fileName})`);
      }
      return [];
    }

    this.logger.debug(
      `Splitting file: ${fileName} (${content.length} chars, language: ${loadedLang.config.language})`,
    );

    // Set the parser language for this file
    try {
      this.parser.setLanguage(loadedLang.language);
    } catch (error) {
      this.logger.error(
        `Failed to set parser language for ${loadedLang.config.language}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }

    // Parse the content
    let tree: Tree | null;
    try {
      tree = this.parser.parse(content);
    } catch (error) {
      this.logger.error(
        `Parser error for ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }

    if (!tree) {
      this.logger.warn(`Failed to parse ${fileName}`);
      return [];
    }

    this.logger.debug(
      `Parsed syntax tree with ${tree.rootNode.childCount} top-level nodes`,
    );

    // Compile and run the query
    let query: Query;
    try {
      query = new Query(loadedLang.language, loadedLang.query);
    } catch (error) {
      this.logger.error(
        `Query compilation error for ${loadedLang.config.language}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }

    this.logger.debug(`${loadedLang.config.language} query compiled`);

    // Run the query to find all "blocks" (functions, classes, etc.)
    const captures: QueryCapture[] = query.captures(tree.rootNode);
    this.logger.debug(`Found ${captures.length} total captures`);

    const chunks: CodeChunk[] = [];

    const blockCaptures = captures.filter(
      (c: QueryCapture) => c.name === 'block',
    );
    this.logger.debug(
      `Processing ${blockCaptures.length} block captures for ${fileName}`,
    );

    for (const capture of captures) {
      if (capture.name !== 'block') continue;

      const node: SyntaxNode = capture.node;
      this.logger.debug(
        `Processing ${node.type} at line ${node.startPosition.row + 1}`,
      );

      // Resolve the "Name" of this block (for Metadata)
      const nameNode = this.findNameNode(captures, node);
      const name = nameNode ? nameNode.text : 'anonymous';
      this.logger.debug(`Resolved block name: ${name} (type: ${node.type})`);

      // Context Expansion: Include Decorators & Comments
      const { startNode, endNode } = this.expandContext(node);

      const chunkContent = content.substring(
        startNode.startIndex,
        endNode.endIndex,
      );

      // Generate unique ID
      const chunkStartLine = startNode.startPosition.row + 1;
      const chunkEndLine = endNode.endPosition.row + 1;
      const chunkId = this.generateChunkId(
        fileName,
        name,
        node.type,
        chunkStartLine,
      );

      const chunk: CodeChunk = {
        id: chunkId,
        type: node.type,
        content: chunkContent,
        startLine: chunkStartLine,
        endLine: chunkEndLine,
      };

      this.logger.debug(
        `[AST-SPLITTER] Created chunk ID: "${chunk.id}" | Type: ${chunk.type} | Name: ${name} | Lines: ${chunk.startLine}-${chunk.endLine} | Length: ${chunkContent.length} chars`,
      );
      chunks.push(chunk);
    }

    // Check for duplicate IDs
    const chunkIds = chunks.map((c) => c.id);
    const uniqueChunkIds = new Set(chunkIds);
    if (chunkIds.length !== uniqueChunkIds.size) {
      const duplicates = chunkIds.filter(
        (id, idx) => chunkIds.indexOf(id) !== idx,
      );
      this.logger.warn(
        `[AST-SPLITTER-WARNING] Found ${chunkIds.length - uniqueChunkIds.size} duplicate chunk IDs in ${fileName}: ${[...new Set(duplicates)].join(', ')}`,
      );
    }

    this.logger.debug(
      `Splitting complete for ${fileName}: ${chunks.length} chunks extracted (${uniqueChunkIds.size} unique IDs)`,
    );
    return chunks;
  }

  /**
   * Generate a unique chunk ID in the format: filePath:name:nodeType:L{line}
   * This format ensures uniqueness even for getter/setter pairs with the same name.
   *
   * @param fileName - Relative file path from repository root
   * @param name - Function/class/property name
   * @param nodeType - AST node type (e.g., "get_accessor", "set_accessor", "method_definition")
   * @param startLine - One-indexed line number where the code block starts
   * @returns Unique chunk ID string
   */
  private generateChunkId(
    fileName: string,
    name: string,
    nodeType: string,
    startLine: number,
  ): string {
    return `${fileName}:${name}:${nodeType}:L${startLine}`;
  }

  /**
   * Expand context to include preceding comments and decorators.
   * Tree-sitter nodes usually start at the keyword (e.g., 'class').
   * This method walks backwards to find @Injectable() decorators or JSDoc comments.
   */
  private expandContext(node: SyntaxNode): {
    startNode: SyntaxNode;
    endNode: SyntaxNode;
  } {
    let startNode = node;
    const endNode = node;
    let contextNodes = 0;

    // Walk backwards to find comments or decorators
    let prev = node.previousSibling;
    while (prev) {
      // Check for Comments or Decorators
      if (prev.type === 'comment' || prev.type === 'decorator') {
        startNode = prev;
        prev = prev.previousSibling;
        contextNodes++;
      } else {
        // Stop if we hit whitespace or other code
        break;
      }
    }

    if (contextNodes > 0) {
      this.logger.debug(
        `Expanded context: included ${contextNodes} comment/decorator nodes`,
      );
    }

    return { startNode, endNode };
  }

  /**
   * Find the name node associated with a block capture.
   * Looks for a @name capture that is a direct child of the block node.
   */
  private findNameNode(
    captures: QueryCapture[],
    blockNode: SyntaxNode,
  ): SyntaxNode | undefined {
    // Look for a capture named '@name' that is a descendant of our blockNode
    const nameNode = captures.find(
      (c) => c.name === 'name' && blockNode.id === c.node.parent?.id,
    )?.node;

    if (!nameNode) {
      this.logger.debug(
        `No name node found for ${blockNode.type} at line ${blockNode.startPosition.row + 1}`,
      );
    }

    return nameNode;
  }
}
