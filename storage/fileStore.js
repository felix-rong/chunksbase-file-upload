/**
 * File Storage Module, using filesystem for storage
 * Handles file I/O operations using Node.js raw streams
 * Supports reading and writing file chunks at specific offsets
 * Update: 2026-05-07
 */

const fs = require('fs');
const path = require('path');
const metadata = require('./metadata');
const {UPLOAD_DIR} = require('../util/config');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

//Write a chunk of data to a file at a specific offset
// returns {Promise<number>} The new offset after writing
async function writeChunk(filePath, data, offset) {
  return new Promise((resolve, reject) => {    
    //1. Open file in read-write mode, create if doesn't exist
    fs.open(filePath, 'a+', (err, fd) => {
      if (err) {
        return reject(err);
      }

      //2. Write data at the specified offset
      fs.write(fd, data, 0, data.length, offset, (err, bytesWritten) => {
        fs.close(fd, (closeErr) => {
          if (err) {
            return reject(err);
          }
          if (closeErr) {
            return reject(closeErr);
          }
          resolve(offset + bytesWritten);
        });
      });
    });
  });
}


// Delete a file by fileId
// returns {Promise<void>}
async function deleteFile(fileId) {
  return new Promise((resolve, reject) => {    
    const fileMetadata = metadata.getMetadata(fileId);
    if (!fileMetadata) {
      // No metadata means no file to delete
      return resolve();
    }
    const filePath = fileMetadata.filePath;
    fs.unlink(filePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, that's ok
          resolve();
        } else {
          reject(err);
        }
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  writeChunk,
  deleteFile,
};
