#!/usr/bin/env ts-node
/**
 * Diagnostic script to check ChromaDB contents
 * Run with: npx ts-node scripts/check-chromadb.ts
 */

import { ChromaClient } from 'chromadb';

async function checkChromaDB() {
  console.log('🔍 Checking ChromaDB contents...\n');

  try {
    // Connect to ChromaDB
    const client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });

    console.log(
      '✅ Connected to ChromaDB at:',
      process.env.CHROMA_URL || 'http://localhost:8000',
    );

    // Get or create collection
    const collectionName =
      process.env.CHROMA_COLLECTION_NAME || 'br-ai-n-collection';
    console.log(`📦 Checking collection: ${collectionName}\n`);

    let collection;
    try {
      collection = await client.getCollection({ name: collectionName });
      console.log(`✅ Collection exists: ${collectionName}`);
    } catch (error) {
      console.log(`❌ Collection does not exist: ${collectionName}`);
      console.log(
        '\n💡 Tip: Run repository ingestion first to populate the vector store.',
      );
      return;
    }

    // Get collection count
    const count = await collection.count();
    console.log(`📊 Total documents in collection: ${count}\n`);

    if (count === 0) {
      console.log('❌ Vector store is EMPTY!');
      console.log('\n💡 To populate the vector store:');
      console.log('   1. Make sure your API is running: npm run start:api:dev');
      console.log('   2. Ingest a repository:');
      console.log(
        '      curl -X POST http://localhost:3000/ingestion/repository \\',
      );
      console.log('        -H "Content-Type: application/json" \\');
      console.log(
        '        -d \'{"repoUrl": "https://github.com/user/repo.git", "ref": "main"}\'',
      );
      return;
    }

    // Get sample documents (first 10)
    console.log('📄 Sample documents (first 10):\n');
    const result = await collection.get({
      limit: 10,
      include: ['metadatas', 'documents'],
    });

    if (result.ids && result.ids.length > 0) {
      result.ids.forEach((id, index) => {
        const metadata =
          (result.metadatas?.[index] as Record<string, any>) || {};
        const doc = (result.documents?.[index] as string) || '';

        console.log(`${index + 1}. ID: ${id}`);
        console.log(`   File: ${metadata.filePath || 'N/A'}`);
        console.log(`   Function: ${metadata.functionName || 'N/A'}`);
        console.log(`   Type: ${metadata.type || 'N/A'}`);
        console.log(`   RepoId: ${metadata.repoId || 'N/A'}`);
        console.log(`   Content: ${doc.substring(0, 80)}...`);
        console.log('');
      });
    }

    // Get unique repoIds
    console.log('🔑 Unique RepoIds in vector store:\n');
    const allDocs = await collection.get({
      include: ['metadatas'],
    });

    const repoIds = new Set<string>();
    if (allDocs.metadatas) {
      allDocs.metadatas.forEach((metadata: any) => {
        if (metadata?.repoId) {
          repoIds.add(metadata.repoId);
        }
      });
    }

    if (repoIds.size === 0) {
      console.log('❌ No repoIds found in metadata!');
      console.log(
        '   This is unusual - documents should have repoId metadata.',
      );
    } else {
      Array.from(repoIds).forEach((repoId, index) => {
        console.log(`   ${index + 1}. ${repoId}`);
      });
    }

    // Get file paths
    console.log('\n📁 Sample file paths (first 20):\n');
    const filePaths = new Set<string>();
    if (allDocs.metadatas) {
      allDocs.metadatas.forEach((metadata: any) => {
        if (metadata?.filePath) {
          filePaths.add(metadata.filePath);
        }
      });
    }

    Array.from(filePaths)
      .slice(0, 20)
      .forEach((filePath, index) => {
        console.log(`   ${index + 1}. ${filePath}`);
      });

    if (filePaths.size > 20) {
      console.log(`   ... and ${filePaths.size - 20} more files`);
    }

    console.log('\n✅ ChromaDB check complete!');
    console.log('\n💡 To generate project documentation:');
    console.log(
      '   curl http://localhost:3000/ingestion/docs/project/<REPO_ID>',
    );
    console.log('\n   Replace <REPO_ID> with one of the repoIds listed above.');
  } catch (error) {
    console.error('❌ Error checking ChromaDB:', error);
    console.error('\n💡 Make sure ChromaDB is running:');
    console.error('   docker-compose up -d chromadb');
  }
}

// Run the check
checkChromaDB().catch(console.error);
