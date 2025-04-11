import { PrismaClient } from '@prisma/client';

async function verifyDatabaseStructure() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Verifying database structure...\n');

    // Test User table
    const userTableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    console.log('User table structure:', userTableInfo);

    // Test SearchRequest table
    const searchRequestTableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'search_requests'
      ORDER BY ordinal_position;
    `;
    console.log('\nSearchRequest table structure:', searchRequestTableInfo);

    // Test SearchResult table
    const searchResultTableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'search_results'
      ORDER BY ordinal_position;
    `;
    console.log('\nSearchResult table structure:', searchResultTableInfo);

    // Test ReviewTag table
    const reviewTagTableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'review_tags'
      ORDER BY ordinal_position;
    `;
    console.log('\nReviewTag table structure:', reviewTagTableInfo);

    // Test DuplicateLog table
    const duplicateLogTableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'duplicate_log'
      ORDER BY ordinal_position;
    `;
    console.log('\nDuplicateLog table structure:', duplicateLogTableInfo);

    // Verify foreign key constraints
    const foreignKeys = await prisma.$queryRaw`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `;
    console.log('\nForeign key relationships:', foreignKeys);

  } catch (error) {
    console.error('Error verifying database structure:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseStructure(); 