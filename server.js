/**
 * Server Startup Module
 * Starts the Express server on the specified port
 * Handles graceful shutdown on SIGTERM and SIGINT signals
 * Author: Liyu Wu
 * Update: 2026-05-05
 */

const createApp = require('./app');
const { PORT, HOST } = require('./util/config')

const app = createApp();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
 File Upload Service Started          
 Upload Server:  http://${HOST}:${PORT}
 API Docs:       http://${HOST}:${PORT}/api-docs
  `);
});

/** 
 * Graceful shutdown
 * Ensure that all ongoing requests are completed before shutting down the service. 
 * This is important for services like large file storage.
 * SIGTERM: Sent by process managers, or systemd when stopping the container/service
 * SIGINT: Ctrl+C in terminal
*/
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

