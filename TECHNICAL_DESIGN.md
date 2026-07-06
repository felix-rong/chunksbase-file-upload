# File Upload Service - Technical Design Document

## Overview

This document outlines the technical design and architecture decisions for the multipart file upload service implementation.

## Design Principles

### 1. **Separation of Concerns**
The implementation is divided into distinct layers, each with a specific responsibility:

```
┌─────────────────────────────┐
│   HTTP/REST Layer           │  controller.js
│   (Request → Response)      │
├─────────────────────────────┤
│   Business Logic Layer      │  uploadservice.js
│   (Validation, Orchestration)
├─────────────────────────────┤
│   Storage Abstraction       │  fileStore.js, metadata.js
│   (File I/O, Data Access)   │
└─────────────────────────────┘
```

**Benefits:**
- Testability: Each layer can be tested independently
- Maintainability: Changes in one layer don't affect others
- Extensibility: Easy to swap storage implementations
- Reusability: Business logic can be used by different interfaces (REST, gRPC, etc.)

### 2. **Stateless Design**
- No session state stored in server memory (except in-memory metadata store)
- Metadata is keyed by fileId, allowing stateless operations
- Supports horizontal scaling with proper persistence layer

### 3. **Stream-Based File Operations**
- Uses Node.js raw streams instead of buffering entire files
- Efficient memory usage even for very large files
- Supports partial reads/writes at specific offsets

## Architectural Components

### HTTP Layer (controller.js)

**Responsibilities:**
- Extract and validate HTTP headers
- Parse request body (binary data)
- Construct HTTP responses with appropriate headers
- Handle HTTP-specific error cases (400, 404, 409, etc.)

**Key Methods:**
- `extractUploadLength()` - Validates Upload-Length header
- `extractUploadOffset()` - Validates Upload-Offset header
- `extractContentLength()` - Validates Content-Length header
- `extractChecksum()` - Parses checksum headers
- `handleCreateUpload()` - POST handler
- `handleUploadChunk()` - PATCH handler
- `handleGetUploadStatus()` - HEAD handler
- `handleTerminateUpload()` - DELETE handler

**Design Decisions:**
- Separates header extraction from validation
- Clear error messages with specific HTTP status codes
- Validates headers before calling service layer
- Converts HTTP errors to appropriate status codes

### Business Logic Layer (uploadservice.js)

**Responsibilities:**
- Validate business rules and state
- Orchestrate storage operations
- Manage upload lifecycle
- Calculate new offsets

**Key Methods:**
- `createUpload()` - Initialize new upload
- `uploadChunk()` - Process chunk upload with validation
- `getUploadStatus()` - Retrieve upload metadata
- `terminateUpload()` - Cleanup upload resources
- `parseMetadata()` / `formatMetadata()` - Metadata serialization

**Design Decisions:**
- Returns business objects, not HTTP responses
- Throws errors with statusCode property for HTTP mapping
- Validates offset before writing
- Validates checksums before accepting chunks

### Storage Layer

#### fileStore.js (File I/O)
**Responsibilities:**
- Read/write file chunks using Node.js streams
- Handle file size queries
- Manage file deletion
- Provide stream abstractions for large files

**Key Methods:**
- `writeChunk()` - Write data at specific offset
- `readChunk()` - Read data from specific offset
- `getFileSize()` - Get current file size
- `deleteFile()` - Remove file
- `fileExists()` - Check file existence
- `createWriteStream()` - Create write stream (for future optimization)
- `createReadStream()` - Create read stream (for future optimization)

**Implementation Details:**
- Uses `fs.open()` with append/read-write modes
- Seeks to offset using `fs.write()` with position parameter
- Handles file creation automatically
- Promise-based async API

#### metadata.js (Metadata Management)
**Responsibilities:**
- Store/retrieve upload metadata
- Track current offset
- Manage upload resource lifecycle

**Key Methods:**
- `storeMetadata()` - Create new upload record
- `getMetadata()` - Retrieve metadata
- `updateOffset()` - Update current offset
- `exists()` - Check if upload exists
- `deleteMetadata()` - Remove upload record
- `getAllMetadata()` - List all uploads

**Implementation Details:**
- Uses JavaScript Map for in-memory storage
- Metadata includes fileId, uploadLength, uploadOffset, uploadMetadata, timestamps
- Can be extended to use database with same interface

#### checksumValidator.js (Validation)
**Responsibilities:**
- Calculate and validate checksums
- Support multiple algorithms

**Key Methods:**
- `calculateChecksum()` - Compute checksum for data
- `validateChecksum()` - Compare calculated vs expected
- `isSupportedAlgorithm()` - Check algorithm support
- `parseChecksumHeader()` - Parse header format

**Supported Algorithms:**
- SHA1 (default)
- MD5
- SHA256
- SHA512

### Routing Layer (router.js)

**Responsibilities:**
- Define API routes
- Provide OpenAPI documentation
- Wire requests to controller methods

**Features:**
- Express middleware for routing
- Swagger/JSDoc annotations for each endpoint
- Automatic OpenAPI document generation

## File Naming Convention

Files are named with timestamp and random suffix to ensure uniqueness:

```
Format: YYYYMMDDHHmmssfff_<random>
Example: 20260504130737885_64gl9
```

**Benefits:**
- Guaranteed uniqueness
- Human-readable timestamp for debugging
- Sortable by creation time
- No database ID required for initial implementation

## Error Handling Strategy

### HTTP Status Codes
- `201 Created` - Resource created
- `204 No Content` - Successful operation
- `200 OK` - Resource found
- `400 Bad Request` - Invalid request format
- `404 Not Found` - Resource not found
- `409 Conflict` - Invalid offset
- `460 Invalid Checksum` - Checksum failed

### Error Flow
1. Controller validates HTTP format
2. Service validates business rules
3. Storage layer handles I/O errors
4. Errors bubble up with statusCode
5. Controller returns appropriate HTTP response

### Custom Status Codes
- `460` - Invalid Checksum (non-standard, per API spec)

## Metadata Format

### Upload Metadata String Format
```
"key1 value1, key2 value2, key3 value3"
```

Example:
```
"filename test.txt, filetype text/plain, author john"
```

**Parsing:**
- Split by comma
- Each pair separated by space (first space is delimiter)
- Keys cannot contain spaces
- Values can contain spaces

**Storage:**
- Stored as parsed object in metadata record
- Serialized back to string format for HTTP response

## Request/Response Flow

### Create Upload
```
POST /uploadfiles
Headers: Upload-Length, Upload-Metadata, Content-Length: 0
        ↓
controller.handleCreateUpload()
        ↓
Extract and validate headers
        ↓
Generate fileId (timestamp + random)
        ↓
uploadservice.createUpload()
        ↓
metadata.storeMetadata()
        ↓
Response: 201 Created, Location header, Echo metadata
```

### Upload Chunk
```
PATCH /uploadfiles/{fileId}
Headers: Content-Type, Content-Length, Upload-Offset
Body: Binary file data
        ↓
controller.handleUploadChunk()
        ↓
Extract and validate headers
        ↓
Validate checksum (if provided)
        ↓
uploadservice.uploadChunk()
        ↓
Validate offset against current state
        ↓
fileStore.writeChunk()
        ↓
metadata.updateOffset()
        ↓
Response: 204 No Content, Upload-Offset header
```

### Check Status
```
HEAD /uploadfiles/{fileId}
        ↓
controller.handleGetUploadStatus()
        ↓
uploadservice.getUploadStatus()
        ↓
metadata.getMetadata()
        ↓
Response: 200 OK, Upload-Offset, Upload-Length headers
```

### Terminate Upload
```
DELETE /uploadfiles/{fileId}
        ↓
controller.handleTerminateUpload()
        ↓
uploadservice.terminateUpload()
        ↓
fileStore.deleteFile()
        ↓
metadata.deleteMetadata()
        ↓
Response: 204 No Content
```

## Scalability Considerations

### Current Limitations
- In-memory metadata storage (loses state on restart)
- Single-instance deployment
- No distributed locking mechanism

### Future Improvements
1. **Database Backend**
   - Replace metadata.js with database implementation
   - Keep same interface for compatibility
   - Support PostgreSQL, MySQL, MongoDB

2. **Distributed Storage**
   - Replace fileStore.js with S3 or Azure Blob
   - Keep same Promise-based interface
   - Support multi-region uploads

## Testing Strategy

### Unit Testing
- Test each layer independently
- Mock dependencies
- Test error cases

### Integration Testing
- Test full upload flow
- Test error scenarios
- Test concurrency (multiple uploads)

### Test Coverage
- Header validation
- Checksum validation
- Offset validation
- File I/O
- Metadata management
- Error cases

### Current Test Script
The postman request collection file `Multipart Upload Test.postman_collection.json` provides integration testing of all endpoints:
- Creates upload resource
- Uploads multiple chunks
- Checks status
- Tests error cases
- Verifies cleanup

## OpenAPI Documentation

### Design Approach
- YAML file 'openapi.yaml' that conforms to the OPEN API specification
- Interactive UI with swagger-ui-express

### Documentation Includes
- Endpoint descriptions
- Request/response schemas
- Header specifications
- Status codes
- Error descriptions
- Examples

## Security Considerations

### Current Implementation
- Basic validation
- Checksum validation for integrity

### Recommendations for Production
- Authentication/Authorization
- Rate limiting per client
- File type validation
- File size quotas
- Malware scanning
- HTTPS encryption
- Access logs
- Input sanitization

## Performance Characteristics

### Time Complexity
- Create upload: O(1)
- Upload chunk: O(n) where n = chunk size (due to I/O)
- Check status: O(1)
- Terminate upload: O(1) for metadata + O(n) for file deletion

### Space Complexity
- Memory: O(m) where m = number of concurrent uploads
- Disk: O(total upload size)

### Optimization Opportunities
- Batch metadata operations
- Compression for metadata storage
- Caching frequently accessed metadata
- Stream piping for direct file copying

## Dependencies

### Core Dependencies
- **express**: Web framework
- **swagger-ui-express**: Interactive API documentation
- **dotenv**: Configuration management

### Built-in Modules
- **http**: Native HTTP server
- **fs**: File system operations
- **crypto**: Checksum calculations
- **path**: Path manipulation

## Future Enhancement Ideas

1. **Parallel Upload Support**
   - Upload-Concat header for merging chunks
   - Efficient multi-threaded uploads

2. **Advanced Metadata**
   - Custom metadata validation
   - Metadata search/filtering
   - Metadata versioning

3. **File Processing**
   - Post-upload hooks for processing
   - Compression
   - Transcoding

4. **Monitoring & Analytics**
   - Upload statistics
   - Performance metrics
   - Usage analytics

5. **Security Enhancements**
   - OAuth2/JWT authentication
   - Role-based access control
   - Encryption at rest/transit

6. **Database Integration**
   - Persistent metadata storage
   - Upload history
   - Audit trails
