// What the left panel shows before a plot is tapped: what Bhumitra is, the districts,
// guides and FAQ. It is real, visible page content, so it is also what search engines read.
import { useState } from "react";
import guides from "../../data/guides.json";
import { Icon } from "../Icon";
import { StoreButtons } from "../StoreButtons";
import { useSwipe } from "./useSwipe";

export const FAQS: [string, string][] = [
  ["How do I see the plot map of my land in Odisha?", "Search your village or town, tap a district on the map, or tap locate. Zoom in and every plot appears in yellow on the satellite map. Tap a plot to open its land details."],
  ["Is this the official Bhulekh website?", "No. Bhumitra is an independent app. It shows Record of Rights data from Odisha's public Bhulekh portal (bhulekh.ori.nic.in), values from IGR Odisha and plot boundaries from the state's cadastral maps."],
  ["Is it free?", "Yes. Every plot search is free on the website and in the app: owners, khata, area, land type, government value and registration cost. You don't need to sign in."],
  ["Do I need a khata or plot number?", "No. Find the plot on the map and tap it. The plot number, khata and owners come from the record."],
  ["Is the map a legal boundary?", "No. Plot lines from cadastral maps are for reference. For an exact boundary, ask the Revenue Inspector or a licensed surveyor. For legal use, get a certified RoR from the Tahasil office."],
];

export const DISTRICTS = ["Anugul", "Balangir", "Baleswar", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Keonjhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"];

interface Props {
  onDistrict: (name: string) => void;
  onBrowse: () => void;
  onLocate: () => void;
  onCollapse: () => void;
  onAbout: () => void;
}

export function LandingPanel({ onDistrict, onBrowse, onLocate, onCollapse, onAbout }: Props) {
  const [open, setOpen] = useState(false);
  // Swiping down on the small sheet tucks it away; on the open sheet it shrinks it.
  const swipe = useSwipe(() => setOpen(true), () => (open ? setOpen(false) : onCollapse()));
  return (
    <aside className={`panel panel--landing ${open ? "is-expanded" : ""}`} aria-label="About Bhumitra">
      <button className="panel__grab" aria-label={open ? "Show less" : "Show districts, guides and questions"} aria-expanded={open} onClick={() => setOpen(!open)} {...swipe} />
      <button className="landing__collapse" onClick={onCollapse} aria-label="Hide this panel" title="Hide panel">
        <Icon name="panelClose" size={18} />
      </button>
      <div className="landing__hero" {...swipe}>
        <p className="landing__kicker"><Icon name="pin" size={14} /> Odisha land records</p>
        <h1>Every plot in Odisha, on one map.</h1>
        <p>Tap any plot to see its owners, khata, area, land type, government value and registration cost, from Bhulekh and IGR Odisha.</p>
        <div className="landing__cta">
          <button className="btn btn--primary btn--sm" onClick={onLocate}><Icon name="locate" size={16} /> Plots near me</button>
          <button className="btn btn--ghost btn--sm" onClick={onBrowse}><Icon name="list" size={16} /> Choose a village</button>
        </div>
        <button className="landing__more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Show less" : "Districts, guides and questions"}
          <Icon name="chevronDown" size={15} strokeWidth={2.4} />
        </button>
      </div>

      <div className="panel__body">
        <section className="landing__block">
          <h2>How it works</h2>
          <ol className="landing__steps">
            <li><b>Find the area</b><span>Search a town, tap a district, or tap “Plots near me”.</span></li>
            <li><b>Tap the plot</b><span>Every plot boundary is drawn on the satellite map with its number.</span></li>
            <li><b>Read the record</b><span>Owners and shares, khata, kisam, remarks, land value and costs.</span></li>
          </ol>
        </section>

        <section className="landing__block">
          <h2>Districts</h2>
          <div className="landing__chips">
            {DISTRICTS.map((d) => <button key={d} className="chip" onClick={() => onDistrict(d)}>{d}</button>)}
          </div>
        </section>

        <section className="landing__block">
          <h2>Land record guides</h2>
          <ul className="landing__guides">
            {guides.slice(0, 8).map((g) => (
              <li key={g.slug}><a href={`/blog/${g.slug}/`}><small>{g.category}</small>{g.title}</a></li>
            ))}
          </ul>
          <a className="linkbtn" href="/blog/">All {guides.length} guides →</a>
        </section>

        <section className="landing__block">
          <h2>Questions</h2>
          {FAQS.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </section>

        <section className="landing__block landing__app" id="get-app">
          <h2>Get the Bhumitra app</h2>
          <p>Plots near you, saved plots and land reports you can share, on your phone. Free.</p>
          <StoreButtons compact source="landing_panel" />
        </section>

        <p className="panel__source">
          <Icon name="shield" size={15} />
          <span>Bhumitra is an independent app, not affiliated with the Government of Odisha. Records and maps are for information only. <button className="linkbtn linkbtn--inline" onClick={onAbout}>About</button> · <a href="/blog/">Guides</a> · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/support/">Support</a></span>
        </p>
      </div>
    </aside>
  );
}
