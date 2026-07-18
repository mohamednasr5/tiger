// ====== ضغط الصورة قبل الرفع ======
function compressImage(file, maxDim = 1400, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => (img.src = e.target.result);
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ====== رفع الصورة: اختيار -> ضغط -> Worker -> R2 -> رابط ======
async function uploadImageToWorker(file, onProgress) {
  const blob = await compressImage(file);
  const form = new FormData();
  const fileName = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
  form.append("file", blob, fileName);
  form.append("image", blob, fileName);

  const res = await fetch(UPLOAD_WORKER_URL, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    throw new Error("فشل رفع الصورة (" + res.status + ")");
  }

  let url = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    url =
      data.url ||
      data.link ||
      data.imageUrl ||
      data.image_url ||
      (data.data && (data.data.url || data.data.link)) ||
      data.result ||
      null;
  } else {
    const text = (await res.text()).trim();
    if (text.startsWith("http")) url = text;
  }

  if (!url) throw new Error("لم يتم استلام رابط الصورة من Worker");
  return url;
}

// ====== رفع صورة واحدة مع عرض حالة التحميل ======
async function handleImageInput(fileInput, callback, statusEl) {
  const file = fileInput.files[0];
  if (!file) return;
  if (statusEl) statusEl.innerHTML = '<span class="spinner"></span> جاري رفع الصورة...';
  try {
    const url = await uploadImageToWorker(file);
    if (statusEl) statusEl.textContent = "";
    callback(url);
  } catch (err) {
    if (statusEl) statusEl.textContent = "";
    showToast(err.message || "حدث خطأ أثناء رفع الصورة");
  } finally {
    fileInput.value = "";
  }
}
