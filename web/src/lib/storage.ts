// Recent searches and saved plots, kept in the browser (like the app's on-device store).
import type { SelectedPlot } from "./types";

const RECENT = "bhumitra.recentPlots.v1";
const SAVED = "bhumitra.savedPlots.v1";
const MAX_RECENT = 8;

export interface StoredPlot {
  key: string;
  plotNumber: string;
  villageName: string;
  tahasilName: string;
  districtName: string;
  center: [number, number];
  savedAt: number;
}

function read(k: string): StoredPlot[] {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(k: string, list: StoredPlot[]) {
  try {
    localStorage.setItem(k, JSON.stringify(list));
  } catch {
    /* storage full or blocked */
  }
}

export function plotKey(p: SelectedPlot): string {
  return `${p.village.villageId}:${p.plotNumber}`;
}

export function toStored(p: SelectedPlot, center: [number, number]): StoredPlot {
  return {
    key: plotKey(p),
    plotNumber: p.plotNumber,
    villageName: p.village.villageName,
    tahasilName: p.village.tahasilName,
    districtName: p.village.districtName,
    center,
    savedAt: Date.now(),
  };
}

export const recents = {
  list: () => read(RECENT),
  add: (s: StoredPlot) => write(RECENT, [s, ...read(RECENT).filter((x) => x.key !== s.key)].slice(0, MAX_RECENT)),
};

export const saved = {
  list: () => read(SAVED),
  has: (key: string) => read(SAVED).some((x) => x.key === key),
  toggle: (s: StoredPlot): boolean => {
    const list = read(SAVED);
    if (list.some((x) => x.key === s.key)) {
      write(SAVED, list.filter((x) => x.key !== s.key));
      return false;
    }
    write(SAVED, [s, ...list]);
    return true;
  },
};
