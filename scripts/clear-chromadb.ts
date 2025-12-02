#!/usr/bin/env ts-node
/**
 * Script to clear ChromaDB collection
 * Run with: npx ts-node scripts/clear-chromadb.ts
 */

import { ChromaClient } from 'chromadb';
import * as readline from 'readline';

async function clearChromaDB() {
  console.log('🗑️  ChromaDB Collection Cleaner\n');

  try {
    // Connect to ChromaDB
    const client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });

    console.log('✅ Connected to ChromaDB at:', process.env.CHROMA_URL || 'http://localhost:8000');

    // Get collection
    const collectionName = process.env.CHROMA_COLLECTION_NAME || 'rephole-collection';
    console.log(`📦 Checking collection: ${collectionName}\n`);

    let collection;
    try {
      collection = await client.getCollection({ name: collectionName });
      console.log(`✅ Collection exists: ${collectionName}`);
    } catch (error) {
      console.log(`✅ Collection does not exist: ${collectionName}`);
      console.log('   Nothing to clear!');
      return;
    }

    // Get count
    const count = await collection.count();
    console.log(`📊 Total documents: ${count}\n`);

    if (count === 0) {
      console.log('✅ Collection is already empty!');
      return;
    }

    // Confirm deletion
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `⚠️  Are you sure you want to DELETE all ${count} documents? (yes/no): `,
        (ans) => {
          rl.close();
          resolve(ans.toLowerCase());
        },
      );
    });

    if (answer !== 'yes') {
      console.log('\n❌ Operation cancelled');
      return;
    }

    console.log('\n🗑️  Deleting collection...');
    await client.deleteCollection({ name: collectionName });
    console.log('✅ Collection deleted successfully!');

    console.log('\n💡 Next steps:');
    console.log('   1. Restart your API: npm run start:api:dev');
    console.log('   2. Re-ingest your repository:');
    console.log('      curl -X POST http://localhost:3000/ingestion/repository \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"repoUrl": "https://github.com/user/repo.git", "ref": "main"}\'');
    console.log('\n   The collection will be recreated automatically with proper metadata.');

  } catch (error) {
    console.error('❌ Error clearing ChromaDB:', error);
    console.error('\n💡 Make sure ChromaDB is running:');
    console.error('   docker-compose up -d chromadb');
  }
}

// Run the script
clearChromaDB().catch(console.error);
