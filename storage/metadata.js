/**
 * Metadata Storage Module
 * Manages upload metadata (file information, offsets, etc.)
 * This implementation uses in-memory storage, but can be extended to use databases
 * Author: Liyu Wu
 * Update: 2026-05-06
 */

const path = require('path');
const fs = require('fs');
const {UPLOAD_DIR} = require('../util/config');

// In-memory store for metadata
const metadataStore = new Map();

// Store metadata for a new upload
// returns {Object} The stored metadata
function storeMetadata(fileId, metadata) {
  // 1. Extract the original filename (handle potential case sensitivity or missing values)
  const originalFilename = metadata.uploadMetadata?.filename || '';  
  // 2. Get the file extension (e.g., '.txt'), return empty string if none
  const extension = path.extname(originalFilename);
  // 3. Construct the new disk filename: fileId + extension
  const diskFileName = extension ? `${fileId}${extension}` : fileId;
  // 4. Create the metadata record to store
  const uploadRecord = {
    fileId,           // Unique file ID
    uploadLength: metadata.uploadLength, // Total file size in bytes
    uploadOffset: 0,  // Current upload offset, initialized to 0
    uploadMetadata: metadata.uploadMetadata || {}, // Additional metadata (filename, filetype, etc.)
    createdAt: new Date(),  // Timestamp of when the upload was created
    filePath: path.join(UPLOAD_DIR, diskFileName), // Path like './file_repository/{diskFileName}'
    //diskFileName: diskFileName, // Store the disk filename for later use
  };

  metadataStore.set(fileId, uploadRecord);
  return uploadRecord;
}


// Retrieve metadata for an upload by fileId
// returns {Object|null} The metadata or null if not found
function getMetadata(fileId) {
  return metadataStore.get(fileId) || null;
}

// Update the upload offset
function updateOffset(fileId, newOffset) {
  const metadata = metadataStore.get(fileId);
  if (!metadata) {
    return null;
  }

  metadata.uploadOffset = newOffset;
  metadataStore.set(fileId, metadata);
  return metadata;
}


// Check if an upload exists
function exists(fileId) {
  return metadataStore.has(fileId);
}


// Delete metadata for an upload
// returns {boolean} True if the metadata was deleted
function deleteMetadata(fileId) {
  return metadataStore.delete(fileId);
}


// Get all uploads
// returns {Array} Array of all metadata objects
function getAllMetadata() {
  return Array.from(metadataStore.values());
}

module.exports = {
  storeMetadata,
  getMetadata,
  updateOffset,
  exists,
  deleteMetadata,
  getAllMetadata
};
