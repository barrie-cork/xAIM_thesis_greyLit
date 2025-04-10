/**
 * Cache Cleanup Script
 * 
 * This script can be run periodically to clean up outdated cache entries
 * It can be scheduled as a cron job or run manually
 * 
 * Usage: npx ts-node src/scripts/cache-cleanup.ts [retention_days]
 * 
 * Optional argument:
 * - retention_days: Number of days to keep cache entries (default: 7)
 */

import { PrismaClient } from '@prisma/client';
import { CacheService } from '../lib/search/cache-service';

// Parse arguments
const args = process.argv.slice(2);
const retentionDays = args.length > 0 ? parseInt(args[0], 10) : 7;

// Validate input
if (isNaN(retentionDays) || retentionDays < 0) {
  console.error('Error: retention_days must be a positive number');
  process.exit(1);
}

// Convert days to seconds
const retentionSeconds = retentionDays * 24 * 60 * 60;

// Main cleanup function
async function cleanupCache() {
  console.log(`Starting cache cleanup with ${retentionDays} day retention period...`);
  
  const prisma = new PrismaClient();
  let deletedCount = 0;
  
  try {
    // Initialize cache service
    const cacheService = new CacheService(prisma, {
      ttl: retentionSeconds, // Use the same retention period for TTL
      enabled: true
    });
    
    // Clean up memory cache (in case the script is running in a long-lived process)
    cacheService.cleanup();
    console.log('In-memory cache cleaned up');
    
    // Clean up database entries
    deletedCount = await cacheService.cleanupDatabase(retentionSeconds);
    console.log(`Database cache cleaned up: ${deletedCount} outdated entries removed`);
    
    // Log cache statistics
    const stats = cacheService.getStats();
    console.log('Cache statistics:', stats);
    
  } catch (error) {
    console.error('Error during cache cleanup:', error);
    process.exit(1);
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
  
  console.log('Cache cleanup completed successfully');
  return deletedCount;
}

// Run the cleanup if this file is executed directly
if (require.main === module) {
  cleanupCache()
    .then(count => {
      console.log(`Cache cleanup completed. Removed ${count} outdated entries.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Cache cleanup failed:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
export { cleanupCache }; 