# API Protocol for File Upload Service with multipart

Authors: Liyu Wu

## 1. Creation of a new upload resource

An empty POST request is sent to the server to create a new upload.
The server responds with a 201 Created status and includes the Location header with the URL/file_id of the newly created upload resource.

### Request

```http
POST /uploadfiles HTTP/1.1
Host: example.com
Content-Length: 0
Upload-Length: 1000000
Upload-Metadata: filename my_file.txt, filetype text/plain
```

**Headers:**

- **Content-Length**: 0 (indicates that the request body is empty)
- **Upload-Length**: (REQUIRED) specifies the total size of the file being uploaded in bytes. The value must be more than 0.
- **Upload-Metadata**: (REQUIRED) metadata about the file, MUST consist of one or more comma-separated key-value pairs. Each key and value MUST be separated by a space. The Key MUST NOT contain spaces. The Key MUST has 'filename'. For example, filename my_file.txt, filetype text/plain.

### Response

```http
HTTP/1.1 201 Created
Location: /uploadfiles/03052026_1234567890
Upload-metadata: filename my_file.txt, filetype text/plain
```

**Headers:**

- **Location**: the URL/file_id of the newly created upload resource
- **Upload-metadata**: echoes back the metadata sent in the request

## 2. Uploading the file or a chunk of the file

A PATCH request is sent to the upload URL with the file data in the request body. The server responds with a 204 No Content status and includes the Upload-Offset header with the new offset for the next chunk.

### Request

```http
PATCH /uploadfiles/03052026_1234567890 HTTP/1.1
Host: example.com
Content-Type: application/offset+octet-stream
Content-Length: 50
Upload-Offset: 70
Checksum: sha1 2ef7bde608ce5404e97d5f042f95f89f1c232871
Checksum-Algorithm: sha1

[body:50 bytes of file data]
```

**Headers:**

- **Content-Type**: (REQUIRED) application/offset+octet-stream, indicates that the request body contains a chunk of the file data with binary content, and the server should append it to the existing upload resource at the specified offset.
- **Content-Length**: (REQUIRED) the size of the chunk being uploaded in bytes
- **Upload-Offset**: (REQUIRED) the offset of the chunk being uploaded in bytes. If the offset does not mathch, the server MUST respond with a 409 Conflict status without updateing the upload resource. In order to acheive parllel upload the 'Concatenation: partial' header MAY be used to indicate that the chunk being uploaded is a partial upload that will be concatenated later.
- **Checksum**: (OPTIONAL) the checksum of the chunk being uploaded, calculated using the algorithm specified in the Checksum-Algorithm header. The value MUST be in the format <algorithm> <checksum>, where <algorithm> is the name of the checksum algorithm used (e.g., sha1, md5) and <checksum> is the actual checksum value.
- **Checksum-Algorithm**: (OPTIONAL) the name of the checksum algorithm. If the Checksum header is included, this header MUST also be included to specify the algorithm used for calculating the checksum.

### Response

The Server MUST acknowledge successful PATCH requests with the 204 No Content status.

```http
HTTP/1.1 204 No Content
Upload-Offset: 120
```

If the server receives a PATCH request against a non-existing upload resource, it MUST respond with a 404 Not Found status. If the server receives a PATCH request with an invalid Upload-Offset header, it MUST respond with a 409 Conflict status.

```http
HTTP/1.1 404 Not Found
```

```http
HTTP/1.1 409 Conflict
```

If the server receives a PATCH request with Checksum and Checksum-Algorithm headers, it MUST validate the checksum of the uploaded chunk. If the checksum is invalid, the server MUST repond with a 460 Invalid Checksum status. If the checksum algorithm specified in the Checksum-Allgorithm header is not supported, it MUST repond with a 400 Bad Request status.

```http
HTTP/1.1 460 Invalid Checksum
```

```http
HTTP/1.1 400 Bad Request
```

**Headers:**

- **Upload-Offset**: (REQUIRED) the new offset for the next chunk, which is the sum of the previous offset and the size of the chunk just uploaded.

## 3. Checking the upload status

Client can send a HEAD request to the upload URL to check the current status of the upload. The server responds with a 200 OK status and includes the Upload-Offset header with the current offset.

### Request

```http
HEAD /uploadfiles/03052026_1234567890 HTTP/1.1
Host: example.com
```

### Response
The server MUST always respond to a HEAD request with the Upload-Offset header, even if the offset is 0, or the upload is complete.
If the size of the upload is known, MUST include the Upload-Length header in the response to indicate the total size of the upload.

```http
HTTP/1.1 200 OK
Upload-Offset: 120
Upload-Length: 1000000
Cache-Control: no-store
```

If the resouce does not exist, the server MUST respond with a 404 Not Found status.
```http
HTTP/1.1 404 Not Found
```

**Headers:**

- **Upload-Offset**: (REQUIRED) the current offset of the upload, which is the sum of the sizes of all chunks that have been uploaded so far.
- **Upload-Length**: (OPTIONAL) the total size of the upload in bytes if known.
- **Cache-Control**: (REQUIRED) no-store, to prevent caching of the response, while the upload is in progress, offset will be updated.

## 4. Terminating an upload

Client can send a DELETE request to the upload URL to terminate completed or unfinished upload. The server responds with a 204 No Content status and frees any resources associated with the upload.

### Request

```http
DELETE /upload/files/03052026_1234567890 HTTP/1.1
Host: example.com
Content-Length: 0
```
### Response

```http
HTTP/1.1 204 No Content
```

## To Be Extended (Not supported at present)

- Parallel upload.  
    The client can identify the POST Request header `Upload-Concat: partial` to obtain multiple upload resources and use PATCH Request to upload multiple chunk in parallel. And subsequently merge multiple chunks into a single complete upload resource using the `Upload-Concat: final; <partial-upload-urls>` request header in a POST Request.
