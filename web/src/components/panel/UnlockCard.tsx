import { Icon } from "../Icon";
import { StoreButtons } from "../StoreButtons";

export function UnlockCard({ what }: { what: string }) {
  return (
    <div className="unlock">
      <span className="unlock__ico"><Icon name="lock" size={20} /></span>
      <b>Only a preview came back</b>
      <p>The record service sent a masked copy of {what}. Try again in a moment, or open the plot in the Bhumitra app.</p>
      <StoreButtons compact source="preview_unlock_card" />
    </div>
  );
}
