// Step-by-step village picker (district → tahasil → gram panchayat → village), like the
// app's CadastralVillagePickerSheet.
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { AdminItem, VillageContext } from "../../lib/types";
import { Icon } from "../Icon";

type Level = "district" | "block" | "gp" | "village";
const TITLES: Record<Level, string> = { district: "District", block: "Tahasil", gp: "Gram panchayat", village: "Village" };

interface Props {
  onClose: () => void;
  onPick: (v: VillageContext) => void;
}

export function VillagePicker({ onClose, onPick }: Props) {
  const [level, setLevel] = useState<Level>("district");
  const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [district, setDistrict] = useState<AdminItem | null>(null);
  const [block, setBlock] = useState<AdminItem | null>(null);
  const [gp, setGp] = useState<AdminItem | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    setFilter("");
    const req =
      level === "district" ? api.districts()
      : level === "block" ? api.blocks(district!.id)
      : level === "gp" ? api.gps(block!.id)
      : api.villages(block!.id, gp!.id);
    req
      .then((r) => live && setItems([...r].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => live && setError("Couldn't load this list. Check your connection and try again."))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [level, district, block, gp]);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? items.filter((i) => i.name.toLowerCase().includes(f)) : items;
  }, [items, filter]);

  const choose = (it: AdminItem) => {
    if (level === "district") { setDistrict(it); setLevel("block"); }
    else if (level === "block") { setBlock(it); setLevel("gp"); }
    else if (level === "gp") { setGp(it); setLevel("village"); }
    else onPick({ villageId: it.id, villageName: it.name, tahasilId: block!.id, tahasilName: block!.name, districtId: district!.id, districtName: district!.name });
  };

  const back = () => {
    if (level === "block") setLevel("district");
    else if (level === "gp") setLevel("block");
    else if (level === "village") setLevel("gp");
    else onClose();
  };

  const trail = [district?.name, level !== "block" && block?.name, level === "village" && gp?.name].filter(Boolean).join(" · ");

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="picker" role="dialog" aria-modal="true" aria-label="Choose a village" onClick={(e) => e.stopPropagation()}>
        <header className="picker__head">
          <button className="icon-btn" aria-label={level === "district" ? "Close" : "Back"} onClick={back}>
            <Icon name={level === "district" ? "close" : "back"} />
          </button>
          <div>
            <h2>Choose {TITLES[level].toLowerCase()}</h2>
            {trail && <p>{trail}</p>}
          </div>
        </header>
        <div className="picker__filter">
          <Icon name="search" size={18} />
          <input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Search ${TITLES[level].toLowerCase()}`} aria-label={`Search ${TITLES[level].toLowerCase()}`} />
        </div>
        <div className="picker__list">
          {loading && Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton picker__skel" />)}
          {error && <p className="picker__msg">{error}</p>}
          {!loading && !error && shown.length === 0 && <p className="picker__msg">Nothing matches “{filter}”.</p>}
          {!loading && !error && shown.map((it) => (
            <button key={it.id} className="picker__row" onClick={() => choose(it)}>
              <span>{it.name}</span>
              <Icon name="chevron" size={16} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
