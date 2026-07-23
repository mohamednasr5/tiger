// ====== Upload Utility for Tiger Jeans ======
// Handles image uploads to Cloudflare Workers or Firebase Storage

const UPLOAD_WORKER_URL = 'https://tiger-upload.studegy10.workers.dev';

// Upload image file to worker
async function uploadImage(file, onProgress) {
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('يجب اختيار صورة');
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
  }
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    
    // Return promise for async/await support
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && typeof onProgress === 'function') {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent, e.loaded, e.total);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.url || response.fileUrl) {
              resolve(response.url || response.fileUrl);
            } else {
              reject(new Error('لم يتم استلام رابط الصورة'));
            }
          } catch (e) {
            reject(new Error('فشل معالجة الاستجابة'));
          }
        } else {
          reject(new Error(`فشل الرفع: ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('خطأ في الاتصال'));
      });
      
      xhr.open('POST', UPLOAD_WORKER_URL);
      xhr.send(formData);
    });
    
  } catch (error) {
    console.error('[Upload] Error:', error);
    throw error;
  }
}

// Handle image input change
async function handleImageInput(inputElement, callback, statusElement) {
  const file = inputElement.files[0];
  if (!file) return null;
  
  if (statusElement) {
    statusElement.textContent = 'جاري الرفع...';
    statusElement.style.color = 'var(--gold)';
  }
  
  try {
    const url = await uploadImage(file, (percent) => {
      if (statusElement) {
        statusElement.textContent = `جاري الرفع: ${percent}%`;
      }
    });
    
    if (statusElement) {
      statusElement.textContent = '✓ تم الرفع بنجاح';
      statusElement.style.color = 'var(--success)';
    }
    
    if (typeof callback === 'function') {
      callback(url);
    }
    
    return url;
  } catch (error) {
    if (statusElement) {
      statusElement.textContent = error.message;
      statusElement.style.color = 'var(--danger)';
    }
    throw error;
  }
}

// Convert base64 to blob
function base64ToBlob(base64, mimeType = 'image/jpeg') {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: mimeType });
}

// Compress image before upload
async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, file.type || 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Export functions
if (typeof window !== 'undefined') {
  window.uploadImage = uploadImage;
  window.handleImageInput = handleImageInput;
  window.base64ToBlob = base64ToBlob;
  window.compressImage = compressImage;
}
