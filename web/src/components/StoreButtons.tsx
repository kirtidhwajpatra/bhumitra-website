import { Icon } from "./Icon";

export const IOS_URL = "https://apps.apple.com/in/app/bhumitra/id6760656162";
// Set once the Android app is live on Google Play.
export const ANDROID_URL = "";

export function StoreButtons({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`stores ${compact ? "stores--compact" : ""}`}>
      <a className="store" href={IOS_URL} target="_blank" rel="noopener">
        <Icon name="apple" size={22} />
        <span><small>Download on the</small><strong>App Store</strong></span>
      </a>
      {ANDROID_URL ? (
        <a className="store" href={ANDROID_URL} target="_blank" rel="noopener">
          <Icon name="play" size={20} />
          <span><small>Get it on</small><strong>Google Play</strong></span>
        </a>
      ) : (
        <span className="store store--soon" aria-label="Google Play, coming soon">
          <Icon name="play" size={20} />
          <span><small>Coming soon</small><strong>Google Play</strong></span>
        </span>
      )}
    </div>
  );
}
