import crypto from "node:crypto";
import QRCode from "qrcode";

const TOKEN = process.env.VERCEL_TOKEN;
const TEAM_ID = process.env.VERCEL_TEAM_ID || "";

function api(endpoint) {
  const url = new URL(`https://api.vercel.com${endpoint}`);
  if (TEAM_ID) url.searchParams.set("teamId", TEAM_ID);
  return url;
}

function cleanPath(value) {
  const path = String(value || "").replaceAll("\\", "/");
  const parts = path.split("/").filter(Boolean);

  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    return null;
  }

  return parts.join("/");
}

function validName(value) {
  const name = String(value || "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{0,59}$/.test(name) ? name : null;
}

async function vercel(endpoint, options = {}) {
  const response = await fetch(api(endpoint), {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Vercel error ${response.status}`);
  }

  return data;
}

async function uploadFile(buffer, sha) {
  const response = await fetch(api("/v2/files"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha
    },
    body: buffer
  });

  if (!response.ok && response.status !== 409) {
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    throw new Error(data?.error?.message || `File upload error ${response.status}`);
  }
}

async function waitForReady(id) {
  for (let i = 0; i < 30; i++) {
    const data = await vercel(`/v13/deployments/${encodeURIComponent(id)}`);

    if (data.readyState === "READY") return data;
    if (data.readyState === "ERROR" || data.readyState === "CANCELED") {
      throw new Error(data.error?.message || `Deployment ${data.readyState}`);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("Deployment terlalu lama.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!TOKEN) {
    return res.status(500).json({ error: "VERCEL_TOKEN belum diisi di Environment Variables." });
  }

  try {
    const name = validName(req.body?.name);
    const inputFiles = Array.isArray(req.body?.files) ? req.body.files : [];

    if (!name) return res.status(400).json({ error: "Nama project tidak valid." });
    if (!inputFiles.length) return res.status(400).json({ error: "File belum dipilih." });
    if (!inputFiles.some((file) => cleanPath(file.path) === "index.html")) {
      return res.status(400).json({ error: "index.html wajib ada di root." });
    }

    const seen = new Set();
    const deploymentFiles = [];

    for (const item of inputFiles) {
      const path = cleanPath(item.path);
      if (!path || seen.has(path)) continue;
      seen.add(path);

      const raw = Buffer.from(String(item.content || ""), "base64");
      if (!raw.length) continue;

      const sha = crypto.createHash("sha1").update(raw).digest("hex");

      await uploadFile(raw, sha);

      deploymentFiles.push({
        file: path,
        sha,
        size: raw.length
      });
    }

    const deployment = await vercel("/v13/deployments?forceNew=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        target: "production",
        files: deploymentFiles
      })
    });

    const ready = await waitForReady(deployment.id || deployment.uid);
    const host = ready.url || deployment.url;

    if (!host) throw new Error("Vercel tidak mengembalikan URL.");

    const url = host.startsWith("http") ? host : `https://${host}`;
    const qr = await QRCode.toDataURL(url, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: "M"
    });

    return res.status(200).json({ ok: true, url, qr });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || "Deploy gagal." });
  }
}
