"use client";

import { useState, useTransition } from "react";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { uploadBrandingImage, type BrandingSlot } from "@/app/(admin)/admin/[slug]/branding/actions";
import { MAX_IMAGE_BYTES, isRedirectError, tooLargeMessage, uploadFailedMessage } from "@/lib/uploads";
import { compressImage } from "@/lib/imageCompress";
import css from "./SchoolPageForm.module.css";
import MediaPicker from "./MediaPicker";
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

  async function uploadImage(slot: BrandingSlot, field: "aboutImageUrl" | "galleryImageUrls", file: File) {
    setMsg(null);
    setUploading(slot);
    try {
      // Resized first — see ShowEditor. SVG logos pass through untouched.
      const image = await compressImage(file);
      if (image.size > MAX_IMAGE_BYTES) {
        setMsg({ ok: false, text: tooLargeMessage(MAX_IMAGE_BYTES) });
        return;
      }
      const fd = new FormData();
      fd.set("file", image);
      const res = await uploadBrandingImage(schoolId, slot, fd);
      if ("url" in res) {
        if (field === "galleryImageUrls") {
          setForm(f => ({ ...f, galleryImageUrls: [...f.galleryImageUrls, res.url].slice(0, 6) }));
        } else set(field, res.url);
      }
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
  const busy = pending || !!uploading;
  function addGalleryImage(url: string) {
    setForm(f => f.galleryImageUrls.length >= 6 || f.galleryImageUrls.includes(url) ? f : ({ ...f, galleryImageUrls: [...f.galleryImageUrls, url] }));
  }
  function moveGalleryImage(index: number, delta: number) {
    setForm(f => {
      const urls = [...f.galleryImageUrls];
      const target = index + delta;
      if (target < 0 || target >= urls.length) return f;
      [urls[index], urls[target]] = [urls[target], urls[index]];
      return { ...f, galleryImageUrls: urls };
    });
  }

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.55 }}>
        These sections appear on {schoolName}&apos;s shows page, below the shows.
        Leave the gallery empty or clear the quote to hide either section independently.
      </p>

      {/* About the school */}
      <div className={`${styles.card} ${styles.cardPad}`}>
        <div className={styles.cardTitle} style={{ marginBottom: 4 }}>About {schoolName}</div>
        <MediaPicker schoolId={schoolId} onSelect={url => set("aboutImageUrl", url)} />
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

      <div className={`${styles.card} ${styles.cardPad}`}>
        <h2 className={styles.cardTitle}>Behind the Scenes</h2>
        <p className={css.help}>Add up to six backstage, rehearsal or performance photos. Use the arrows to change their order. Removing a photo here keeps it in the media library.</p>
        <fieldset disabled={busy} className={css.fieldset}>
          <ol className={css.gallery}>
            {form.galleryImageUrls.map((url, index) => (
              <li key={url} className={css.galleryItem}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Gallery photo ${index + 1}`} />
                <div className={css.controls}>
                  <span>{index + 1}</span>
                  <button type="button" className={styles.secondaryBtn} disabled={index === 0} aria-label={`Move photo ${index + 1} earlier`} onClick={() => moveGalleryImage(index, -1)}>←</button>
                  <button type="button" className={styles.secondaryBtn} disabled={index === form.galleryImageUrls.length - 1} aria-label={`Move photo ${index + 1} later`} onClick={() => moveGalleryImage(index, 1)}>→</button>
                  <button type="button" className={styles.secondaryBtn} aria-label={`Remove photo ${index + 1}`} onClick={() => setForm(f => ({ ...f, galleryImageUrls: f.galleryImageUrls.filter((_, i) => i !== index) }))}>Remove</button>
                </div>
              </li>
            ))}
          </ol>
          {form.galleryImageUrls.length < 6 && <div className={css.controls}>
            <MediaPicker schoolId={schoolId} onSelect={addGalleryImage} />
            <label className={styles.secondaryBtn}>
              {uploading === "gallery" ? "Uploading…" : "Upload photo"}
              <input type="file" accept="image/*" className={css.file} disabled={busy} onChange={e => {
                const file = e.target.files?.[0];
                if (file) void uploadImage("gallery", "galleryImageUrls", file);
                e.target.value = "";
              }} />
            </label>
          </div>}
        </fieldset>
        <p className={css.help} aria-live="polite">{form.galleryImageUrls.length} / 6 photos. {!form.galleryImageUrls.length && "Empty — this gallery is hidden on the school's page."}</p>
      </div>

      <div className={`${styles.card} ${styles.cardPad}`}>
        <h2 className={styles.cardTitle}>Behind the Lens</h2>
        <p className={css.help}>A personal quote in a full-width section, without a photograph. Leave the quote blank to hide it.</p>
        <label htmlFor="school-quote" className={styles.fieldLabel}>Quote</label>
        <textarea id="school-quote" className={styles.textarea} rows={7} maxLength={5000} value={form.quoteText} onChange={e => set("quoteText", e.target.value)} />
        <div className={css.attribution}>
          <div>
            <label htmlFor="quote-name" className={styles.fieldLabel}>Attribution name</label>
            <input id="quote-name" className={styles.input} maxLength={200} value={form.quoteName} onChange={e => set("quoteName", e.target.value)} />
          </div>
          <div>
            <label htmlFor="quote-role" className={styles.fieldLabel}>Role</label>
            <input id="quote-role" className={styles.input} maxLength={200} value={form.quoteRole} onChange={e => set("quoteRole", e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, position: "sticky", bottom: 0, padding: "14px 0", alignItems: "center", background: "var(--app-bg)" }}>
        <button className={styles.primaryBtn} disabled={busy} onClick={save}>{pending ? "Saving…" : "Save changes"}</button>
        <a href={`/?school=${slug}`} target="_blank" rel="noreferrer" className={styles.secondaryBtn}>View live page</a>
        {msg && <span className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`} style={{ margin: 0 }}>{msg.text}</span>}
      </div>
    </div>
  );
}
