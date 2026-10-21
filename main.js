// Bhumitra landing: store links, OS-aware CTA, scroll effects.
(() => {
  const CONFIG = {
    iosUrl: "https://apps.apple.com/in/app/bhumitra/id6760656162",
    // Set this to the Play Store URL once the Android app is live; the "Coming soon" state then turns off automatically.
    androidUrl: "",
    supportEmail: "support@getbhumitra.in",
  };

  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  const toastEl = document.getElementById("toast");
  let toastTimer;
  const toast = (html) => {
    toastEl.innerHTML = html;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 4800);
  };
  const androidSoon = () =>
    toast(`The Android app is coming soon to Google Play. <a href="mailto:${CONFIG.supportEmail}?subject=Notify%20me%3A%20Bhumitra%20for%20Android">Get notified</a>`);

  // Google Play buttons
  document.querySelectorAll(".js-android").forEach((a) => {
    if (CONFIG.androidUrl) {
      a.href = CONFIG.androidUrl;
      a.target = "_blank";
      a.rel = "noopener";
    } else {
      a.classList.add("store--soon");
      a.setAttribute("aria-label", "Google Play, coming soon");
      a.addEventListener("click", (e) => { e.preventDefault(); androidSoon(); });
    }
  });

  // Nav CTA goes straight to the right store on phones and scrolls to the download section on desktop
  document.querySelectorAll(".js-smart-download").forEach((a) => {
    if (isIOS) { a.href = CONFIG.iosUrl; a.target = "_blank"; a.rel = "noopener"; }
    else if (isAndroid && CONFIG.androidUrl) { a.href = CONFIG.androidUrl; a.target = "_blank"; a.rel = "noopener"; }
  });

  // Nav background after scrolling
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Fade sections in as they scroll into view
  const els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 80}ms`; io.observe(el); });
  } else {
    els.forEach((el) => el.classList.add("in"));
  }

  document.getElementById("yr").textContent = new Date().getFullYear();
})();
