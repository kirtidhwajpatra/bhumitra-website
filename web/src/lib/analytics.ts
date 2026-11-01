// Firebase Analytics for Bhumitra Web, matching the iOS AnalyticsService event taxonomy.
// Connects to the production Firebase project (mybhoomi-backend-prod) for unified mobile + web reporting.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAnalytics,
  isSupported,
  logEvent as fbLogEvent,
  setUserId,
  setUserProperties,
  type Analytics,
} from "firebase/analytics";

const firebaseConfig = {
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || "mybhoomi-backend-prod",
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || "1:758542001999:web:179919000cbc76f9d6c73a",
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || "mybhoomi-backend-prod.firebasestorage.app",
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || "mybhoomi-backend-prod.firebaseapp.com",
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "758542001999",
  projectNumber: "758542001999",
};

const ANALYTICS_USER_ID_KEY = "bhumitra_analytics_user_id";

/** Persistent random pseudonymous ID that survives page reloads, matching iOS `pp_...` format. */
export function getAnalyticsUserId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(ANALYTICS_USER_ID_KEY);
    if (existing) return existing;
    const rand =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    const newId = `pp_web_${rand}`;
    localStorage.setItem(ANALYTICS_USER_ID_KEY, newId);
    return newId;
  } catch {
    return "";
  }
}

let app: FirebaseApp | null = null;
let analyticsInstance: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

export async function initAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (analyticsInstance) return analyticsInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!firebaseConfig.apiKey) return null;
      const supported = await isSupported();
      if (!supported) return null;

      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      analyticsInstance = getAnalytics(app);

      const userId = getAnalyticsUserId();
      if (userId) setUserId(analyticsInstance, userId);
      setUserProperties(analyticsInstance, {
        platform: "web",
        app_version: "web-0.1.0",
      });

      // App/Session start
      fbLogEvent(analyticsInstance, "app_opened", {
        platform: "web",
        screen_width: window.innerWidth,
        screen_height: window.innerHeight,
      });

      return analyticsInstance;
    } catch (e) {
      // Graceful fallback if adblocker or cookie restriction blocks Google Analytics
      if (import.meta.env?.DEV) console.info("[Analytics] Running in passive mode:", e);
      return null;
    }
  })();

  return initPromise;
}

/** Safely log an event to Firebase Analytics if available. */
export function logEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  initAnalytics()
    .then((inst) => {
      if (inst) {
        fbLogEvent(inst, name, params);
      }
    })
    .catch(() => {
      /* ignore adblocker rejections */
    });
}

// Strongly typed helpers matching the iOS AnalyticsEvent taxonomy:

export const analytics = {
  screenView: (screenName: string) => {
    logEvent("screen_view", {
      screen_name: screenName,
      screen_class: screenName,
    });
  },

  landSearchSubmitted: (query: string, searchMethod = "top_bar") => {
    logEvent("land_search_submitted", {
      search_method: searchMethod,
      query: query.slice(0, 100),
    });
  },

  villageSelected: (v: {
    districtName?: string;
    tahasilName?: string;
    villageName: string;
    villageId?: string;
  }) => {
    logEvent("village_selected", {
      district_name: v.districtName ?? "",
      tahasil_name: v.tahasilName ?? "",
      village_name: v.villageName,
      village_id: v.villageId ?? "",
    });
  },

  plotTapped: (p: {
    plotNo: string;
    villageName: string;
    tahasilName: string;
    districtName: string;
    areaAcre?: number | null;
  }) => {
    logEvent("plot_tapped", {
      plot_number: p.plotNo,
      village_name: p.villageName,
      tahasil_name: p.tahasilName,
      district_name: p.districtName,
      area_acre: p.areaAcre ? Number(p.areaAcre.toFixed(4)) : 0,
    });
  },

  landRecordViewed: (r: {
    plotNo: string;
    district: string;
    tahasil: string;
    village: string;
    isGovernmentLand: boolean;
    ownerCount: number;
    landClassification?: string;
  }) => {
    logEvent("land_record_viewed", {
      plot_number: r.plotNo,
      district_id: r.district,
      tehsil_id: r.tahasil,
      village_id: r.village,
      is_government_land: r.isGovernmentLand,
      owner_count: r.ownerCount,
      land_classification: r.landClassification ?? "unknown",
    });
  },

  landRecordAction: (action: "share" | "save" | "unsave" | "print" | "open_in_app", extra?: Record<string, any>) => {
    logEvent("land_record_action", {
      action,
      ...extra,
    });
  },

  sectionToggled: (sectionId: string, expanded: boolean) => {
    logEvent("section_toggled", {
      section: sectionId,
      expanded,
    });
  },

  appStoreClicked: (store: "apple" | "google", triggerSource: string) => {
    logEvent("app_store_clicked", {
      store,
      trigger_source: triggerSource,
    });
  },

  themeChanged: (theme: "light" | "dark") => {
    logEvent("theme_changed", {
      theme,
    });
  },

  mapControlClicked: (control: string) => {
    logEvent("map_control_clicked", {
      control,
    });
  },
};
