/**
 * Upload Router Module
 * Defines routes for the file upload service
 * Routes are mapped to controller methods
 * 
 * Update: 2026-05-01
 */

const express = require('express');
const controller = require('./controller');
const router = express.Router();

router.post('/', controller.handleCreateUpload);
router.patch('/:fileId', controller.handleUploadChunk);
router.head('/:fileId', controller.handleGetUploadStatus);
router.delete('/:fileId', controller.handleTerminateUpload);

module.exports = router;
