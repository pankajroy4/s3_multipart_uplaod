// Connects to data-controller="uploader"
import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["file", "progress", "button", "cancel"];
  connect() {
    this.controller = null;
    this.uploadAborted = false;
  }

  async start() {
    this.buttonTarget.disabled = true;
    this.buttonTarget.textContent = "Uploading...";
    this.cancelTarget.classList.remove("hidden");

    this.controller = new AbortController();
    this.uploadAborted = false;

    try {
      const file = this.fileTarget.files[0];
      if (!file) return;

      const chunkSize = 5 * 1024 * 1024; // 5MB
      const totalParts = Math.ceil(file.size / chunkSize);
      this.csrfToken = this.getCSRFToken();

      const { upload_id, key } = await this.postJSON("/uploads/initiate", {
        filename: file.name,
      });

      this.currentUpload = { upload_id, key };

      const urls = await this.postJSON("/uploads/presign", {
        key,
        upload_id,
        parts: totalParts,
      });

      const etags = [];

      for (let i = 0; i < totalParts; i++) {
        if (this.uploadAborted) throw new Error("Upload canceled by user");

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const blob = file.slice(start, end);

        const response = await fetch(urls[i].url, {
          method: "PUT",
          body: blob,
          signal: this.controller.signal,
        });

        const etag = response.headers.get("ETag");
        etags.push({ part_number: i + 1, etag });

        this.progressTarget.value = ((i + 1) / totalParts) * 100;
      }

      await this.postJSON("/uploads/complete", {
        key,
        upload_id,
        parts: etags,
      });

      alert("✅ Upload complete!");
    } catch (error) {
      if (this.currentUpload) {
        await fetch("/uploads/abort", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": this.getCSRFToken(),
          },
          body: JSON.stringify(this.currentUpload),
        });
      }

      if (this.uploadAborted) {
        alert("⚠️ Upload canceled by user.");
      } else {
        alert("❌ Upload failed and aborted.");
        console.error(error);
      }
    } finally {
      this.resetUI();
    }
  }

  cancel() {
    this.uploadAborted = true;
    if (this.controller) this.controller.abort();
  }

  resetUI() {
    this.buttonTarget.disabled = false;
    this.buttonTarget.textContent = "Upload";
    this.fileTarget.value = "";
    this.progressTarget.value = 0;
    this.cancelTarget.classList.add("hidden");
  }

  getCSRFToken() {
    return document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");
  }

  async postJSON(url, data) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken,
      },
      body: JSON.stringify(data),
      credentials: "same-origin",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Request failed: ${message}`);
    }

    return await response.json();
  }
}
