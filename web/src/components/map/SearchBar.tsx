// Top search bar: places from /location/search, recent plots, and a link to browse villages.
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { recents, type StoredPlot } from "../../lib/storage";
import type { SearchResult } from "../../lib/types";
import { Icon } from "../Icon";

interface Props {
  onPlace: (r: SearchResult) => void;
  onRecent: (p: StoredPlot) => void;
  onBrowse: () => void;
}

export function SearchBar({ onPlace, onRecent, onBrowse }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recentList, setRecentList] = useState<StoredPlot[]>([]);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      api
        .search(term, ctrl.signal)
        .then((r) => setResults(r.results.slice(0, 8)))
        .catch((e) => e.name !== "AbortError" && setResults([]))
        .finally(() => setLoading(false));
    }, 280);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (r: SearchResult) => {
    setQ(r.title);
    setOpen(false);
    onPlace(r);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active >= 0 ? active : 0]) choose(results[active >= 0 ? active : 0]);
    else if (e.key === "Escape") setOpen(false);
  };

  const showRecents = open && q.trim().length < 2;

  return (
    <div className="search" ref={wrap}>
      <div className={`search__box ${open ? "is-open" : ""}`}>
        <Icon name="search" className="search__icon" />
        <input
          type="search"
          value={q}
          placeholder="Search village, area or town in Odisha"
          aria-label="Search village, area or town in Odisha"
          aria-expanded={open}
          aria-controls="search-results"
          role="combobox"
          autoComplete="off"
          onFocus={() => { setRecentList(recents.list()); setOpen(true); }}
          onChange={(e) => { setQ(e.target.value); setActive(-1); setOpen(true); }}
          onKeyDown={onKey}
        />
        {q && (
          <button className="search__clear" aria-label="Clear search" onClick={() => { setQ(""); setResults([]); }}>
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="search__panel" id="search-results" role="listbox">
          {showRecents && recentList.length > 0 && (
            <>
              <p className="search__label">Recent plots</p>
              {recentList.map((p) => (
                <button key={p.key} className="search__row" role="option" onClick={() => { setOpen(false); onRecent(p); }}>
                  <span className="search__ico"><Icon name="history" size={18} /></span>
                  <span><b>Plot {p.plotNumber}</b><small>{p.villageName}, {p.tahasilName}</small></span>
                </button>
              ))}
            </>
          )}
          {!showRecents && loading && <p className="search__hint">Searching…</p>}
          {!showRecents && !loading && results.length === 0 && (
            <p className="search__hint">No places found. Try a town or district, or browse villages below.</p>
          )}
          {!showRecents &&
            results.map((r, i) => (
              <button key={r.id} className={`search__row ${i === active ? "is-active" : ""}`} role="option" aria-selected={i === active} onClick={() => choose(r)}>
                <span className="search__ico"><Icon name="pin" size={18} /></span>
                <span><b>{r.title}</b>{r.subtitle && <small>{r.subtitle}</small>}</span>
              </button>
            ))}
          <button className="search__browse" onClick={() => { setOpen(false); onBrowse(); }}>
            <Icon name="list" size={18} /> Choose district, tahasil and village
            <Icon name="chevron" size={16} className="search__browse-chev" />
          </button>
        </div>
      )}
    </div>
  );
}
