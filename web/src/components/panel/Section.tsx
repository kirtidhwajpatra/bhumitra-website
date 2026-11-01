// One section of the land panel, with its own loading state.
import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";

interface Props {
  icon: IconName;
  title: string;
  loading?: boolean;
  badge?: ReactNode;
  loadingText?: string;
  children: ReactNode;
}

export function Section({ icon, title, loading, badge, loadingText = "Loading", children }: Props) {
  return (
    <section className={`psec ${loading ? "is-loading" : ""}`} aria-busy={loading || undefined}>
      <header className="psec__head">
        <span className="psec__ico"><Icon name={icon} size={18} /></span>
        <h3>{title}</h3>
        {loading ? <span className="psec__status"><span className="spinner spinner--dark" aria-hidden="true" /> {loadingText}</span> : badge}
      </header>
      <div className="psec__body">{children}</div>
    </section>
  );
}

export function Rows({ lines = 3 }: { lines?: number }) {
  return (
    <div className="psec__skel" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skel-row">
          <span className="skeleton skel-a" />
          <span className="skeleton skel-b" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
        </div>
      ))}
    </div>
  );
}

export function Field({ label, value, sub, lang }: { label: string; value: ReactNode; sub?: ReactNode; lang?: string }) {
  return (
    <div className="pfield">
      <dt>{label}</dt>
      <dd lang={lang}>{value}{sub && <span>{sub}</span>}</dd>
    </div>
  );
}

export function SectionError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="psec__error">
      <p>{message}</p>
      {retry && <button className="btn btn--ghost btn--sm" onClick={retry}>Try again</button>}
    </div>
  );
}
