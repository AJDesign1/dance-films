"use client";

import { useState, useTransition } from "react";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { uploadBrandingImage, type BrandingSlot } from "@/app/(admin)/admin/[slug]/branding/actions";
import { MAX_IMAGE_BYTES, isRedirectError, tooLargeMessage, uploadFailedMessage } from "@/lib/uploads";
import { updateSchoolPage, type SchoolPageForm as FormT } from "@/app/(admin)/admin/[slug]/school-page/actions";

export default function SchoolPageForm({
  schoolId,
  slug,
  schoolName,
  initial,
}: {
  schoolId: string;
  slug: string;
  schoolName: string;
  initial: FormT;
}) {
  const [form, setForm] = useState<FormT>(initial);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const set = <K extends keyof FormT>(k: K, v: FormT[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function uploadImage(slot: BrandingSlot, field: keyof FormT, file: File) {
    setMsg(null);
    // Checked here too so an oversized file fails instantly and accurately,
    // rather than being rejected by the request-body cap mid-flight.
    if (file.size > MAX_IMAGE_BYTES) {
      setMsg({ ok: false, text: tooLargeMessage(MAX_IMAGE_BYTES) });
      return;
    }
    setUploading(slot);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadBrandingImage(schoolId, slot, fd);
      if ("url" in res) set(field, res.url as FormT[typeof field]);
      else setMsg({ ok: false, text: res.error });
    } catch (e) {
      // An expired session redirects to sign-in — let that through rather than
      // swallowing the navigation and looking like a failed upload.
      if (isRedirectError(e)) throw e;
      setMsg({ ok: false, text: uploadFailedMessage(MAX_IMAGE_BYTES) });
    } finally {
      setUploading(null);
    }
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateSchoolPage(schoolId, slug, form);
      if ("error" in res) setMsg({ ok: false, text: res.error });
      else setMsg({ ok: true, text: "Saved. Changes are live on the school's page now." });
    });
  }

  const aboutEmpty = !form.aboutText.trim() && !form.aboutImageUrl;
  const teamEmpty = !form.teamName.trim() && !form.teamBio.trim() && !form.teamImageUrl;

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.55 }}>
        These two sections appear on {schoolName}&apos;s shows page, below the shows.
        Leave a section empty and it won&apos;t appear at all.
      </p>

      {/* About the school */}
      <div className={`${styles.card} ${styles.cardPad}`}>
        <div className={styles.cardTitle} style={{ marginBottom: 4 }}>About {schoolName}</div>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 14px" }}>
          A short introduction to the school — copy on the left, photo on the right.
          The heading is always &ldquo;About {schoolName}&rdquo;, so it follows the school name automatically.
        </p>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flex: "0 0 auto", width: 168 }}>
            <div style={{ aspectRatio: "4/3", borderRadius: "var(--r-md)", border: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {form.aboutImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.aboutImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>No photo yet</span>
              )}
            </div>
            <label className={styles.secondaryBtn} style={{ marginTop: 8, width: "100%", cursor: uploading ? "default" : "pointer" }}>
              {uploading === "about" ? "Uploading…" : form.aboutImageUrl ? "Replace photo" : "Upload photo"}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={!!uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage("about", "aboutImageUrl", f); e.target.value = ""; }} />
            </label>
            {form.aboutImageUrl && (
              <button className={styles.secondaryBtn} style={{ marginTop: 8, width: "100%" }} onClick={() => set("aboutImageUrl", "")}>
                Remove photo
              </button>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className={styles.fieldLabel} style={{ marginTop: 0 }}>About the school</label>
            <textarea
              className={styles.textarea}
              rows={8}
              value={form.aboutText}
              onChange={(e) => set("aboutText", e.target.value)}
              placeholder={`Tell families about ${schoolName} — when it started, the classes it runs, what makes it special.`}
            />
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6 }}>
              Landscape photo, JPG or PNG up to 2MB. Blank lines are kept as paragraph breaks.
            </div>
          </div>
        </div>
        {aboutEmpty && <div className={styles.msg} style={{ color: "var(--text-3)" }}>Empty — this section is hidden on the school&apos;s page.</div>}
      </div>

      {/* Meet the media team */}
      <div className={`${styles.card} ${styles.cardPad}`}>
        <div className={styles.cardTitle} style={{ marginBottom: 4 }}>Meet the media team</div>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 14px" }}>
          Who filmed the shows — shown as a full-width band under the About section.
        </p>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flex: "0 0 auto", width: 168 }}>
            <div style={{ aspectRatio: "4/3", borderRadius: "var(--r-md)", border: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {form.teamImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.teamImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>No photo yet</span>
              )}
            </div>
            <label className={styles.secondaryBtn} style={{ marginTop: 8, width: "100%", cursor: uploading ? "default" : "pointer" }}>
              {uploading === "team" ? "Uploading…" : form.teamImageUrl ? "Replace photo" : "Upload photo"}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={!!uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage("team", "teamImageUrl", f); e.target.value = ""; }} />
            </label>
            {form.teamImageUrl && (
              <button className={styles.secondaryBtn} style={{ marginTop: 8, width: "100%" }} onClick={() => set("teamImageUrl", "")}>
                Remove photo
              </button>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Name</label>
                <input className={styles.input} value={form.teamName} onChange={(e) => set("teamName", e.target.value)} placeholder="e.g. Alex Jarvis" />
              </div>
              <div>
                <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Role</label>
                <input className={styles.input} value={form.teamRole} onChange={(e) => set("teamRole", e.target.value)} placeholder="e.g. Founder, Dance Films" />
              </div>
            </div>
            <label className={styles.fieldLabel}>Bio</label>
            <textarea
              className={styles.textarea}
              rows={5}
              value={form.teamBio}
              onChange={(e) => set("teamBio", e.target.value)}
              placeholder="A couple of sentences about who filmed the show and how they work."
            />
            <label className={styles.fieldLabel}>Highlight line</label>
            <input
              className={styles.input}
              value={form.teamTagline}
              onChange={(e) => set("teamTagline", e.target.value)}
              placeholder="e.g. Multi-camera capture, colour-graded for a cinematic finish."
            />
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6 }}>
              One short line, shown with a bullet under the bio.
            </div>
          </div>
        </div>
        {teamEmpty && <div className={styles.msg} style={{ color: "var(--text-3)" }}>Empty — this section is hidden on the school&apos;s page.</div>}
      </div>

      <div style={{ display: "flex", gap: 10, position: "sticky", bottom: 0, padding: "14px 0", alignItems: "center", background: "var(--app-bg)" }}>
        <button className={styles.primaryBtn} disabled={pending} onClick={save}>{pending ? "Saving…" : "Save changes"}</button>
        <a href={`/?school=${slug}`} target="_blank" rel="noreferrer" className={styles.secondaryBtn}>View live page</a>
        {msg && <span className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`} style={{ margin: 0 }}>{msg.text}</span>}
      </div>
    </div>
  );
}
