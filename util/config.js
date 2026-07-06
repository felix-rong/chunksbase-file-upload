/**
 * Configuration Module
 * Sets up server configuration values from environment variables or defaults
 * Update: 2024-05-07
 */

'use strict';
// load dotenv module to read .env file
require('dotenv').config();

// set port with Environment variable "SERVER_PORT" or use 8080 as default.
const PORT = process.env.SERVER_PORT || 3000;
const HOST = process.env.SERVER_HOST || 'localhost';

// set runtime environment to switch between logic, depending on environment (production, development, ...).
const NODE_ENV = process.env.NODE_ENV || 'development';

// set upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || './file_repository';

// export configurations
module.exports = { NODE_ENV, PORT, HOST, UPLOAD_DIR };