/**
 * Upload Controller Module
 * Handles HTTP request parsing, validation, and response construction
 * Author: Liyu Wu
 * Update: 2026-05-05
 */

const uploadService = require('./uploadservice');
const checksumValidator = require('../storage/checksumValidator');

// Extract Upload-Length header and validate
// Returns the upload length in bytes
function extractUploadLength(headers) {
  const uploadLength = headers['upload-length'];

  if (!uploadLength) {
    const error = new Error('Missing Upload-Length header');
    error.statusCode = 400;
    throw error;
  }

  const length = parseInt(uploadLength, 10);
  if (isNaN(length) || length <= 0) {
    const error = new Error('Invalid Upload-Length: must be a positive integer');
    error.statusCode = 400;
    throw error;
  }

  return length;
}

// Extract and parse Upload-Metadata header
// Returns the rwa string, may be empty string if header is not provided
function extractUploadMetadata(headers) {
  return headers['upload-metadata'] || '';
}

// Extract Upload-Offset header and validate
// Returns the upload offset in bytes
function extractUploadOffset(headers) {
  const uploadOffset = headers['upload-offset'];

  if (uploadOffset === undefined) {
    const error = new Error('Missing Upload-Offset header');
    error.statusCode = 400;
    throw error;
  }

  const offset = parseInt(uploadOffset, 10);
  if (isNaN(offset) || offset < 0) {
    const error = new Error('Invalid Upload-Offset: must be a non-negative integer');
    error.statusCode = 400;
    throw error;
  }

  return offset;
}

// Extract Content-Length header and validate
// Returns the content length in bytes
function extractContentLength(headers) {
  const contentLength = headers['content-length'];

  if (contentLength === undefined) {
    const error = new Error('Missing Content-Length header');
    error.statusCode = 400;
    throw error;
  }

  const length = parseInt(contentLength, 10);
  if (isNaN(length) || length < 0) {
    const error = new Error('Invalid Content-Length: must be a non-negative integer');
    error.statusCode = 400;
    throw error;
  }

  return length;
}

/**
 * Extract checksum-related headers
 * @param {Object} headers - Request headers
 * @returns {Object} { checksum: string, algorithm: string } or null
 */
function extractChecksum(headers) {
  const checksumHeader = headers['checksum'];
  const algorithmHeader = headers['checksum-algorithm'];

  if (!checksumHeader && !algorithmHeader) {
    return null;
  }

  if (checksumHeader && !algorithmHeader) {
    const error = new Error('Checksum header requires Checksum-Algorithm header');
    error.statusCode = 400;
    throw error;
  }

  if (!checksumHeader && algorithmHeader) {
    const error = new Error('Checksum-Algorithm header requires Checksum header');
    error.statusCode = 400;
    throw error;
  }

  const parsed = checksumValidator.parseChecksumHeader(checksumHeader);
  if (!parsed) {
    const error = new Error('Invalid Checksum header format. Expected: "<algorithm> <value>"');
    error.statusCode = 400;
    throw error;
  }

  return {
    checksum: parsed.checksum,
    algorithm: parsed.algorithm
  };
}

async function handleCreateUpload(req, res) {
  try {
    // Validate Content-Length is 0
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength !== 0) {
      return res.status(400).json({
        error: 'Create upload request should have no Body, Content-Length must be 0'
      });
    }
    
    // Extract headers
    const uploadLength = extractUploadLength(req.headers);
    const uploadMetadata = extractUploadMetadata(req.headers);

    // Generate file ID, like '20240505hhmmssuuu_randomstring'
    const fileId = `${new Date().toISOString().replace(/[-:T.Z]/g, '')}_${Math.random().toString(36).substr(2, 5)}`;

    // Create upload
    const result = await uploadService.createUpload(
      { uploadLength, uploadMetadata },
      fileId
    );

    // Construct response
    res.status(201)
      .set('Location', `/uploadfiles/${fileId}`)
      .set('Upload-Metadata', uploadMetadata)
      .end();

  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message
    });
  }
}

// Handle PATCH /uploadfiles/:fileId - Upload chunk
async function handleUploadChunk(req, res) {
  try {
    const fileId = req.params.fileId;

    // Extract and validate headers
    const uploadOffset = extractUploadOffset(req.headers);
    const contentLength = extractContentLength(req.headers);
    const checksumData = extractChecksum(req.headers);

    // Validate Content-Type
    const contentType = req.headers['content-type'];
    if (contentType !== 'application/offset+octet-stream') {
      return res.status(400).json({
        error: 'Invalid Content-Type. Expected: application/offset+octet-stream'
      });
    }

    // Collect body data
    // The file slice data carried in the request body of an HTTP request message 
    // is transmitted to the server in batches via multiple network packets 
    // in the form of a stream.
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);

    // Validate data size matches Content-Length
    if (data.length !== contentLength) {
      return res.status(400).json({
        error: `Data size (${data.length}) does not match Content-Length (${contentLength})`
      });
    }

    // Upload chunk
    const result = await uploadService.uploadChunk(fileId, {
      data,
      offset: uploadOffset,
      checksum: checksumData?.checksum,
      checksumAlgorithm: checksumData?.algorithm
    });
    console.log(`Received chunk for fileId ${fileId}: offset ${uploadOffset}, size ${data.length}`);

    // Construct response
    res.status(204)
      .set('Upload-Offset', result.newOffset.toString())
      .end();

  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message
    });
  }
}

// Handle HEAD /uploadfiles/:fileId - Check upload status
async function handleGetUploadStatus(req, res) {
  try {
    const fileId = req.params.fileId;

    // Get status
    const result = await uploadService.getUploadStatus(fileId);

    // Construct response
    res.status(200)
      .set('Upload-Offset', result.uploadOffset.toString())
      .set('Upload-Length', result.uploadLength.toString())
      .set('Cache-Control', 'no-store')
      .end();

  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).end();
  }
}

// Handle DELETE /uploadfiles/:fileId - Terminate upload
async function handleTerminateUpload(req, res) {
  try {
    const fileId = req.params.fileId;

    // Terminate upload
    await uploadService.terminateUpload(fileId);

    // Construct response
    res.status(204).end();

  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).end();
  }
}

module.exports = {
  handleCreateUpload,
  handleUploadChunk,
  handleGetUploadStatus,
  handleTerminateUpload,
  // Export header extraction functions for testing
  extractUploadLength,
  extractUploadMetadata,
  extractUploadOffset,
  extractContentLength,
  extractChecksum
};
