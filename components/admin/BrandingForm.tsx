"use client";

import { useState, useTransition } from "react";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { updateBranding, uploadBrandingImage, type BrandingForm as FormT } from "@/app/(admin)/admin/[slug]/branding/actions";

const FONTS = ["Big Shoulders Display", "Poppins", "Montserrat", "Hanken Grotesk", "Playfair Display"];

export default function BrandingForm({
  schoolId,
  slug,
  initial,
}: {
  schoolId: string;
  slug: string;
  initial: FormT;
}) {
  const [form, setForm] = useState<FormT>(initial);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof FormT>(k: K, v: FormT[K]) => setForm((f) => ({ ...f, [k]: v }));
  const [uploading, setUploading] = useState<string | null>(null);

  async function uploadImage(slot: "logo-colour" | "logo-white" | "sign-in", field: keyof FormT, file: File) {
    setMsg(null);
    setUploading(slot);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadBrandingImage(schoolId, slot, fd);
    setUploading(null);
    if ("url" in res) set(field, res.url as FormT[typeof field]);
    else setMsg({ ok: false, text: res.error });
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateBranding(schoolId, slug, form);
      if ("error" in res) setMsg({ ok: false, text: res.error });
      else setMsg({ ok: true, text: "Saved. Changes apply on the live platform now." });
    });
  }

  const colours: [keyof FormT, string][] = [
    ["primary", "Primary"], ["secondary", "Secondary"], ["ink", "Ink / dark"], ["paper", "Paper / light"], ["accentWarm", "Accent"],
  ];
  const dark = form.theme === "dark";
  const previewFont = `"${form.fontKey}", "Big Shoulders Display", sans-serif`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.cardTitle} style={{ marginBottom: 14 }}>Platform &amp; address</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label className={styles.fieldLabel} style={{ marginTop: 0 }}>Platform name</label><input className={styles.input} value={form.platformName} onChange={(e) => set("platformName", e.target.value)} placeholder="e.g. Liberty Platform" /></div>
            <div><label className={styles.fieldLabel} style={{ marginTop: 0 }}>School name</label><input className={styles.input} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          </div>
          <label className={styles.fieldLabel}>Subdomain</label>
          <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--surface-2)" }}>
            <input value={form.subdomain} onChange={(e) => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="liberty" style={{ flex: 1, padding: "12px 4px 12px 12px", border: "none", background: "transparent", fontSize: 14, color: "var(--text)", outline: "none", textAlign: "right", fontFamily: "var(--body)" }} />
            <span style={{ padding: "0 12px 0 2px", fontSize: 13.5, color: "var(--text-3)", whiteSpace: "nowrap" }}>.dancefilms.co.uk</span>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.cardTitle} style={{ marginBottom: 14 }}>Logo</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Colour logo (light bg)</label>
              <div style={{ height: 96, borderRadius: "var(--r-md)", border: "1px solid var(--border)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {form.logoColourUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={form.logoColourUrl} alt="" style={{ maxHeight: "78%", maxWidth: "82%", objectFit: "contain" }} /> : <span style={{ fontSize: 11, color: "var(--text-3)" }}>No logo yet</span>}
              </div>
              <label className={styles.secondaryBtn} style={{ marginTop: 8, width: "100%", cursor: uploading ? "default" : "pointer" }}>
                {uploading === "logo-colour" ? "Uploading…" : form.logoColourUrl ? "Replace" : "Upload logo"}
                <input type="file" accept="image/*" style={{ display: "none" }} disabled={!!uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage("logo-colour", "logoColourUrl", f); e.target.value = ""; }} />
              </label>
            </div>
            <div>
              <label className={styles.fieldLabel} style={{ marginTop: 0 }}>White logo (dark bg)</label>
              <div style={{ height: 96, borderRadius: "var(--r-md)", border: "1px solid var(--border)", background: "var(--sidebar)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {form.logoWhiteUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={form.logoWhiteUrl} alt="" style={{ maxHeight: "78%", maxWidth: "82%", objectFit: "contain" }} /> : <span style={{ fontSize: 11, color: "var(--text-3)" }}>No logo yet</span>}
              </div>
              <label className={styles.secondaryBtn} style={{ marginTop: 8, width: "100%", cursor: uploading ? "default" : "pointer" }}>
                {uploading === "logo-white" ? "Uploading…" : form.logoWhiteUrl ? "Replace" : "Upload logo"}
                <input type="file" accept="image/*" style={{ display: "none" }} disabled={!!uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage("logo-white", "logoWhiteUrl", f); e.target.value = ""; }} />
              </label>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 8 }}>PNG or SVG, up to 2MB. Uploads immediately; click Save changes to apply.</div>
        </div>

        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.cardTitle} style={{ marginBottom: 4 }}>Theme</div>
          <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 16px" }}>Colour palette and typeface for this school&apos;s platform.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14 }}>
            {colours.map(([key, label]) => (
              <div key={key}>
                <label className={styles.fieldLabel} style={{ marginTop: 0 }}>{label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 9, border: "1.5px solid var(--border)", borderRadius: "var(--r-md)", padding: "6px 10px", background: "var(--surface-2)" }}>
                  <input type="color" value={String(form[key])} onChange={(e) => set(key, e.target.value as FormT[typeof key])} style={{ width: 30, height: 30, border: "none", background: "none", padding: 0, cursor: "pointer", flex: "0 0 auto" }} />
                  <span style={{ fontSize: 12.5, fontFamily: "ui-monospace,monospace", color: "var(--text-2)", textTransform: "uppercase" }}>{String(form[key])}</span>
                </div>
              </div>
            ))}
          </div>
          <label className={styles.fieldLabel}>Display typeface</label>
          <select className={styles.select} value={form.fontKey} onChange={(e) => set("fontKey", e.target.value)}>
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6 }}>Big Shoulders Display is self-hosted today; others load as they&apos;re added to the font set.</div>
          <label className={styles.fieldLabel}>Default theme</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => set("theme", "light")} className={!dark ? styles.primaryBtn : styles.secondaryBtn} style={{ flex: 1 }}>Light</button>
            <button onClick={() => set("theme", "dark")} className={dark ? styles.primaryBtn : styles.secondaryBtn} style={{ flex: 1 }}>Dark</button>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.cardTitle} style={{ marginBottom: 4 }}>Sign-in photo</div>
          <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 12px" }}>Shown on the login screen (left panel).</p>
          <div style={{ height: 150, borderRadius: "var(--r-md)", border: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {form.signInImageUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={form.signInImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 11, color: "var(--text-3)" }}>No photo yet</span>}
          </div>
          <label className={styles.secondaryBtn} style={{ marginTop: 8, width: "100%", cursor: uploading ? "default" : "pointer" }}>
            {uploading === "sign-in" ? "Uploading…" : form.signInImageUrl ? "Replace photo" : "Upload photo"}
            <input type="file" accept="image/*" style={{ display: "none" }} disabled={!!uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage("sign-in", "signInImageUrl", f); e.target.value = ""; }} />
          </label>
          <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 8 }}>JPG or PNG, up to 2MB. A landscape studio/show photo works best.</div>
        </div>

        <div style={{ display: "flex", gap: 10, position: "sticky", bottom: 0, padding: "14px 0", alignItems: "center" }}>
          <button className={styles.primaryBtn} disabled={pending} onClick={save}>{pending ? "Saving…" : "Save changes"}</button>
          {msg && <span className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`} style={{ margin: 0 }}>{msg.text}</span>}
        </div>
      </div>

      {/* Live preview */}
      <div style={{ position: "sticky", top: 92 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: "var(--r-pill)", background: "var(--success)" }} />Live preview
        </div>
        <div style={{ borderRadius: "var(--r-xl)", overflow: "hidden", border: "1px solid var(--border-2)", boxShadow: "var(--e-2)", background: "#fff" }}>
          <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: `linear-gradient(105deg, ${form.secondary} 0%, ${form.primary} 100%)` }}>
            {form.logoWhiteUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={form.logoWhiteUrl} alt="" style={{ height: 22, filter: "brightness(0) invert(1)" }} /> : <span style={{ fontFamily: previewFont, fontWeight: 800, fontSize: 19, letterSpacing: ".02em", textTransform: "uppercase", color: "#fff" }}>{form.platformName || form.name || "Platform"}</span>}
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.85)", border: "1px solid rgba(255,255,255,.4)", padding: "4px 8px", borderRadius: 6 }}>Account</span>
          </div>
          <div style={{ padding: "16px 16px 20px", background: dark ? "#15232E" : "#fff" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: form.primary, marginBottom: 8 }}>Latest production</div>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 150, background: form.ink, display: "flex", alignItems: "flex-end", padding: 14 }}>
              {form.signInImageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={form.signInImageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.82), rgba(0,0,0,.15))" }} />
              <div style={{ position: "relative" }}>
                <div style={{ fontFamily: previewFont, fontWeight: 800, fontSize: 30, lineHeight: ".88", letterSpacing: ".01em", textTransform: "uppercase", color: "#fff" }}>Reflections</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 13px", borderRadius: 8, background: form.primary, color: "#fff", fontFamily: previewFont, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: ".03em" }}>Watch the full show</div>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: 12, borderRadius: 9, background: dark ? "#1E2E3A" : form.paper, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "var(--r-pill)", background: form.accentWarm }} />
              <span style={{ fontSize: 11, color: dark ? "#93A3AE" : "#5C6B75" }}>Accent: highlights &amp; owned tags</span>
            </div>
          </div>
          <div style={{ padding: "12px 16px", background: form.secondary, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.7)" }}>© {form.name || "School"}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.7)" }}>Filmed &amp; delivered by <b style={{ color: "#fff" }}>Dance Films</b></span>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-3)", margin: "12px 2px 0", lineHeight: 1.5 }}>
          How <b style={{ color: "var(--text-2)" }}>{form.subdomain || "school"}.dancefilms.co.uk</b> will look. Changes apply on save.
        </p>
      </div>
    </div>
  );
}
