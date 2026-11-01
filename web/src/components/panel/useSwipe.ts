// Vertical swipe on a phone bottom sheet's header: up to open it fully, down to shrink it.
import { useRef } from "react";

export function useSwipe(onUp: () => void, onDown: () => void, threshold = 36) {
  const start = useRef<{ y: number; x: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = { y: t.clientY, x: t.clientX };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dy = t.clientY - s.y;
      const dx = t.clientX - s.x;
      if (Math.abs(dy) < threshold || Math.abs(dy) < Math.abs(dx)) return;
      if (dy < 0) onUp();
      else onDown();
    },
  };
}

export const isPhone = () => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
