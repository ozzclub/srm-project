import app from './app';
import { config } from './config/env';
import { testConnection } from './config/database';
import { MigrationService } from './database/migration';

const PORT = config.port;

// Test database connection and start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Run auto-migration if enabled
    if (config.autoMigrate) {
      console.log('🔄 Auto-migration is ENABLED');
      await MigrationService.runAllMigrations();
    } else {
      console.log('⏭️  Auto-migration is DISABLED');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`📂 Upload path: ${config.upload.path}`);
      console.log(`🔧 Auto-migrate: ${config.autoMigrate ? 'ON' : 'OFF'}`);
      console.log(`\n📡 API: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
