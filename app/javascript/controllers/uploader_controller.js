// Connects to data-controller="uploader"
import { Controller } from "@hotwired/stimulus";
export default class extends Controller {
  static targets = ["fileInput", "uploadList"];

  connect() {
    this.uploads = new Map(); // key = uniqueId, value = upload object
    this.csrfToken = document.querySelector('meta[name="csrf-token"]').content;
  }

  selectFiles() {
    const files = Array.from(this.fileInputTarget.files);
    
    files.forEach(file => this.startUpload(file));
    this.fileInputTarget.value = "";
  }

  async startUpload(file) {
    const uniqueId = crypto.randomUUID();
    const chunkSize = 5 * 1024 * 1024;
    const totalParts = Math.ceil(file.size / chunkSize);

    const row = this.buildFileRow(file.name, uniqueId);
    this.uploadListTarget.appendChild(row);

    const upload = {
      id: uniqueId,
      file,
      chunkSize,
      totalParts,
      uploadedParts: [],
      paused: false,
      aborted: false,
      controller: new AbortController(),
      progressBar: row.querySelector(".progress-bar"),
      percentText: row.querySelector(".percent"),
      pauseBtn: row.querySelector(".pause"),
      cancelBtn: row.querySelector(".cancel")
    };

    this.uploads.set(uniqueId, upload);

    // Step 1: Initiate
    const res = await this.postJSON("/uploads/initiate", {
      filename: file.name,
      filesize: file.size
    });

    upload.uploadId = res.upload_id;
    upload.key = res.key;
    upload.uploadedParts = new Set(res.uploaded_parts);

    // Step 2: Get presigned URLs
    const presignRes = await this.postJSON("/uploads/presign", {
      key: upload.key,
      upload_id: upload.uploadId,
      parts: upload.totalParts
    });

    upload.presignedUrls = presignRes;

    // Step 3: Upload parts
    this.uploadChunks(upload);
  }

  async uploadChunks(upload) {
    const { file, chunkSize, totalParts, presignedUrls } = upload;

    for (let i = 0; i < totalParts; i++) {
      if (upload.aborted) return;
      while (upload.paused) await this.wait(200);

      const partNumber = i + 1;
      if (upload.uploadedParts.has(partNumber)) continue;

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const blob = file.slice(start, end);
      const urlObj = presignedUrls.find(p => p.part_number === partNumber);

      const response = await fetch(urlObj.url, {
        method: "PUT",
        body: blob,
        signal: upload.controller.signal,
      });

      const etag = response.headers.get("ETag");
      if (!etag) throw new Error("ETag missing");

      upload.uploadedParts.add(partNumber);
      if (!upload.etags) upload.etags = [];
      upload.etags.push({ part_number: partNumber, etag });

      const percent = Math.round((upload.uploadedParts.size / totalParts) * 100);
      upload.progressBar.value = percent;
      upload.percentText.textContent = `${percent}%`;
    }

    // Step 4: Complete upload
    if (!upload.aborted) {
      await this.postJSON("/uploads/complete", {
        key: upload.key,
        upload_id: upload.uploadId,
        parts: upload.etags
      });
      upload.progressBar.classList.add("bg-green-500");
      upload.percentText.textContent = "Upload Completed";

      this.removeButtons(upload.id);

    }
  }

  removeButtons(uploadId) {
    const row = document.querySelector(`[data-id="${uploadId}"]`);
    if (!row) return;
    const pauseBtn = row.querySelector(".pause");
    const cancelBtn = row.querySelector(".cancel");
    pauseBtn?.remove();
    cancelBtn?.remove();
  }
  

  pauseUpload(event) {
    const id = event.target.dataset.id;
    const upload = this.uploads.get(id);
    if (!upload) return;

    upload.paused = !upload.paused;
    upload.pauseBtn.textContent = upload.paused ? "Resume" : "Pause";
  }

  async cancelUpload(event) {
    const id = event.target.dataset.id;
    const upload = this.uploads.get(id);
    if (!upload) return;

    upload.aborted = true;
    upload.controller.abort();

    await fetch("/uploads/abort", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken,
      },
      body: JSON.stringify({ key: upload.key, upload_id: upload.uploadId })
    });

    const row = this.uploadListTarget.querySelector(`[data-id="${id}"]`);
    if (row) row.remove();
    this.uploads.delete(id);
  }

  buildFileRow(name, id) {
    const wrapper = document.createElement("div");
    wrapper.className = "upload-row p-4 bg-gray-100 dark:bg-gray-700 rounded-xl shadow space-y-2";
    wrapper.dataset.id = id;
  
    wrapper.innerHTML = `
      <div class="font-medium text-gray-800 dark:text-white truncate">${name}</div>
      <progress class="progress-bar w-full h-2 rounded bg-gray-300 dark:bg-gray-600" max="100" value="0"></progress>
      <div class="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300 mt-1">
        <span class="percent">0%</span>
        <div class="flex space-x-2">
          <button data-id="${id}" class="pause px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition duration-200 cursor-pointer"> Pause </button>

          <button data-id="${id}" class="cancel px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white transition duration-200 cursor-pointer"> Cancel </button>
        </div>
      </div>
    `;
  
    wrapper.querySelector(".pause").addEventListener("click", this.pauseUpload.bind(this));
    wrapper.querySelector(".cancel").addEventListener("click", this.cancelUpload.bind(this));
  
    return wrapper;
  }
  
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async postJSON(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }
}
