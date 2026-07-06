const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const browseButton = document.getElementById('browseButton');
const createButton = document.getElementById('createButton');
const resumeButton = document.getElementById('resumeButton');
const abortButton = document.getElementById('abortButton');
const filePathInput = document.getElementById('filePath');
const fileIdInput = document.getElementById('fileIdInput');
const selectedFileName = document.getElementById('selectedFileName');
const selectedFileSize = document.getElementById('selectedFileSize');
const currentUploadId = document.getElementById('currentUploadId');
const currentOffset = document.getElementById('currentOffset');
const statusText = document.getElementById('statusText');
const messageBox = document.getElementById('messageBox');
const progressBar = document.getElementById('progressBar');

const MAX_CHUNK_SIZE = 2 * 1024 * 1024;
let selectedFile = null;
let uploadId = '';
let offset = 0;
let abortController = null;
let uploading = false;

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function updateStatus(message, type = 'info') {
  statusText.textContent = message;
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
}

function updateUi() {
  selectedFileName.textContent = selectedFile ? selectedFile.name : 'No file selected';
  selectedFileSize.textContent = selectedFile ? formatBytes(selectedFile.size) : '0';
  currentUploadId.textContent = uploadId || 'None';
  currentOffset.textContent = offset.toString();
  const progress = selectedFile ? Math.min((offset / selectedFile.size) * 100, 100) : 0;
  progressBar.style.width = `${progress}%`;
  updateDropZonePreview();
}

function updateDropZonePreview() {
  if (selectedFile) {
    dropZone.innerHTML = `
      <div class="file-preview">
        <div class="file-icon">📄</div>
        <div class="file-meta">
          <div class="file-name">${selectedFile.name}</div>
          <div class="file-size">${formatBytes(selectedFile.size)}</div>
        </div>
      </div>
    `;
  } else {
    dropZone.innerHTML = '<span>Drag files here or click "Select File"</span>';
  }
}

function resetState() {
  uploadId = fileIdInput.value.trim();
  offset = 0;
  updateUi();
}

function setSelectedFile(file) {
  selectedFile = file;
  if (file) {
    filePathInput.value = file.name;
  }
  updateUi();
}

function validateLocalFileName() {
  const typedName = filePathInput.value.trim();
  if (!typedName) {
    updateStatus('Please select a file or enter a filename.', 'error');
    return false;
  }
  if (!selectedFile || selectedFile.name !== typedName) {
    updateStatus('The selected file does not match the entered filename. Please select a different file.', 'error');
    selectedFile = null;
    updateUi();
    return false;
  }
  return true;
}

function handleFileSelection(files) {
  if (!files || files.length === 0) {
    updateStatus('No files detected. Please try again.', 'error');
    return;
  }
  setSelectedFile(files[0]);
  updateStatus('File selected, ready for upload.', 'success');
}

browseButton.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  handleFileSelection(fileInput.files);
});

filePathInput.addEventListener('input', () => {
  const typed = filePathInput.value.trim();
  if (selectedFile && typed && selectedFile.name !== typed) {
    updateStatus('Please select a different file.', 'error');
  }
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (event) => {
  const files = event.dataTransfer.files;
  handleFileSelection(files);
});

dropZone.addEventListener('click', () => {
  fileInput.click();
});

async function createUploadResource() {
  if (!selectedFile) {
    updateStatus('Please select a file first.', 'error');
    return null;
  }

  const metadata = `filename ${selectedFile.name}, filetype ${selectedFile.type || 'application/octet-stream'}`;
  updateStatus('Creating upload resource...');

  const response = await fetch('/uploadfiles', {
    method: 'POST',
    headers: {
      'Upload-Length': selectedFile.size.toString(),
      'Upload-Metadata': metadata
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create upload resource: ${response.status} ${text}`);
  }

  const location = response.headers.get('Location');
  if (!location) {
    throw new Error('Server did not return an upload ID.');
  }

  const id = location.split('/').pop();
  uploadId = id;
  fileIdInput.value = id;
  updateStatus(`Upload resource created, fileId: ${id}`, 'success');
  return id;
}

async function getUploadStatus(id) {
  updateStatus('Querying upload status...');
  const response = await fetch(`/uploadfiles/${encodeURIComponent(id)}`, {
    method: 'HEAD'
  });

  if (!response.ok) {
    throw new Error(`Failed to query upload status: ${response.status}`);
  }

  const serverOffset = parseInt(response.headers.get('upload-offset') || '0', 10);
  const serverLength = parseInt(response.headers.get('upload-length') || '0', 10);

  return { offset: serverOffset, uploadLength: serverLength };
}

async function uploadChunk(id, chunk, chunkOffset) {
  abortController = new AbortController();  // setup the Abort Controller
  const response = await fetch(`/uploadfiles/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/offset+octet-stream',
      'Upload-Offset': chunkOffset.toString()
    },
    body: chunk,
    signal: abortController.signal  // when user abort the transmisson, AbortController ture the signal to 'aborted'
  });
  
  if (response.status === 204) {
    const nextOffset = parseInt(response.headers.get('upload-offset') || `${chunkOffset + chunk.size}`, 10);
    return nextOffset;
  }

  const errorText = await response.text();
  if (response.status === 460) {
    throw new Error('Invalid checksum, please try again.');
  }
  if (response.status === 409) {
    throw new Error('Upload offset does not match, please query the current upload status and then continue uploading.');
  }
  if (response.status === 404) {
    throw new Error('Upload resource not found, please confirm the fileId.');
  }
  throw new Error(`Failed to upload chunk: ${response.status} ${errorText}`);
}

async function uploadFileFromOffset(startOffset) {
  if (!selectedFile) {
    updateStatus('Please select a file first.', 'error');
    return;
  }

  offset = startOffset;
  const totalSize = selectedFile.size;
  updateUi();
  uploading = true;
  abortButton.disabled = false;
  createButton.disabled = true;
  resumeButton.disabled = true;

  try {
    while (offset < totalSize && uploading) {
      const end = Math.min(offset + MAX_CHUNK_SIZE, totalSize);
      const chunk = selectedFile.slice(offset, end);
      updateStatus(`Uploading: offset ${offset} / ${totalSize}`);
      const nextOffset = await uploadChunk(uploadId, chunk, offset);
      offset = nextOffset;
      updateUi();
    }

    if (offset >= totalSize) {
      updateStatus('Upload completed!', 'success');
      progressBar.style.width = '100%';
    } else if (!uploading) {
      updateStatus('Upload interrupted, can be resumed later.', 'error');
    }
  } catch (error) {
    updateStatus(error.message, 'error');
  } finally {
    uploading = false;
    abortController = null;
    abortButton.disabled = true;
    createButton.disabled = false;
    resumeButton.disabled = false;
  }
}

async function startUpload() {
  if (!validateLocalFileName()) {
    return;
  }

  if (!selectedFile) {
    updateStatus('Please select a file first.', 'error');
    return;
  }

  try {
    if (!uploadId) {
      await createUploadResource();
    }
    resetState(); // initailize the fileId and offset=0
    await uploadFileFromOffset(offset); // upload after slicing
  } catch (error) {
    updateStatus(error.message, 'error');
  }
}

async function resumeUpload() {
  if (!validateLocalFileName()) {
    return;
  }

  const id = fileIdInput.value.trim();
  if (!id) {
    updateStatus('Please enter the fileId to resume uploading.', 'error');
    return;
  }

  try {
    const status = await getUploadStatus(id);
    if (status.uploadLength !== selectedFile.size) {
      updateStatus('The local file size does not match the existing upload resource. Please confirm the file is correct.', 'error');
      return;
    }

    uploadId = id;
    offset = status.offset;
    currentUploadId.textContent = uploadId;
    updateStatus(`Found upload resource, ${offset} already uploaded. Resuming upload...`, 'success');
    await uploadFileFromOffset(offset);
  } catch (error) {
    updateStatus(error.message, 'error');
  }
}

function abortUpload() {
  if (abortController) {
    uploadId = fileIdInput.value.trim();
    abortController.abort();
    uploading = false;
    updateStatus('Upload interrupted, request stopped.', 'error');
  }
}

createButton.addEventListener('click', startUpload);
resumeButton.addEventListener('click', resumeUpload);
abortButton.addEventListener('click', abortUpload);

updateUi();
