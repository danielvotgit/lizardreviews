/* Microsoft Clarity, heatmaps and session recordings.
   Loaded from a file so the CSP does not have to allow inline scripts.
   Runs cookie-free: consent is denied up front, so Clarity sets no cookies
   and no consent banner is needed. */
(function (c, l, a, r, i, t, y) {
  // live site only, local and preview servers stay out of the data
  if (!/(^|\.)lizardreviews\.com$/.test(location.hostname)) return;
  c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
  c[a]("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
  t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
  y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
})(window, document, "clarity", "script", "yv3v28kdc4");
