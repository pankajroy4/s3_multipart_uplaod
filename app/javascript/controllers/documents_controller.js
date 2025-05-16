import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["list"];

  async load() {
    this.listTarget.innerHTML = "<p class='text-gray-400'>Loading...</p>";

    try {
      const response = await fetch("/uploads/list", {
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Failed to fetch uploads");

      const files = await response.json();

      if (files.length === 0) {
        this.listTarget.innerHTML =
          "<p class='text-gray-400'>No documents found.</p>";
        return;
      }

      this.listTarget.innerHTML = "";
      files.forEach((file) => this.renderFile(file));
    } catch (err) {
      this.listTarget.innerHTML = `<p class='text-red-500'>Error: ${err.message}</p>`;
    }
  }

  renderFile(file) {
    const div = document.createElement("div");
    div.className =
      "flex items-start justify-between bg-gray-800 p-3 rounded text-white shadow";

    const fileIconSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8h-4a2 2 0 01-2-2V6a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2z"/>
      </svg>
    `;

    let preview = "";

    if (file.type) {
      if (file.type.startsWith("image/")) {
        preview = `<img src="${file.url}" alt="${file.filename}" class="w-12 h-12 object-cover rounded mr-3" />`;
      } else if (file.type.startsWith("video/")) {
        preview = `<video src="${file.url}" class="w-12 h-12 object-cover rounded mr-3" muted autoplay loop></video>`;
      } else {
        preview = fileIconSVG;
      }
    } else {
      preview = fileIconSVG;
    }

    div.innerHTML = `
      <div class="flex items-center">
        ${preview}
        <div>
          <a href="${file.url}" target="_blank" class="text-blue-400 hover:underline font-semibold">${file.filename}</a>
          <div class="text-sm text-gray-400">
            ${(file.size / 1024).toFixed(1)} KB • ${new Date(file.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      <div class="ml-4 flex flex-col space-y-1 text-sm">
        <button 
          class="ml-2 text-green-400 hover:text-green-300 text-sm"
          data-action="click->documents#transcode"
          data-key="${file.key}">
          Transcode
        </button>


        <button 
          class="text-red-400 hover:text-red-300"
          data-action="click->documents#delete"
          data-key="${file.key}">
          Delete
        </button>
      </div>
    `;

    this.listTarget.appendChild(div);
  }

  async delete(event) {
    const key = event.currentTarget.dataset.key;
    const btn = event.currentTarget;
    btn.disabled = true;
    btn.textContent = "Deleting...";

    try {
      const res = await fetch("/uploads/destroy", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCSRFToken(),
        },
        body: JSON.stringify({ key }),
        credentials: "same-origin",
      });

      if (!res.ok) throw new Error("Failed to delete file");

      btn.closest("div").remove();
    } catch (err) {
      btn.textContent = "Error";
      btn.classList.add("text-yellow-400");
      console.error(err);
    }
  }

  // async transcode(event) {
  //   const key = event.currentTarget.dataset.key;
  //   event.currentTarget.textContent = "Transcoding...";
  //   event.currentTarget.disabled = true;
  
  //   try {
  //     const res = await fetch("/transcode", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         "X-CSRF-Token": this.getCSRFToken(),
  //       },
  //       body: JSON.stringify({ key }),
  //       credentials: "same-origin",
  //     });
  
  //     const data = await res.json();
  //     event.currentTarget.textContent = data.message || "Submitted";
  //   } catch (err) {
  //     console.error(err);
  //     event.currentTarget.textContent = "Error";
  //   }
  // }
  


  async transcode(event) {
    const button = event.currentTarget;
    const key = button.dataset.key;
  
    // Initial state: show loading
    button.textContent = "Transcoding...";
    button.disabled = true;
    button.classList.remove("text-green-400", "text-red-400", "text-blue-400");
    button.classList.add("text-yellow-400");
  
    try {
      const res = await fetch("/transcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCSRFToken(), // Make sure getCSRFToken() is defined in your controller
        },
        body: JSON.stringify({ key }),
        credentials: "same-origin",
      });
  
      const data = await res.json();
  
      if (res.ok && data.success) {
        button.textContent = "Started";
        button.classList.remove("text-yellow-400");
        button.classList.add("text-blue-400");
      } else {
        throw new Error(data.error || "Transcoding failed");
      }
    } catch (err) {
      console.error("Transcoding error:", err);
      button.textContent = "Error";
      button.classList.remove("text-yellow-400");
      button.classList.add("text-red-400");
    }
  }
  

  getCSRFToken() {
    return document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");
  }
}
