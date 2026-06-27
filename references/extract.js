// Runs inside the target page via Playwright's browser_evaluate tool.
// Walks the full DOM (not just viewport), samples computed styles, and returns
// a JSON-friendly snapshot of the design surface: colors, typography, layout,
// effects, cards, images, spacing, section gaps, and the first major grid.
//
// Pass the entire contents of this file as the `function` parameter to
// mcp__playwright__browser_evaluate. The runtime returns the value.
//
// Output contract (matches what step1-measure.md expects):
//   {
//     url, title, viewport,
//     colors: { pageBackground, backgroundColors[], textColors[], accentCandidates[] },
//     typography: { uniqueFamilies[], headings{h1..h6}, body },
//     layout: { bodyPadding, containerMaxWidth, containerPadding },
//     effects: { radii[], shadows[], transitions[] },
//     cards: [{ selector, width, height, ratio, radius, shadow }],
//     images: [{ src, naturalWidth, naturalHeight, ratio, role }],
//     spacingSamples: [{ tag, margin, padding }],
//     sectionGaps: [{ between, gap }],
//     grid: { columns, gap, template } | null,
//     focusVisible: boolean,  // ":focus-visible" rule detected anywhere
//     reducedMotion: boolean  // "@media (prefers-reduced-motion)" detected
//   }

() => {
  // Style sampling scans the whole page — high limit so footers/late sections aren't missed.
  const MAX_STYLE_ELEMENTS = 8000;
  // Card/grid detection only needs a representative viewport-first sample.
  const MAX_CARD_ELEMENTS = 2000;
  const TOP_COLORS = 8;
  const TOP_RADII = 8;
  const TOP_SHADOWS = 6;

  const data = {
    url: location.href,
    title: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };

  // ---------- helpers ----------

  // isRendered: element exists in the layout (non-zero dimensions) and isn't CSS-hidden.
  // Does NOT require the element to be in the current viewport — captures below-fold elements.
  const isRendered = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // isInViewport: element is rendered AND currently on-screen (for geometry tasks).
  const isInViewport = (el) => {
    if (!isRendered(el)) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };

  const topByCount = (map, n) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);

  const bump = (map, key) => {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  };

  const safeSelector = (el) => {
    const tag = el.tagName.toLowerCase();
    const cls =
      el.className && typeof el.className === "string" && el.className.trim()
        ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    return tag + cls;
  };

  // ---------- gather elements (two pools) ----------
  // styleEls: full-page rendered elements for color/font/effect/section sampling.
  // viewportEls: viewport-only elements for card and grid detection.
  const styleEls = [];
  const viewportEls = [];
  const all = document.body ? document.body.querySelectorAll("*") : [];
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (styleEls.length < MAX_STYLE_ELEMENTS && isRendered(el)) styleEls.push(el);
    if (viewportEls.length < MAX_CARD_ELEMENTS && isInViewport(el)) viewportEls.push(el);
    if (styleEls.length >= MAX_STYLE_ELEMENTS && viewportEls.length >= MAX_CARD_ELEMENTS) break;
  }

  // Keep a single reference for backwards-compat (used by spacing/section/grid below).
  const visible = styleEls;

  // ---------- colors ----------
  const bgCounts = new Map();
  const fgCounts = new Map();
  const skipBg = (c) => !c || c === "rgba(0, 0, 0, 0)" || c === "transparent";

  const bodyBg = document.body ? getComputedStyle(document.body).backgroundColor : "rgb(255, 255, 255)";
  for (const el of visible) {
    const s = getComputedStyle(el);
    if (!skipBg(s.backgroundColor)) bump(bgCounts, s.backgroundColor);
    // only count text color when the element actually has text
    if (el.childNodes && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) {
      bump(fgCounts, s.color);
    }
  }

  // Accent candidates: colors used in interactive surfaces (buttons, links)
  const accentCounts = new Map();
  document.querySelectorAll("button, a, [role='button']").forEach((el) => {
    if (!isRendered(el)) return;
    const s = getComputedStyle(el);
    if (!skipBg(s.backgroundColor)) bump(accentCounts, s.backgroundColor);
    if (s.color) bump(accentCounts, s.color);
  });

  data.colors = {
    pageBackground: bodyBg,
    backgroundColors: topByCount(bgCounts, TOP_COLORS),
    textColors: topByCount(fgCounts, 6),
    accentCandidates: topByCount(accentCounts, 6),
  };

  // ---------- typography ----------
  const families = new Map();
  const headings = {};
  for (const el of visible) {
    const s = getComputedStyle(el);
    const family = (s.fontFamily || "").split(",")[0].replace(/['"]/g, "").trim();
    if (family) bump(families, family);
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag) && !headings[tag]) {
      headings[tag] = {
        size: s.fontSize,
        weight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        family,
      };
    }
  }

  let bodyEl = document.querySelector("main p, article p");
  if (!bodyEl) bodyEl = document.querySelector("p");
  let bodyType = null;
  if (bodyEl) {
    const s = getComputedStyle(bodyEl);
    bodyType = {
      size: s.fontSize,
      weight: s.fontWeight,
      lineHeight: s.lineHeight,
      family: (s.fontFamily || "").split(",")[0].replace(/['"]/g, "").trim(),
      maxWidth: s.maxWidth,
    };
  }

  data.typography = {
    uniqueFamilies: topByCount(families, 6),
    headings,
    body: bodyType,
  };

  // ---------- layout ----------
  const findFirst = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };
  const container = findFirst([
    "main",
    "[class*='container']",
    "[class*='wrapper']",
    "[class*='Container']",
    "article",
    "header",
    "section",
  ]);
  const bodyStyle = document.body ? getComputedStyle(document.body) : null;
  data.layout = {
    bodyPadding: bodyStyle ? bodyStyle.padding : "unknown",
    containerMaxWidth: container ? getComputedStyle(container).maxWidth : "none",
    containerPadding: container ? getComputedStyle(container).padding : "none",
    containerWidth: container ? Math.round(container.getBoundingClientRect().width) + "px" : "unknown",
  };

  // ---------- effects ----------
  const radiiCount = new Map();
  const shadowCount = new Map();
  const transitionSet = new Set();
  for (const el of visible) {
    const s = getComputedStyle(el);
    if (s.borderRadius && s.borderRadius !== "0px") bump(radiiCount, s.borderRadius);
    if (s.boxShadow && s.boxShadow !== "none") bump(shadowCount, s.boxShadow);
    if (s.transition && s.transition !== "all 0s ease 0s" && s.transition !== "none 0s ease 0s") {
      transitionSet.add(s.transition);
    }
  }
  data.effects = {
    radii: topByCount(radiiCount, TOP_RADII),
    shadows: topByCount(shadowCount, TOP_SHADOWS),
    transitions: Array.from(transitionSet).slice(0, 6),
  };

  // ---------- card heuristics (viewport elements only — need real rendered positions) ----------
  const cardCandidates = [];
  for (const el of viewportEls) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const hasRound = parseFloat(s.borderRadius) > 0;
    const hasShadowOrBorder = s.boxShadow !== "none" || (s.borderWidth && parseFloat(s.borderWidth) > 0);
    const sized = r.width > 140 && r.width < 900 && r.height > 80 && r.height < 700;
    const hasChildren = el.children && el.children.length > 0;
    if (hasRound && hasShadowOrBorder && sized && hasChildren) {
      cardCandidates.push({ el, r, s });
    }
    if (cardCandidates.length >= 12) break;
  }
  data.cards = cardCandidates.slice(0, 8).map(({ el, r, s }) => ({
    selector: safeSelector(el),
    width: Math.round(r.width) + "px",
    height: Math.round(r.height) + "px",
    ratio: (r.width / r.height).toFixed(2) + ":1",
    radius: s.borderRadius,
    shadow: s.boxShadow === "none" ? null : s.boxShadow,
  }));

  // ---------- images ----------
  data.images = Array.from(document.querySelectorAll("img"))
    .filter((img) => img.naturalWidth > 80 && img.naturalHeight > 80)
    .slice(0, 10)
    .map((img) => {
      const r = img.getBoundingClientRect();
      const role = r.width > 800 ? "hero" : r.width > 300 ? "feature" : "thumbnail";
      return {
        src: img.currentSrc || img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        ratio: (img.naturalWidth / img.naturalHeight).toFixed(2) + ":1",
        renderedWidth: Math.round(r.width) + "px",
        role,
      };
    });

  // ---------- spacing samples ----------
  const sampleTags = ["section", "article", "h1", "h2", "h3", "p", "ul", "button", "nav", "footer"];
  data.spacingSamples = sampleTags
    .map((tag) => {
      const el = document.querySelector(tag);
      if (!el || !isRendered(el)) return null;
      const s = getComputedStyle(el);
      return { tag, margin: s.margin, padding: s.padding, gap: s.gap || null };
    })
    .filter(Boolean);

  // ---------- section gaps (full page — all rendered sections, not just viewport) ----------
  const sections = Array.from(document.querySelectorAll("section, main > article, main > div, main > section"))
    .filter((el) => isRendered(el) && el.getBoundingClientRect().height > 200)
    .slice(0, 10);
  data.sectionGaps = [];
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i].getBoundingClientRect();
    const b = sections[i + 1].getBoundingClientRect();
    const gap = b.top - a.bottom;
    if (gap > 0 && gap < 600) {
      data.sectionGaps.push({
        between: sections[i].tagName.toLowerCase() + "[" + i + "]→" + sections[i + 1].tagName.toLowerCase() + "[" + (i + 1) + "]",
        gap: Math.round(gap),
      });
    }
  }

  // ---------- first significant grid (full-page scan) ----------
  let grid = null;
  for (const el of styleEls) {
    const s = getComputedStyle(el);
    if (s.display === "grid") {
      const cols = s.gridTemplateColumns.split(/\s+(?![^()]*\))/).filter(Boolean);
      if (cols.length >= 2) {
        grid = {
          columns: cols.length,
          gap: s.gap || s.gridGap || "none",
          template: s.gridTemplateColumns.slice(0, 120),
          selector: safeSelector(el),
        };
        break;
      }
    }
  }
  data.grid = grid;

  // ---------- interaction signals (read all stylesheets we can) ----------
  let focusVisible = false;
  let reducedMotion = false;
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch (_) {
        continue; // cross-origin sheet
      }
      if (!rules) continue;
      for (const rule of rules) {
        const text = rule.cssText || "";
        if (!focusVisible && text.includes(":focus-visible")) focusVisible = true;
        if (!reducedMotion && text.includes("prefers-reduced-motion")) reducedMotion = true;
        if (focusVisible && reducedMotion) break;
      }
      if (focusVisible && reducedMotion) break;
    }
  } catch (_) {
    // ignore
  }
  data.focusVisible = focusVisible;
  data.reducedMotion = reducedMotion;

  return data;
};
