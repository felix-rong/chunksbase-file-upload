/**
 * Upload Service Module
 * Contains business logic for file uploads
 * Manages file handling, validation, and storage operations
 * 
 * Update: 2026-05-07
 */

const fileStore = require('../storage/fileStore');
const metadata = require('../storage/metadata');
const checksumValidator = require('../storage/checksumValidator');

/** Create a new upload resource
 * input:
 *  fileId: the unique file ID
 *  uploadData: {
 *    uploadLength: total file size in bytes
 *    uploadMetadata: optional metadata string
 *  }
 * returns: The created upload metadata
 * throws: If uploadLength is invalid
 */
async function createUpload(uploadData, fileId) {
  if (!uploadData.uploadLength || uploadData.uploadLength <= 0) {
    throw new Error('Invalid Upload-Length: must be greater than 0');
  }

  const uploadMetadata = parseMetadata(uploadData.uploadMetadata);

  return metadata.storeMetadata(fileId, {
    uploadLength: uploadData.uploadLength,
    uploadMetadata
  });
}

/**Upload a chunk of file data
 * input:
 *  fileId - The unique file ID
 *  chunkData - ChunkData{
 *   data - The chunk data
 *   offset - The upload offset
 *   checksum - Optional checksum value
 *   checksumAlgorithm - Optional checksum algorithm
 *  }
 * returns: Result object with newOffset
 * throws: Various validation errors
 */
async function uploadChunk(fileId, chunkData) {
  //1. Check if upload exists
  if (!metadata.exists(fileId)) {
    const error = new Error('Upload resource not found');
    error.statusCode = 404;
    throw error;
  }

  const uploadMetadata = metadata.getMetadata(fileId);

  //2. Validate offset
  if (chunkData.offset !== uploadMetadata.uploadOffset) {
    const error = new Error('Invalid Upload-Offset');
    error.statusCode = 409;
    throw error;
  }

  //3. Validate checksum if provided
  if (chunkData.checksum && chunkData.checksumAlgorithm) {
    if (!checksumValidator.isSupportedAlgorithm(chunkData.checksumAlgorithm)) {
      const error = new Error(`Unsupported checksum algorithm: ${chunkData.checksumAlgorithm}`);
      error.statusCode = 400;
      throw error;
    }

    const isValid = checksumValidator.validateChecksum(
      chunkData.data,
      chunkData.checksum,
      chunkData.checksumAlgorithm
    );

    if (!isValid) {
      const error = new Error('Checksum validation failed');
      error.statusCode = 460;
      throw error;
    }
  }

  //4. Write chunk to file
  const newOffset = await fileStore.writeChunk(uploadMetadata.filePath, chunkData.data, chunkData.offset);

  //5. Update metadata
  metadata.updateOffset(fileId, newOffset);
  
  return {
    newOffset,
    uploadLength: uploadMetadata.uploadLength,
    isComplete: newOffset === uploadMetadata.uploadLength
  };
}

// Get upload status by fileId
// returns {Object} Status object with offset and length
// throws {Error} If upload not found
async function getUploadStatus(fileId) {
  // Check if upload exists
  if (!metadata.exists(fileId)) {
    const error = new Error('Upload resource not found');
    error.statusCode = 404;
    throw error;
  }

  const uploadMetadata = metadata.getMetadata(fileId);

  return {
    uploadOffset: uploadMetadata.uploadOffset,
    uploadLength: uploadMetadata.uploadLength,
    isComplete: uploadMetadata.uploadOffset === uploadMetadata.uploadLength
  };
}

// Terminate an upload by fileId
// returns {Promise<void>}
// throws {Error} If upload not found
async function terminateUpload(fileId) {
  if (!metadata.exists(fileId)) {
    const error = new Error('Upload resource not found');
    error.statusCode = 404;
    throw error;
  }

  // Delete the file from storage
  await fileStore.deleteFile(fileId);

  // Delete metadata
  metadata.deleteMetadata(fileId);
}

// Parse comma-separated metadata string into an object{key: value}
// metadata String Format: "key1 value1, key2 value2" like "filename example.txt, filetype text/plain"
function parseMetadata(metadataStr) {
  const result = {};

  if (!metadataStr) {
    return result;
  }

  // Split by comma and parse each key-value pair
  const pairs = metadataStr.split(',').map(pair => pair.trim());

  for (const pair of pairs) {
    const spaceIndex = pair.indexOf(' ');
    if (spaceIndex > 0) {
      const key = pair.substring(0, spaceIndex);
      const value = pair.substring(spaceIndex + 1);
      result[key] = value;
    }
  }

  return result;
}

// Format metadata object to string
// Format: "key1 value1, key2 value2"
// Param {Object} metadataObj - {key: value}
// returns {string} Formatted metadata string
function formatMetadata(metadataObj) {
  if (!metadataObj || Object.keys(metadataObj).length === 0) {
    return '';
  }

  return Object.entries(metadataObj)
    .map(([key, value]) => `${key} ${value}`)
    .join(', ');
}

module.exports = {
  createUpload,
  uploadChunk,
  getUploadStatus,
  terminateUpload,
  parseMetadata,
  formatMetadata
};
