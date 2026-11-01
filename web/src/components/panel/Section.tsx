// Building blocks of the land panel, matching the iOS land report: a collapsible
// section with an icon tile and a round chevron, and label-left / value-right rows.
import { useId, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon";

interface SectionProps {
  icon: IconName;
  title: string;
  open: boolean;
  onToggle: () => void;
  loading?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}

export function Section({ icon, title, open, onToggle, loading, badge, children }: SectionProps) {
  const bodyId = useId();
  return (
    <section className={`rsec ${open ? "is-open" : ""}`} aria-busy={loading || undefined}>
      <h3 className="rsec__h">
        <button className="rsec__head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
          <span className="rtile"><Icon name={icon} size={15} /></span>
          <span className="rsec__title">{title}</span>
          {badge}
          {loading && <span className="spinner spinner--dark" aria-label="Loading" />}
          <span className="rsec__chev"><Icon name="chevronDown" size={14} strokeWidth={2.4} /></span>
        </button>
      </h3>
      <div className="rsec__wrap" id={bodyId} role="region" aria-label={title} inert={!open} aria-hidden={!open}>
        <div className="rsec__body">{children}</div>
      </div>
    </section>
  );
}

interface RowProps {
  label: string;
  value?: ReactNode;
  caption?: ReactNode;
  /** Caption across the full width under the row instead of under the value. */
  captionBelow?: boolean;
  lang?: string;
  mono?: boolean;
  tone?: "muted" | "good" | "bad";
}

/** Label on the left, value on the right; skipped when there is no value. */
export function Row({ label, value, caption, captionBelow, lang, mono, tone }: RowProps) {
  if (value == null || value === "" || value === "-" || value === "—") return null;
  return (
    <div className="rrow">
      <div className="rrow__line">
        <span className="rrow__label">{label}</span>
        <span className={`rrow__value ${mono ? "is-mono" : ""} ${tone ? `is-${tone}` : ""}`} lang={lang}>
          {value}
          {caption && !captionBelow && <small>{caption}</small>}
        </span>
      </div>
      {caption && captionBelow && <p className="rrow__below">{caption}</p>}
    </div>
  );
}

/** Same row with an action on the right (a link, a menu, a button). */
export function ActionRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rrow">
      <div className="rrow__line">
        <span className="rrow__label">{label}</span>
        <span className="rrow__value">{children}</span>
      </div>
    </div>
  );
}

/** Brand-coloured text action for the right side of a row. */
export function RowLink({ children, icon, ...rest }: { children: ReactNode; icon?: IconName } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="rlink" {...rest}>
      {children}
      {icon && <Icon name={icon} size={13} strokeWidth={2.2} />}
    </button>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="rnote">{children}</p>;
}

export function Rows({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rskel" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="rskel__row">
          <span className="skeleton" style={{ width: 92 }} />
          <span className="skeleton" style={{ width: `${30 + ((i * 17) % 30)}%` }} />
        </div>
      ))}
    </div>
  );
}

export function SectionError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rerror">
      <p>{message}</p>
      {retry && <button className="btn btn--ghost btn--sm" onClick={retry}>Try again</button>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rempty">{children}</p>;
}
