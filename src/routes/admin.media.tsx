import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { setSite, uid, useAdmin } from "../admin/store";
import { Card } from "../admin/ui";
import { mediaUsage, storeFile } from "../admin/services/media";
import type { MediaItem } from "../admin/site/types";

export const Route = createFileRoute("/admin/media")({ component: Media });

function Media() {
  const s = useAdmin();
  const media = s.site.media;
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [link, setLink] = useState("");
  const save = (m: MediaItem[]) => setSite("media", m);
  const list = media.filter((m) => (src === "all" || m.source === src) && (m.name + m.alt).toLowerCase().includes(q.toLowerCase()));
  const cur = media.find((m) => m.id === sel);
  const upload = async (files: FileList | null) => {
    setErr("");
    const added: MediaItem[] = [];
    for (const f of Array.from(files || [])) {
      try { const url = await storeFile(f); added.push({ id: uid(), name: f.name, url, alt: "", caption: "", type: f.type.split("/")[0] || "image", size: f.size, source: "upload", addedAt: new Date().toISOString() }); }
      catch (e) { setErr((e as Error).message); }
    }
    if (added.length) try { save([...added, ...media]); } catch { setErr("Browser storage is full. Remove some uploads or use links."); }
  };
  return (
    <>
      <div className="adm-top"><h1>Media library</h1>
        <label className="adm-btn">Upload<input type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} /></label></div>
      <p className="adm-hint">Demo: uploads are stored inside this browser (max 400 KB each) and are not in permanent cloud storage. Use links for big files.</p>
      {err && <div className="adm-err">{err}</div>}
      <div className="adm-row" style={{ marginBottom: 14 }}>
        <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        <select value={src} onChange={(e) => setSrc(e.target.value)} style={{ maxWidth: 180 }}><option value="all">All ({media.length})</option><option value="store">Store images</option><option value="upload">Uploads</option><option value="link">Links</option></select>
        <input placeholder="https://… image link" value={link} onChange={(e) => setLink(e.target.value)} style={{ maxWidth: 300 }} />
        <button className="adm-btn ghost" disabled={!/^https?:\/\//.test(link)} onClick={() => { save([{ id: uid(), name: link.split("/").pop() || "image", url: link, alt: "", caption: "", type: "image", size: 0, source: "link", addedAt: new Date().toISOString() }, ...media]); setLink(""); }}>Add link</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: cur ? "1fr 320px" : "1fr", gap: 18 }}>
        <div className="adm-media">
          {list.length ? list.map((m) => <button key={m.id} type="button" className={sel === m.id ? "on" : ""} onClick={() => setSel(m.id)}>
            <img src={m.url.startsWith("//") ? "https:" + m.url : m.url} alt={m.alt} loading="lazy" /><span>{m.name}</span></button>) : <p>No files match.</p>}
        </div>
        {cur && <Card title="Details">
          <img src={cur.url.startsWith("//") ? "https:" + cur.url : cur.url} alt={cur.alt} style={{ width: "100%", border: "1px solid #000" }} />
          {(["name", "alt", "caption"] as const).map((k) => <label key={k} className="adm-field" style={{ marginTop: 10 }}><span>{k === "alt" ? "Alt text" : k}</span>
            <input value={cur[k]} onChange={(e) => save(media.map((m) => (m.id === cur.id ? { ...m, [k]: e.target.value } : m)))} /></label>)}
          <p className="adm-hint">Source: {cur.source}{cur.size ? ` · ${Math.round(cur.size / 1024)} KB` : ""}</p>
          <label className="adm-field"><span>Link</span><input readOnly value={cur.url.startsWith("data:") ? "(stored in browser)" : cur.url} /></label>
          <p className="adm-hint">Used in: {mediaUsage(s, cur.url).join(", ") || "nothing"}</p>
          <button className="adm-btn danger" onClick={() => { const u = mediaUsage(s, cur.url); if (confirm(u.length ? `This file is used in: ${u.join(", ")}. Remove anyway?` : "Remove this file?")) { save(media.filter((m) => m.id !== cur.id)); setSel(null); } }}>Remove</button>
        </Card>}
      </div>
    </>
  );
}
