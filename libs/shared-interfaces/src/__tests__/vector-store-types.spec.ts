import {
    BaseMetadata,
    ChromaMetadata,
    FileUploadMetadata,
    RepositoryMetadata,
    VectorMetadata,
} from '../vector-store-types';

describe('Vector Store Type Definitions', () => {
    describe('BaseMetadata', () => {
        it('should create a valid BaseMetadata object with all required fields', () => {
            const metadata: BaseMetadata = {
                id: 'chunk_01HXYZ',
                category: 'file_upload',
                workspaceId: 'ws_01HXYZ',
                userId: 'user_01HXYZ',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'documents/report.pdf',
                fileType: '.pdf',
            };

            expect(metadata.id).toBe('chunk_01HXYZ');
            expect(metadata.category).toBe('file_upload');
            expect(metadata.workspaceId).toBe('ws_01HXYZ');
            expect(metadata.userId).toBe('user_01HXYZ');
            expect(metadata.timestamp).toBe('2025-11-25T14:55:00.000Z');
            expect(metadata.filePath).toBe('documents/report.pdf');
            expect(metadata.fileType).toBe('.pdf');
        });

        it('should create BaseMetadata with optional fields', () => {
            const metadata: BaseMetadata = {
                id: 'chunk_01HXYZ',
                category: 'repository',
                workspaceId: 'ws_01HXYZ',
                userId: 'user_01HXYZ',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'src/app.ts',
                fileType: '.ts',
                chunkIndex: 0,
                chunkType: 'function',
                parentId: 'doc_01HXYZ',
            };

            expect(metadata.chunkIndex).toBe(0);
            expect(metadata.chunkType).toBe('function');
            expect(metadata.parentId).toBe('doc_01HXYZ');
        });

        it('should enforce required fields at compile time', () => {
            // This test verifies TypeScript compilation, not runtime
            // If this compiles, required fields are correctly enforced
            const metadata: BaseMetadata = {
                id: 'test',
                category: 'file_upload',
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-01-01T00:00:00.000Z',
                filePath: 'test.txt',
                fileType: '.txt',
            };

            expect(metadata).toBeDefined();
        });

        it('should accept valid timestamp ISO 8601 strings', () => {
            const validTimestamps = [
                '2025-11-25T14:55:00.000Z',
                '2025-01-01T00:00:00.000Z',
                '2024-12-31T23:59:59.999Z',
            ];

            validTimestamps.forEach((timestamp) => {
                const metadata: BaseMetadata = {
                    id: 'test',
                    category: 'file_upload',
                    workspaceId: 'ws',
                    userId: 'user',
                    timestamp,
                    filePath: 'test.txt',
                    fileType: '.txt',
                };

                expect(metadata.timestamp).toBe(timestamp);
                expect(new Date(metadata.timestamp).toISOString()).toBe(timestamp);
            });
        });

        it('should support all category types', () => {
            const categories: Array<BaseMetadata['category']> = [
                'repository',
                'file_upload',
                'generated_doc',
                'jira_ticket',
            ];

            categories.forEach((category) => {
                const metadata: BaseMetadata = {
                    id: 'test',
                    category,
                    workspaceId: 'ws',
                    userId: 'user',
                    timestamp: '2025-11-25T14:55:00.000Z',
                    filePath: 'test.txt',
                    fileType: '.txt',
                };

                expect(metadata.category).toBe(category);
            });
        });
    });

    describe('RepositoryMetadata', () => {
        it('should create a valid RepositoryMetadata object', () => {
            const metadata: RepositoryMetadata = {
                // BaseMetadata fields
                id: 'src/app.ts:main:function:L10',
                category: 'repository',
                workspaceId: 'ws_01HXYZ',
                userId: 'user_01HXYZ',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'src/app.ts',
                fileType: '.ts',
                chunkIndex: 0,
                chunkType: 'function',
                parentId: 'src/app.ts',
                // Repository-specific fields
                repositoryId: 'repo_01HXYZ',
                functionName: 'main',
                startLine: 10,
                endLine: 20,
            };

            expect(metadata.category).toBe('repository');
            expect(metadata.repositoryId).toBe('repo_01HXYZ');
            expect(metadata.functionName).toBe('main');
            expect(metadata.startLine).toBe(10);
            expect(metadata.endLine).toBe(20);
        });

        it('should enforce category as "repository"', () => {
            const metadata: RepositoryMetadata = {
                id: 'test',
                category: 'repository', // Must be 'repository'
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'src/test.ts',
                fileType: '.ts',
                repositoryId: 'repo_123',
            };

            expect(metadata.category).toBe('repository');
        });

        it('should allow optional repository-specific fields', () => {
            const metadata: RepositoryMetadata = {
                id: 'test',
                category: 'repository',
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'src/config.ts',
                fileType: '.ts',
                repositoryId: 'repo_123',
                // No functionName, startLine, endLine
            };

            expect(metadata.functionName).toBeUndefined();
            expect(metadata.startLine).toBeUndefined();
            expect(metadata.endLine).toBeUndefined();
        });

        it('should support complex chunk IDs from AST parser', () => {
            const metadata: RepositoryMetadata = {
                id: 'libs/ui/src/lib/shared/abstract-mat-form-field.ts:controlType:get_accessor:L45',
                category: 'repository',
                workspaceId: 'ws_01',
                userId: 'user_01',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'libs/ui/src/lib/shared/abstract-mat-form-field.ts',
                fileType: '.ts',
                repositoryId: 'repo_01',
                functionName: 'controlType',
                chunkType: 'get_accessor',
                startLine: 45,
                endLine: 48,
            };

            expect(metadata.id).toContain(':');
            expect(metadata.id).toContain('L45');
        });
    });

    describe('FileUploadMetadata', () => {
        it('should create a valid FileUploadMetadata object', () => {
            const metadata: FileUploadMetadata = {
                // BaseMetadata fields
                id: 'doc_01HXYZ_0',
                category: 'file_upload',
                workspaceId: 'ws_01HXYZ',
                userId: 'user_01HXYZ',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'Q4-Report.pdf',
                fileType: '.pdf',
                chunkIndex: 0,
                chunkType: 'paragraph',
                parentId: 'doc_01HXYZ',
                // FileUpload-specific fields
                documentId: 'doc_01HXYZ',
                sourceFormat: 'pdf',
                pageNumber: 1,
            };

            expect(metadata.category).toBe('file_upload');
            expect(metadata.documentId).toBe('doc_01HXYZ');
            expect(metadata.sourceFormat).toBe('pdf');
            expect(metadata.pageNumber).toBe(1);
        });

        it('should enforce category as "file_upload"', () => {
            const metadata: FileUploadMetadata = {
                id: 'test',
                category: 'file_upload', // Must be 'file_upload'
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'report.pdf',
                fileType: '.pdf',
                documentId: 'doc_123',
            };

            expect(metadata.category).toBe('file_upload');
        });

        it('should allow optional file-specific fields', () => {
            const metadata: FileUploadMetadata = {
                id: 'test',
                category: 'file_upload',
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'notes.txt',
                fileType: '.txt',
                documentId: 'doc_123',
                // No sourceFormat, pageNumber
            };

            expect(metadata.sourceFormat).toBeUndefined();
            expect(metadata.pageNumber).toBeUndefined();
        });

        it('should support various file formats', () => {
            const formats = [
                {ext: '.pdf', mime: 'application/pdf', format: 'pdf'},
                {
                    ext: '.docx',
                    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    format: 'docx',
                },
                {ext: '.txt', mime: 'text/plain', format: 'txt'},
                {ext: '.csv', mime: 'text/csv', format: 'csv'},
                {ext: '.md', mime: 'text/markdown', format: 'markdown'},
            ];

            formats.forEach(({ext, format}) => {
                const metadata: FileUploadMetadata = {
                    id: `doc_${format}_0`,
                    category: 'file_upload',
                    workspaceId: 'ws',
                    userId: 'user',
                    timestamp: '2025-11-25T14:55:00.000Z',
                    filePath: `document${ext}`,
                    fileType: ext,
                    documentId: `doc_${format}`,
                    sourceFormat: format,
                };

                expect(metadata.fileType).toBe(ext);
                expect(metadata.sourceFormat).toBe(format);
            });
        });
    });

    describe('Type Compatibility', () => {
        it('should allow BaseMetadata to be assigned to VectorMetadata', () => {
            const baseMetadata: BaseMetadata = {
                id: 'test',
                category: 'file_upload',
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'test.txt',
                fileType: '.txt',
            };

            const vectorMetadata: VectorMetadata = baseMetadata;
            expect(vectorMetadata.id).toBe('test');
        });

        it('should allow RepositoryMetadata to be assigned to BaseMetadata', () => {
            const repoMetadata: RepositoryMetadata = {
                id: 'test',
                category: 'repository',
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'src/test.ts',
                fileType: '.ts',
                repositoryId: 'repo_123',
            };

            const baseMetadata: BaseMetadata = repoMetadata;
            expect(baseMetadata.id).toBe('test');
        });

        it('should allow FileUploadMetadata to be assigned to BaseMetadata', () => {
            const fileMetadata: FileUploadMetadata = {
                id: 'test',
                category: 'file_upload',
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'test.pdf',
                fileType: '.pdf',
                documentId: 'doc_123',
            };

            const baseMetadata: BaseMetadata = fileMetadata;
            expect(baseMetadata.id).toBe('test');
        });
    });

    describe('ChromaDB Compatibility', () => {
        it('should only contain ChromaDB-compatible value types', () => {
            const metadata: RepositoryMetadata = {
                id: 'test',
                category: 'repository',
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'src/test.ts',
                fileType: '.ts',
                repositoryId: 'repo_123',
                functionName: 'testFunc',
                startLine: 10,
                endLine: 20,
            };

            // Verify all values are ChromaDB-compatible (string | number | boolean | null)
            Object.values(metadata).forEach((value) => {
                const type = typeof value;
                expect(['string', 'number', 'boolean', 'object'].includes(type)).toBe(
                    true,
                );
                if (type === 'object') {
                    expect(value).toBeNull(); // Only null objects are allowed
                }
            });
        });

        it('should be castable to ChromaMetadata', () => {
            const repoMetadata: RepositoryMetadata = {
                id: 'test',
                category: 'repository',
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'src/test.ts',
                fileType: '.ts',
                repositoryId: 'repo_123',
            };

            const chromaMetadata = repoMetadata as ChromaMetadata;
            expect(chromaMetadata).toBeDefined();
            expect(chromaMetadata.id).toBe('test');
        });
    });

    describe('Interface Inheritance Chain', () => {
        it('should maintain correct inheritance: BaseMetadata -> ApplicationMetadata -> VectorMetadata', () => {
            const metadata: BaseMetadata = {
                id: 'test',
                category: 'file_upload',
                workspaceId: 'ws',
                userId: 'user',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'test.txt',
                fileType: '.txt',
            };

            // Should have VectorMetadata fields
            expect(metadata.id).toBeDefined();

            // Should have ApplicationMetadata fields
            expect(metadata.workspaceId).toBeDefined();
            expect(metadata.category).toBeDefined();

            // Should have BaseMetadata fields
            expect(metadata.userId).toBeDefined();
            expect(metadata.timestamp).toBeDefined();
            expect(metadata.filePath).toBeDefined();
            expect(metadata.fileType).toBeDefined();
        });
    });

    describe('Cross-Category Query Support', () => {
        it('should support querying by workspaceId across categories', () => {
            const repoMeta: RepositoryMetadata = {
                id: 'repo_chunk',
                category: 'repository',
                workspaceId: 'ws_shared',
                userId: 'user_01',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'src/app.ts',
                fileType: '.ts',
                repositoryId: 'repo_01',
            };

            const fileMeta: FileUploadMetadata = {
                id: 'file_chunk',
                category: 'file_upload',
                workspaceId: 'ws_shared',
                userId: 'user_01',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'doc.pdf',
                fileType: '.pdf',
                documentId: 'doc_01',
            };

            // Both should be queryable by workspaceId
            expect(repoMeta.workspaceId).toBe('ws_shared');
            expect(fileMeta.workspaceId).toBe('ws_shared');
        });

        it('should support querying by userId across categories', () => {
            const metadata1: RepositoryMetadata = {
                id: 'repo_chunk',
                category: 'repository',
                workspaceId: 'ws_01',
                userId: 'user_shared',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'src/app.ts',
                fileType: '.ts',
                repositoryId: 'repo_01',
            };

            const metadata2: FileUploadMetadata = {
                id: 'file_chunk',
                category: 'file_upload',
                workspaceId: 'ws_01',
                userId: 'user_shared',
                timestamp: '2025-11-25T14:55:00.000Z',
                filePath: 'doc.pdf',
                fileType: '.pdf',
                documentId: 'doc_01',
            };

            expect(metadata1.userId).toBe('user_shared');
            expect(metadata2.userId).toBe('user_shared');
        });

        it('should support temporal queries by timestamp across categories', () => {
            const timestamp = '2025-11-25T14:55:00.000Z';

            const repoMeta: RepositoryMetadata = {
                id: 'repo_chunk',
                category: 'repository',
                workspaceId: 'ws_01',
                userId: 'user_01',
                timestamp,
                filePath: 'src/app.ts',
                fileType: '.ts',
                repositoryId: 'repo_01',
            };

            const fileMeta: FileUploadMetadata = {
                id: 'file_chunk',
                category: 'file_upload',
                workspaceId: 'ws_01',
                userId: 'user_01',
                timestamp,
                filePath: 'doc.pdf',
                fileType: '.pdf',
                documentId: 'doc_01',
            };

            expect(repoMeta.timestamp).toBe(timestamp);
            expect(fileMeta.timestamp).toBe(timestamp);
            expect(new Date(repoMeta.timestamp).getTime()).toBe(
                new Date(fileMeta.timestamp).getTime(),
            );
        });
    });
});
