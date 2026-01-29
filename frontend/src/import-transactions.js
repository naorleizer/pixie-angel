// Import Transactions Logic
import { apiRequest, getAuthToken } from './api.js';
import { navigate } from './navigation.js';
import { loadTransactions } from './transactions.js';

let selectedFile = null;

export function initImportTransactions() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileInfo = document.getElementById('file-info');
  const uploadBtn = document.getElementById('upload-btn');
  const removeFileBtn = document.getElementById('remove-file');

  // Click to upload
  dropZone.addEventListener('click', () => fileInput.click());

  // File selection
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-purple-500', 'bg-purple-50');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-purple-500', 'bg-purple-50');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-purple-500', 'bg-purple-50');
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file);
    } else {
      showError('Please select a CSV file');
    }
  });

  // Remove file
  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSelection();
  });

  // Upload button
  uploadBtn.addEventListener('click', uploadFile);
}

function handleFileSelect(file) {
  selectedFile = file;
  
  const fileInfo = document.getElementById('file-info');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const uploadBtn = document.getElementById('upload-btn');
  
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  
  fileInfo.classList.remove('hidden');
  document.getElementById('upload-results').classList.add('hidden');
  document.getElementById('error-message').classList.add('hidden');
  
  // Enable the upload button
  uploadBtn.disabled = false;
}

function clearSelection() {
  selectedFile = null;
  const uploadBtn = document.getElementById('upload-btn');
  
  document.getElementById('file-input').value = '';
  document.getElementById('file-info').classList.add('hidden');
  document.getElementById('upload-results').classList.add('hidden');
  document.getElementById('error-message').classList.add('hidden');
  
  // Disable the upload button
  uploadBtn.disabled = true;
}

async function uploadFile() {
  if (!selectedFile) return;
  
  const uploadBtn = document.getElementById('upload-btn');
  const progressContainer = document.getElementById('upload-progress');
  const progressBar = document.getElementById('progress-bar');
  const progressPercent = document.getElementById('progress-percent');
  const resultsContainer = document.getElementById('upload-results');
  
  // Disable button and show progress
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading...';
  progressContainer.classList.remove('hidden');
  resultsContainer.classList.add('hidden');
  document.getElementById('error-message').classList.add('hidden');
  
  // Reset progress
  progressBar.style.width = '0%';
  progressPercent.textContent = '0%';
  
  try {
    // Create FormData
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Upload - backend returns upload_id
    const response = await fetch(`${API_BASE_URL}/api/transactions/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    
    const uploadId = data.upload_id;
    
    // Poll for progress
    await pollUploadStatus(uploadId, progressBar, progressPercent, resultsContainer, progressContainer, uploadBtn);
    
  } catch (error) {
    progressContainer.classList.add('hidden');
    showError(error.message || 'Upload failed. Please try again.');
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload & Import';
  }
}

async function pollUploadStatus(uploadId, progressBar, progressPercent, resultsContainer, progressContainer, uploadBtn) {
  const pollInterval = 500; // Poll every 500ms
  
  while (true) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/upload/${uploadId}/status`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get upload status');
      }
      
      const status = await response.json();
      
      // Update progress bar
      progressBar.style.width = `${status.progress}%`;
      progressPercent.textContent = `${status.progress}%`;
      
      // Check if completed
      if (status.status === 'completed') {
        // Show results
        setTimeout(() => {
          progressContainer.classList.add('hidden');
          resultsContainer.classList.remove('hidden');
          resultsContainer.classList.add('bg-green-50', 'border', 'border-green-200');
          
          document.getElementById('imported-count').textContent = status.imported || 0;
          document.getElementById('skipped-count').textContent = status.skipped || 0;
          document.getElementById('invalid-count').textContent = status.invalid || 0;
          
          uploadBtn.textContent = 'Upload & Import';
          uploadBtn.disabled = false;
          
          // Auto-redirect after success
          setTimeout(() => {
            loadTransactions();
            navigate('transactions');
          }, 1500);
        }, 300);
        
        break;
      } else if (status.status === 'error') {
        throw new Error(status.message || 'Upload failed');
      }
      
      // Continue polling
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      console.error('Polling error:', error);
      progressContainer.classList.add('hidden');
      showError(error.message || 'Processing failed. Please try again.');
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload & Import';
      break;
    }
  }
}

function showError(message) {
  const errorContainer = document.getElementById('error-message');
  document.getElementById('error-text').textContent = message;
  errorContainer.classList.remove('hidden');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
