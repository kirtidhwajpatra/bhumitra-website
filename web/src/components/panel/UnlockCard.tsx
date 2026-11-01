import { Icon } from "../Icon";
import { StoreButtons } from "../StoreButtons";

export function UnlockCard({ what }: { what: string }) {
  return (
    <div className="unlock">
      <span className="unlock__ico"><Icon name="lock" size={20} /></span>
      <b>Today's free searches are used</b>
      <p>See {what} in the Bhumitra app, or come back tomorrow for more free searches.</p>
      <StoreButtons compact />
    </div>
  );
}
