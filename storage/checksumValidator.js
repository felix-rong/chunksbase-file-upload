/**
 * Checksum Validation Module
 * Validates checksums of uploaded chunks using various algorithms
 * Author: Liyu Wu
 * Update: 2026-05-07
 */

const crypto = require('crypto');


// Supported checksum algorithms
const SUPPORTED_ALGORITHMS = ['sha1', 'md5', 'sha256', 'sha512'];

// Calculate checksum for given data and algorithm(sha1, md5, sha256, sha512)
// returns {string} The calculated checksum
// throws {Error} If algorithm is not supported
function calculateChecksum(data, algorithm) {
  if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
    throw new Error(`Unsupported checksum algorithm: ${algorithm}`);
  }

  const hash = crypto.createHash(algorithm); // initialize hash object with specified algorithm
  hash.update(data); // calculate hash of the data
  return hash.digest('hex'); // return the checksum in hexadecimal format
}


// Validate checksum
// Param:
//  1.data {Buffer}- The data to validate
//  2.expectedChecksum {string} - The expected checksum value
//  3.algorithm {string} - The checksum algorithm used
// returns {boolean} True if checksum matches, false otherwise
function validateChecksum(data, expectedChecksum, algorithm) {
  const calculatedChecksum = calculateChecksum(data, algorithm);
  return calculatedChecksum === expectedChecksum;
}


// Check if an algorithm is supported
function isSupportedAlgorithm(algorithm) {
  return SUPPORTED_ALGORITHMS.includes(algorithm.toLowerCase());
}


// Parse checksum header value
// String Format: "<algorithm> <checksum>"
//  Example: "sha1 2ef7bde608ce5404e97d5f042f95f89f1c232871"
// returns {Object} { algorithm, checksum } or null if invalid format
function parseChecksumHeader(checksumHeaderValue) {
  if (!checksumHeaderValue) {
    return null;
  }

  const parts = checksumHeaderValue.trim().split(/\s+/);
  if (parts.length !== 2) {
    return null;
  }

  return {
    algorithm: parts[0].toLowerCase(),
    checksum: parts[1]
  };
}

module.exports = {
  calculateChecksum,
  validateChecksum,
  isSupportedAlgorithm,
  parseChecksumHeader,
  SUPPORTED_ALGORITHMS
};
