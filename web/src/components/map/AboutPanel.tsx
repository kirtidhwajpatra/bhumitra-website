import { Icon } from "../Icon";
import { StoreButtons } from "../StoreButtons";

export function AboutPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="about" role="dialog" aria-modal="true" aria-label="About Bhumitra" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn about__close" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        <img src="/img/app-icon.png" alt="" width="64" height="64" />
        <h2>Odisha's land records, on a map</h2>
        <p>Search a village or tap any plot to see its boundary, area and Record of Rights. Plot lines come from Odisha's cadastral maps; records come from Bhulekh.</p>
        <ul>
          <li><Icon name="plot" size={18} /> Every plot in a village, on satellite imagery</li>
          <li><Icon name="khata" size={18} /> Khata, area and land type from the Record of Rights</li>
          <li><Icon name="owner" size={18} /> Owner names, land value and registration cost in the app</li>
        </ul>
        <StoreButtons />
        <p className="about__fine">Bhumitra is an independent app, not affiliated with the Government of Odisha. Maps and records are for information only.</p>
      </section>
    </div>
  );
}
