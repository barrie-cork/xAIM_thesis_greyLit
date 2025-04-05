import dotenv from 'dotenv';
// Initialize environment variables
dotenv.config();
/**
 * Main application entry point
 */
async function main() {
    try {
        console.log('Grey Literature Search App initialized successfully!');
    }
    catch (error) {
        console.error('Error starting the application:', error);
        process.exit(1);
    }
}
// Start the application
main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
