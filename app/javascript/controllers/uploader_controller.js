// Connects to data-controller="uploader"
import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["file", "progress", "button"];

  async start() {
    this.buttonTarget.disabled = true;
    this.buttonTarget.textContent = "Uploading...";

    try {
      const file = this.fileTarget.files[0];
      if (!file) return;

      const chunkSize = 5 * 1024 * 1024;
      const totalParts = Math.ceil(file.size / chunkSize);
      this.csrfToken = this.getCSRFToken();

      const { upload_id, key } = await this.postJSON("/uploads/initiate", {
        filename: file.name,
      });

      const urls = await this.postJSON("/uploads/presign", {
        key,
        upload_id,
        parts: totalParts,
      });

      const etags = [];

      for (let i = 0; i < totalParts; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const blob = file.slice(start, end);

        const upload = await fetch(urls[i].url, {
          method: "PUT",
          body: blob,
        });

        const etag = upload.headers.get("ETag");
        etags.push({ part_number: i + 1, etag });

        this.progressTarget.value = ((i + 1) / totalParts) * 100;
      }

      await this.postJSON("/uploads/complete", {
        key,
        upload_id,
        parts: etags,
      });

      alert("Upload complete!");
      this.fileTarget.value = "";
      this.progressTarget.value = 0;
    } catch (error) {
      await fetch("/uploads/abort", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCSRFToken(),
        },
        body: JSON.stringify({ key, upload_id }),
      });
      alert("Upload failed and aborted.");
    } finally {
      this.buttonTarget.disabled = false;
      this.buttonTarget.textContent = "Upload";
    }
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
