import styles from "./shop.module.css";

export default function SchoolQuote({ text, name, role }: {
  text: string | null;
  name: string | null;
  role: string | null;
}) {
  if (!text?.trim()) return null;
  return (
    <section className={styles.behindLens} aria-labelledby="behind-lens-title">
      <div className={styles.behindLensBody}>
        <h2 id="behind-lens-title" className={styles.behindLensTitle}>Behind the Lens</h2>
        <figure className={styles.personalQuote}>
          <span className={styles.quoteMark} aria-hidden="true">“</span>
          <blockquote><p>{text}</p></blockquote>
          {(name || role) && (
            <figcaption className={styles.quoteAttribution}>
              {name && <span className={styles.quoteName}>{name}</span>}
              {role && <span>{role}</span>}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}
