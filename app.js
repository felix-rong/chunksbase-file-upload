/**
 * Upload Service Entry Point
 * Initializes Express app and sets up middleware, OPEN API document and routes
 * 
 * Author: Liyu Wu
 * Update: 2026-05-05
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const uploadRouter = require('./uploadservice/router');
const { PORT, HOST } = require('./util/config');

/**
 * Create and configure Express app
 */
function createApp() {
  const app = express();

  // Middleware to handle raw binary data
  app.use(express.raw({ type: 'application/octet-stream', limit: '1gb' }));
  // Middleware for other content types
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));  
  app.use(cors());  

  // Load OpenAPI spec and set api-docs router
  const openapiDocument = YAML.load('./uploadservice/openapi.yaml');  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  // Frontend static files, Built-in file upload client
  app.use(express.static(path.join(__dirname, 'public')));  
  // Server API routes
  app.use('/uploadfiles', uploadRouter);

  // Capture all undefined routes. Return 404 JSON response
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
      method: req.method
    });
  });

  // Exception fallback - catch unhandled errors and return 500 JSON response
  // We use Raw Stream to implement file storage and catch unhandled exceptions.
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });

  return app;
}

module.exports = createApp;
