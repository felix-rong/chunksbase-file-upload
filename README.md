# Multipart File Upload Service

A production-ready RESTful API for multipart file upload with resume capability.

## ✨ Key Features

- **Resumable Uploads**: Resume interrupted uploads from where they left off
- **Chunk-Based Processing**: Upload large files in chunks
- **Integrity Verification**: Validate chunks with SHA1, MD5, SHA256, or SHA512 checksums
- **OpenAPI Documentation**: Auto-generated interactive Swagger UI
- **Layered Architecture**: Clean separation of HTTP, business logic, and storage layers
- **Stream-Based I/O**: Handles file I/O operations using Node.js raw streams
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes

## 🎯 Purpose & Use Case

### Purpose

This service addresses the challenge of reliably uploading large files over unreliable networks. The protocol enables:

- **Resume Capability**: Interrupted uploads can resume from where they left off
- **Progress Tracking**: Clients can check upload status at any time
- **Chunk Verification**: Checksums ensure data integrity
- **Flexible Metadata**: Attach custom metadata to uploads

### Use Cases

- Web applications requiring file uploads
- REST APIs for document management  
- Large file uploads with progress
- Enterprise file sharing platforms

## 📋 Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start

# Access API docs
# Open http://localhost:3000/api-docs

# Access a demo client to upload a file
# Open http://localhost:3000/
```

## 📚 Documentation

- **[TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)** - Architecture and design decisions
- **[API_Protocol.md](./API_Protocol.md)** - API specification
- **[API Docs](http://localhost:3000/api-docs)** - Interactive Swagger UI (requires running server)

## 🏗️ Architecture

```layout
HTTP Layer (controller.js)
        ↓
Business Logic (uploadservice.js)
        ↓
Storage Layer (fileStore.js, metadata.js, checksumValidator.js)
```

Each layer has clear responsibilities and can be tested independently, and the functions between layers are decoupled.

## 🚀 API Endpoints

All endpoints are fully documented at `/api-docs` when server is running.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/uploadfiles` | Create new upload resource |
| PATCH | `/uploadfiles/{fileId}` | Upload file chunk |
| HEAD | `/uploadfiles/{fileId}` | Check upload status |
| DELETE | `/uploadfiles/{fileId}` | Terminate upload |

## 📦 Project Structure

```file_structure
mutilpart-file-upload/
├── server.js                 # Server startup
├── app.js                    # Express app setup
├── package.json              # Dependencies
├── .env                      # Configuration
├── uploadservice/
│   ├── router.js             # Routes
│   ├── controller.js         # HTTP request handling
│   ├── uploadservice.js      # Business logic
│   └── openapi.yaml          # Open Api document
├── storage/
│   ├── fileStore.js          # File I/O operations
│   ├── metadata.js           # Metadata management
│   └── checksumValidator.js  # Checksum validation
├── uploadfiles/              # Uploaded files directory
├── postmanTest/              # postman test collection
│   └── Multipart Upload Test.postman_collection.json
└── public/                   # Demo client
```

## 🧪 Testing

Import file 'Multipart Upload Test.postman_collection.json' into postman, run the test collecton.

Tests cover:
- ✓ Upload creation
- ✓ Chunk uploading
- ✓ Status checking
- ✓ Resume capability
- ✓ Error handling

## 🔧 Configuration

Edit `.env` to customize settings:

```env
SERVER_PORT=3000            # Server port
SERVER_HOST=localhost       # Server host
NODE_ENV=development        # Environment
UPLOAD_DIR=./uploadfiles    # Upload files directory
```

## ✅ What Has Been Implemented

### Core API Functionality
- ✅ **POST /uploadfiles** - Create new upload resource with metadata
- ✅ **PATCH /uploadfiles/{fileId}** - Upload file chunks with offset validation
- ✅ **HEAD /uploadfiles/{fileId}** - Check upload status and progress
- ✅ **DELETE /uploadfiles/{fileId}** - Terminate uploads and cleanup

### Advanced Features
- ✅ Resume interrupted uploads
- ✅ Checksum validation (SHA1, MD5, SHA256, SHA512)
- ✅ Metadata parsing and storage
- ✅ Comprehensive error handling and validation

### API Documentation
- ✅ OpenAPI 3.0 specification
- ✅ Interactive Swagger UI at /api-docs
- ✅ Request/response examples and schemas

### Technical Implementation
- ✅ Layered architecture (HTTP → Business → Storage)
- ✅ Clear separation of concerns
- ✅ Stream-based file I/O (memory efficient)
- ✅ Promise-based async operations
- ✅ Extensible storage layer
- ✅ Comprehensive error handling

### Quality Assurance
- ✅ Input validation at all layers
- ✅ Postman collection with test code covers all API
- ✅ Error recovery mechanisms

## 📝 Code Examples

### Create an Upload
```bash
curl -X POST http://localhost:3000/uploadfiles \
  -H "Upload-Length: 1000000" \
  -H "Upload-Metadata: filename myfile.txt, filetype text/plain" \
  -H "Content-Length: 0"
```

### Upload a Chunk
```bash
curl -X PATCH http://localhost:3000/uploadfiles/{fileId} \
  -H "Content-Type: application/offset+octet-stream" \
  -H "Content-Length: 1024" \
  -H "Upload-Offset: 0" \
  --data-binary @chunk.bin
```

### Check Status
```bash
curl -I http://localhost:3000/uploadfiles/{fileId}
```

### Terminate Upload
```bash
curl -X DELETE http://localhost:3000/uploadfiles/{fileId}
```

## 🏆 Design Highlights

1. **Clean Architecture**: Each layer has single, well-defined responsibility
2. **Testability**: All components can be independently unit tested
3. **Maintainability**: Clear code organization, consistent patterns, comprehensive docs
4. **Extensibility**: Storage layer easily replaceable for databases/cloud
5. **Performance**: Stream-based I/O ensures memory efficiency for large files
6. **Standards Compliance**: Follows OpenAPI 3.0 specification

## 📖 Learning Resources

- Read [IMPLEMENTATION.md](./IMPLEMENTATION.md) to understand the complete implementation
- Explore `/api-docs` for interactive API documentation
- Review postman collection for API usage examples

## 👤 Author

Liyu Wu

---
