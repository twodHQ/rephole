import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Language,
  type Node as SyntaxNode,
  Parser,
  type QueryCapture,
} from 'web-tree-sitter';
import * as path from 'node:path';
import { TYPESCRIPT_QUERY } from '../constants/queries';

export interface CodeChunk {
  id: string; // Format: "filePath:name:nodeType:L{line}" e.g., "auth.service.ts:login:method_definition:L45"
  type: string; // Node type: "method_definition", "get_accessor", "set_accessor", "class_declaration", etc.
  content: string; // The code snippet
  startLine: number;
  endLine: number;
}

@Injectable()
export class AstSplitterService implements OnModuleInit {
  private parser!: Parser;
  private tsLanguage!: Language;
  private readonly logger = new Logger(AstSplitterService.name);

  async onModuleInit() {
    this.logger.debug('Initializing Tree-Sitter Parser...');
    await Parser.init();
    this.logger.debug('Parser.init() completed');

    // Load WASM grammar (Ensure these files exist in your build!)
    const wasmPath = path.resolve(
      process.cwd(),
      'resources/tree-sitter-typescript.wasm',
    );
    this.logger.debug(`Loading TypeScript grammar from: ${wasmPath}`);
    this.tsLanguage = await Language.load(wasmPath);
    this.logger.debug('TypeScript grammar loaded successfully');

    this.parser = new Parser();
    this.parser.setLanguage(this.tsLanguage);
    this.logger.debug('Tree-Sitter Parser initialized and language set');
  }

  /**
   * Smartly splits code into semantic chunks
   */
  split(fileName: string, content: string): CodeChunk[] {
    this.logger.debug(
      `Splitting file: ${fileName} (${content.length} characters)`,
    );
    const tree = this.parser.parse(content);

    if (!tree) {
      this.logger.warn(`Failed to parse ${fileName}`);
      return [];
    }

    this.logger.debug(
      `Parsed syntax tree with ${tree.rootNode.childCount} top-level nodes`,
    );

    const query = this.tsLanguage.query(TYPESCRIPT_QUERY);
    this.logger.debug('TypeScript query created');

    // 1. Run the query to find all "blocks" (functions, classes)
    const captures = query.captures(tree.rootNode);
    this.logger.debug(`Found ${captures.length} total captures`);

    const chunks: CodeChunk[] = [];
    const processedRanges = new Set<string>(); // To avoid duplicates

    const blockCaptures = captures.filter((c) => c.name === 'block');
    this.logger.debug(
      `Processing ${blockCaptures.length} block captures for ${fileName}`,
    );

    for (const capture of captures) {
      if (capture.name !== 'block') continue;

      const node = capture.node;
      this.logger.debug(
        `Processing ${node.type} at line ${node.startPosition.row + 1}`,
      );

      // 2. Resolve the "Name" of this block (for Metadata)
      // The query captures @name inside @block. We find the closest @name capture.
      const nameNode = this.findNameNode(captures, node);
      const name = nameNode ? nameNode.text : 'anonymous';
      this.logger.debug(`Resolved block name: ${name} (type: ${node.type})`);

      // 3. Context Expansion: Include Decorators & Comments
      // Tree-sitter nodes usually start AT the keyword (e.g., 'class').
      // We must check previous siblings for @Injectable() or JSDoc.
      const { startNode, endNode } = this.expandContext(node);

      // Create unique key to prevent overlap (e.g. Method inside Class)
      // Strategy: If we are extracting methods, we might NOT want to extract the whole class
      // as a duplicate. Or we extract the class *signature* only.
      // For simplicity here, we extract everything but you might want logic to
      // ignore a Class if you extracted its methods.

      const chunkContent = content.substring(
        startNode.startIndex,
        endNode.endIndex,
      );

      // Generate unique ID using helper function
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
   * Helper: Find the previous comments/decorators
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
