# File Upload Service API Implementation

A RESTful API for multipart file upload with resume capability, following the TUS (Tus Resumable Upload Protocol) specification.

## Project Structure

```
mutilpart-file-upload/
├── server.js                 # Server startup
├── app.js                    # Service entry point (Express app setup) and API docs
├── package.json              # Dependencies
├── .env                      # Configuration
├── uploadservice/
│   ├── router.js             # API Routes 
│   ├── controller.js         # HTTP layer (request parsing, validation, response)
│   ├── uploadservice.js      # Business logic layer
│   └── openapi.yaml          # Open Api document
├── storage/
│   ├── fileStore.js          # File I/O operations using Node.js streams
│   ├── metadata.js           # Metadata management
│   └── checksumValidator.js  # Checksum validation
├── uploadfiles/              # Uploaded files directory
├── postmanTest/              # postman test collection
│   └── Multipart Upload Test.postman_collection.json
└── public/                   # Demo client
```

## Architecture

The implementation follows a layered architecture with clear separation of concerns:

### Layer 1: Routing Layer (`uploadservice/router.js`)
- Defines API routes
- Wires requests to controller methods

### Layer 2: HTTP Layer (`uploadservice/controller.js`)
- Parses HTTP headers and validates request format
- Constructs HTTP responses with appropriate status codes and headers
- Does NOT perform file I/O, business logic, or offset calculations

### Layer 3: Business Logic Layer (`uploadservice/uploadservice.js`)
- Validates business rules (offset correctness, file existence, upload permissions)
- Orchestrates storage operations
- Returns business results (not HTTP responses)

### Layer 4: Storage Layer (`storage/`)
- `fileStore.js` - File I/O using Node.js raw streams (extensible to database)
- `metadata.js` - Metadata storage management
- `checksumValidator.js` - Checksum validation

## API Endpoints

All endpoints are documented in OpenAPI 3.0 format and automatically generated as interactive Swagger UI at `http://localhost:3000/api-docs`.

### 1. Create Upload Resource
**POST /uploadfiles**

Creates a new upload resource.

**Request Headers:**
- `Upload-Length` (required): Total file size in bytes
- `Upload-Metadata` (required): Metadata in format "key1 value1, key2 value2", must has key 'filename'
- `Content-Length`: Must be 0

**Response:**
- Status: `201 Created`
- Headers:
  - `Location`: URL of the created resource (e.g., `/uploadfiles/20260509183328976_3g2rq`)
  - `Upload-Metadata`: Echoes back the metadata

### 2. Upload File Chunk
**PATCH /uploadfiles/{fileId}**

Uploads a chunk of file data at a specific offset.

**Request Headers:**
- `Content-Type` (required): `application/offset+octet-stream`
- `Content-Length` (required): Size of the chunk
- `Upload-Offset` (required): Offset where chunk should be written
- `Checksum` (optional): In format "algorithm value"
- `Checksum-Algorithm` (optional): sha1, md5, sha256, sha512

**Response:**
- Status: `204 No Content` (success) or `409 Conflict` (offset mismatch) or `404 Not Found` or `460: Invalid Checksum`
- Headers:
  - `Upload-Offset`: New offset for next chunk

### 3. Check Upload Status
**HEAD /uploadfiles/{fileId}**

Retrieves the current upload status.

**Response:**
- Status: `200 OK` or `404 Not Found`
- Headers:
  - `Upload-Offset`: Current offset
  - `Upload-Length`: Total size
  - `Cache-Control`: no-store

### 4. Terminate Upload
**DELETE /uploadfiles/{fileId}**

Terminates the upload and frees resources.

**Response:**
- Status: `204 No Content` or `404 Not Found`

## Installation and Usage

### Prerequisites
- Node.js 14+
- npm

### Installation
```bash
cd mutilpart-file-upload
npm install
```

### Running the Server
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

You can configure the port and host via environment variables:
```bash
SERVER_PORT=8080 SERVER_HOST=0.0.0.0 npm start
```

### Accessing API Documentation
Open `http://localhost:3000/api-docs` in your browser to see the interactive Swagger UI.

### Running Tests
Import the postman collection file 'Multipart Upload Test.postman_collection.json' into postman, run the test collecton.

## Example Usage

The service also provides a default client for file upload functionality. Access the URL: http://localhost:3000

### Create an Upload
```bash
curl -X POST http://localhost:3000/uploadfiles \
  -H "Upload-Length: 1000000" \
  -H "Upload-Metadata: filename myfile.zip, filetype application/zip" \
  -H "Content-Length: 0"
```

Response:
```
HTTP/1.1 201 Created
Location: /uploadfiles/2026_05_04_13_07_37_885__64gl96t29
Upload-Metadata: filename myfile.zip, filetype application/zip
```

### Upload a Chunk
```bash
curl -X PATCH http://localhost:3000/uploadfiles/2026_05_04_13_07_37_885__64gl96t29 \
  -H "Content-Type: application/offset+octet-stream" \
  -H "Content-Length: 1024" \
  -H "Upload-Offset: 0" \
  --data-binary @chunk1.bin
```

Response:
```
HTTP/1.1 204 No Content
Upload-Offset: 1024
```

### Check Status
```bash
curl -I http://localhost:3000/uploadfiles/2026_05_04_13_07_37_885__64gl96t29
```

Response:
```
HTTP/1.1 200 OK
Upload-Offset: 1024
Upload-Length: 1000000
Cache-Control: no-store
```

### Terminate Upload
```bash
curl -X DELETE http://localhost:3000/uploadfiles/2026_05_04_13_07_37_885__64gl96t29
```

Response:
```
HTTP/1.1 204 No Content
```

## OpenAPI Documentation

The API is fully documented using OpenAPI 3.0 standard. The documentation includes:

- All endpoints with HTTP methods
- Request/response schemas
- Header specifications
- Status codes and error scenarios
- Example values

The Swagger UI is available at `/api-docs`.

## Storage Implementation

### Current Implementation
- **File Storage**: Node.js raw streams with `fs` module
- **Metadata Storage**: In-memory storage (Map)

### Future Extensions
The layered architecture allows easy extension to:
- Database storage (PostgreSQL, MySQL, MongoDB) for metadata
- Cloud storage (AWS S3, Azure Blob) for files
- Distributed storage systems

The storage layer is isolated in `/storage/` directory for easy swapping.

## Error Handling

The API returns appropriate HTTP status codes:

- `201 Created`: Upload resource successfully created
- `204 No Content`: Chunk uploaded successfully or resource terminated
- `200 OK`: Status check successful
- `400 Bad Request`: Invalid request headers
- `404 Not Found`: Upload resource not found
- `409 Conflict`: Invalid offset (resume position)
- `460 Invalid Checksum`: Checksum validation failed

## Features Implemented

✓ Create upload resources  
✓ Upload file chunks with offset  
✓ Resume interrupted uploads  
✓ Checksum validation (SHA1, MD5, SHA256, SHA512)  
✓ Upload status checking  
✓ Upload termination and cleanup  
✓ OpenAPI/Swagger documentation  
✓ Proper error handling and validation  
✓ Layered architecture for separation of concerns  

## Features Not Yet Implemented

These features are outlined in the API specification for future implementation:

- Upload-Defer-Length (unknown file size)
- Parallel upload concatenation (Upload-Concat)
- Advanced metadata handling
- Database backend for production use

## Testing

A comprehensive postman request collection with test script (`Multipart Upload Test.postman_collection.json`) is included that tests:

1. Create upload with metadata
2. Upload first chunk
3. Upload second chunk with invalid file ID
4. Upload second chunk with invalid checksum
5. Upload second chunk with correct checksum
6. Check upload status
7. Terminated currect upload
8. Upload third chunk (now upload resource not exist)

All tests verify both successful operations and error cases.

## Configuration

Edit `.env` to configure:

```env
SERVER_PORT=3000            # Server port
SERVER_HOST=localhost       # Server host
NODE_ENV=development        # Environment
UPLOAD_DIR=./uploadfiles    # Uploaded file storage directory
```

## Performance Considerations

- Uses Node.js streams for efficient file handling (memory-efficient for large files)
- No buffering of entire files in memory
- Supports chunked uploads of any size
- Metadata storage is in-memory for fast access (can be moved to database for scalability)

## Security Notes

For production use, consider:

- Add authentication/authorization
- Implement rate limiting
- Add chuck size limits
- Validate file types
- Implement access control for file cleanup

## Author

Liyu Wu

## License

ISC
