
const HERO_VIDEO_URL = "https://www.image2url.com/r2/default/videos/1787982481527-74f5d3f0-661f-47bb-a5df-d6d54d0e803f.mp4";

const state = { mode: "single", files: [] };

const $ = (id) => document.getElementById(id);
const heroVideo = $("heroVideo");
const projectName = $("projectName");
const filesInput = $("files");
const drop = $("drop");
const dropTitle = $("dropTitle");
const dropText = $("dropText");
const fileList = $("fileList");
const deploy = $("deploy");
const deployText = $("deployText");
const statusBox = $("status");
const result = $("result");
const urlBox = $("url");
const qr = $("qr");
const openBtn = $("open");
const copyBtn = $("copy");

heroVideo.src = HERO_VIDEO_URL;

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.mode = tab.dataset.mode;
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === tab));
    filesInput.value = "";
    state.files = [];

    if (state.mode === "single") {
      filesInput.removeAttribute("webkitdirectory");
      filesInput.removeAttribute("multiple");
      filesInput.accept = ".html,.htm,text/html";
      dropTitle.textContent = "Pilih index.html";
      dropText.textContent = "Single file";
    } else {
      filesInput.setAttribute("webkitdirectory", "");
      filesInput.setAttribute("multiple", "");
      filesInput.accept = "";
      dropTitle.textContent = "Pilih folder website";
      dropText.textContent = "Folder harus punya index.html";
    }

    renderFiles();
  });
});

filesInput.addEventListener("change", () => {
  state.files = Array.from(filesInput.files || []);
  renderFiles();
});

["dragenter","dragover"].forEach((name) => {
  drop.addEventListener(name, (e) => {
    e.preventDefault();
    drop.classList.add("drag");
  });
});
["dragleave","drop"].forEach((name) => {
  drop.addEventListener(name, (e) => {
    e.preventDefault();
    drop.classList.remove("drag");
  });
});
drop.addEventListener("drop", (e) => {
  state.files = Array.from(e.dataTransfer.files || []);
  renderFiles();
});

function filePath(file) {
  return file.webkitRelativePath || file.name;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B","KB","MB","GB"];
  const i = Math.min(Math.floor(Math.log(bytes)/Math.log(1024)), units.length - 1);
  return `${(bytes/1024**i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function renderFiles() {
  fileList.innerHTML = "";
  if (!state.files.length) return;

  const total = state.files.reduce((n, f) => n + f.size, 0);

  const head = document.createElement("div");
  head.className = "file";
  head.innerHTML = `<span>${state.files.length} file</span><span>${formatBytes(total)}</span>`;
  fileList.appendChild(head);

  state.files.slice(0, 10).forEach((file) => {
    const row = document.createElement("div");
    row.className = "file";
    row.innerHTML = `<span>${escapeHtml(filePath(file))}</span><span>${formatBytes(file.size)}</span>`;
    fileList.appendChild(row);
  });

  if (state.files.length > 10) {
    const row = document.createElement("div");
    row.className = "file";
    row.innerHTML = `<span>+${state.files.length - 10} lainnya</span><span></span>`;
    fileList.appendChild(row);
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => (
    {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]
  ));
}

function base64FromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error(`Gagal membaca ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function showStatus(text) {
  statusBox.textContent = text;
  statusBox.classList.remove("hidden");
}

deploy.addEventListener("click", async () => {
  result.classList.add("hidden");
  statusBox.classList.add("hidden");

  const name = projectName.value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,59}$/.test(name)) {
    showStatus("Nama project tidak valid.");
    return;
  }

  if (!state.files.length) {
    showStatus("Pilih file dulu.");
    return;
  }

  if (state.mode === "single" && !/\.html?$/i.test(state.files[0].name)) {
    showStatus("Pilih file HTML.");
    return;
  }

  if (state.mode === "folder") {
    const hasRootIndex = state.files.some((file) =>
      filePath(file).replaceAll("\\","/").toLowerCase() === "index.html"
    );
    if (!hasRootIndex) {
      showStatus("Folder harus punya index.html di root.");
      return;
    }
  }

  const totalSize = state.files.reduce((n, f) => n + f.size, 0);
  if (totalSize > 3.1 * 1024 * 1024) {
    showStatus("Project terlalu besar untuk Vercel Function. Gunakan project kecil atau deploy langsung via Vercel Drop.");
    return;
  }

  deploy.disabled = true;
  deployText.textContent = "Deploying…";

  try {
    const payloadFiles = [];

    for (const file of state.files) {
      const content = await base64FromFile(file);
      const path = state.mode === "single" ? "index.html" : filePath(file).replaceAll("\\","/");
      payloadFiles.push({ path, content, size: file.size });
    }

    showStatus("Mengirim project…");

    const response = await fetch("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        files: payloadFiles
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Deploy gagal.");
    }

    showStatus("Selesai.");

    urlBox.href = data.url;
    urlBox.textContent = data.url;
    openBtn.href = data.url;
    qr.src = data.qr;

    result.classList.remove("hidden");
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    showStatus(error.message || "Terjadi error.");
  } finally {
    deploy.disabled = false;
    deployText.textContent = "Deploy";
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(urlBox.href);
    copyBtn.textContent = "Copied";
    setTimeout(() => copyBtn.textContent = "Copy URL", 1200);
  } catch {
    showStatus("Copy otomatis diblokir browser.");
  }
});
