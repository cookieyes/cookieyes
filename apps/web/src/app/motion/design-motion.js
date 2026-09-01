// Motion and canvas painting, ported from the design file's own component script
// (design/cydev/CookieYes Landing.dc.html). Kept as one imperative module on purpose:
// it is the designer's code, and re-porting it after a design change should stay a
// mechanical copy rather than a rewrite. Driven from LandingMotion.tsx.

class DesignMotion {
  constructor(root) {
    this.root = root;
    this.props = {
      accentColor: "#136FE8",
      scheme: "Light",
      sectionLines: false,
      packageName: "@cookieyes/cli",
      defaultFramework: "React",
      showBanner: false,
      showPlayground: false,
      previewViewport: "Desktop (full)",
    };
    this.state = { featSel: 0, light: true };
    this.bindElements();
  }

  // Plain state bag: nothing here re-renders React, the methods below drive the DOM
  // directly, exactly as they do in the design file.
  setState(patch) {
    const next = typeof patch === "function" ? patch(this.state) : patch;
    Object.assign(this.state, next);
  }

  // The design binds these through template refs. The ported markup keeps the same
  // structure and data-attributes, so they are found by query instead.
  // The design binds these through template refs, which its own runtime consumes.
  // The ported markup keeps the same structure and data-attributes, so each one is
  // found by query instead. Everything is optional: the methods below already guard.
  bindElements() {
    const r = this.root;
    const q = (sel) => r.querySelector(sel);
    const qa = (sel) => Array.from(r.querySelectorAll(sel));

    const nav = q('nav[data-screen-label="Navigation"]');
    const navDivs = nav ? Array.from(nav.children).filter((c) => c.tagName === "DIV") : [];
    this._navVeil = navDivs[0] ?? null;
    this._navEl = navDivs[1] ?? null;
    this._navProgEl = q("[data-nav-progress]");

    const logo = q('a[aria-label="CookieYes home"]');
    this._logoBoxEl = logo;
    this._logoFullEl = logo?.querySelector('svg[width="136"]') ?? null;
    this._logoCompactEl = logo?.querySelector('svg[width="111"]') ?? null;

    this._gridEl = q("[data-grid-frame]");
    this._globeMount = q("[data-globe-mount]");
    this._titleEl = q('section[data-screen-label="Hero"] h1');
    this._perfEl = q(".cy-bar");
    this._wordEl = q("footer canvas");

    // Decorative canvases, told apart by the attributes the design gives them.
    this._hots = new Set(qa('canvas[data-deco="hot"]'));
    this._fws = new Set(qa("canvas[data-fwc]"));
    this._glows = new Set(
      qa('canvas[aria-hidden="true"]').filter(
        (c) =>
          !c.hasAttribute("data-deco") &&
          !c.hasAttribute("data-fwc") &&
          !c.hasAttribute("data-geo-cv") &&
          !c.closest("footer"),
      ),
    );
    this._ripples = new Set();

    const slot = q("[data-cta-slot]");
    if (slot?.parentElement) this._ctaStepper(slot.parentElement);
  }

  _ctaStepper(el) {
    const VER = 10;
    if (!el || el._cyVer === VER) return;
    el._cyVer = VER;
    if (el._cyTimer) clearInterval(el._cyTimer);
    if (el._cyIo) el._cyIo.disconnect();
    const cards = Array.from(el.querySelectorAll("[data-cta-slot]"));
    const n = cards.length,
      STEP = 140,
      OFFSET = -140;
    let step = 1;
    const apply = (animate) => {
      cards.forEach((c, k) => {
        const pos = (k + step) % n;
        const wrapping = pos === 0;
        const active = pos === 2;
        c.style.transition =
          animate && !wrapping
            ? "transform 0.7s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s ease"
            : "none";
        c.style.transform =
          "translateY(" + (pos * STEP + OFFSET) + "px) scale(" + (active ? 1 : 0.64) + ")";
        c.style.boxShadow = active
          ? "0 2px 6px rgba(20,20,42,0.06), 0 6px 28px rgba(20,20,42,0.13)"
          : "0 1px 2px rgba(20,20,42,0.04), 0 3px 10px rgba(20,20,42,0.05)";
        c.style.zIndex = active ? "2" : "1";
        c.style.opacity = wrapping ? "0" : "1";
        const sk = c.querySelector("[data-sk]"),
          ct = c.querySelector("[data-ct]");
        if (sk) {
          sk.style.transition = "opacity 0.4s ease " + (active ? "0.25s" : "0s");
          sk.style.opacity = active ? "0" : "1";
        }
        if (ct) {
          ct.style.transition = "opacity 0.4s ease " + (active ? "0.25s" : "0s");
          ct.style.opacity = active ? "1" : "0";
        }
      });
    };
    apply(false);
    if (this.cyReduce && this.cyReduce()) return;
    const advance = () => {
      if (!document.contains(el)) {
        clearInterval(el._cyTimer);
        return;
      }
      step = (step + 1) % n;
      apply(true);
    };
    el._cyIo = new IntersectionObserver(
      (es) => {
        if (!es.some((x) => x.isIntersecting)) return;
        el._cyIo.disconnect();
        setTimeout(() => {
          advance();
          el._cyTimer = setInterval(advance, 4000);
        }, 600);
      },
      { threshold: 0.25 },
    );
    el._cyIo.observe(el);
  }
  startHeroType() {
    if (this._heroTyped) return;
    this._heroTyped = true;
    const h1 = this._titleEl || document.querySelector('section[data-screen-label="Hero"] h1');
    if (!h1 || this.cyReduce()) return;
    const node = h1.firstChild;
    if (!node || node.nodeType !== 3) return;
    const full = node.nodeValue;
    h1.style.minHeight = h1.offsetHeight + "px";
    node.nodeValue = "\u200B";
    let i = 0;
    setTimeout(() => {
      const iv = setInterval(() => {
        i += 1;
        node.nodeValue = full.slice(0, i) || "\u200B";
        if (i >= full.length) clearInterval(iv);
      }, 42);
    }, 350);
  }

  startBtlReveal() {
    if (this._btlObs) return;
    const sec = document.querySelector('section[data-screen-label="05 Built to last"]');
    if (!sec) return;
    const rowsWrap = sec.querySelector("[data-btl-rows]");
    const rows = rowsWrap ? Array.from(rowsWrap.children) : [];
    const heat = sec.querySelector("[data-btl-heat]");
    const cells = heat ? Array.from(heat.children) : [];
    const spark = sec.querySelector("[data-btl-spark]");
    const dots = Array.from(sec.querySelectorAll("[data-btl-dot]"));
    if (this.cyReduce()) return;
    rows.forEach((r) => {
      r.style.clipPath = "inset(0 100% 0 0)";
    });
    cells.forEach((c) => {
      c.style.opacity = "0";
      c.style.transform = "scale(0.5)";
    });
    if (spark) spark.style.clipPath = "inset(0 100% 0 0)";
    dots.forEach((d) => {
      d.style.opacity = "0";
    });
    const go = () => {
      rows.forEach((r, i) => {
        r.style.transition =
          "clip-path 0.9s cubic-bezier(0.22,1,0.36,1) " + (i * 0.14).toFixed(2) + "s";
        r.style.clipPath = "inset(0 0% 0 0)";
      });
      const gw = heat && heat.offsetWidth ? heat.offsetWidth : 1;
      cells.forEach((c) => {
        const d = (0.15 + (c.offsetLeft / gw) * 1.1).toFixed(2);
        c.style.transition =
          "opacity 0.35s ease " + d + "s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) " + d + "s";
        c.style.opacity = "1";
        c.style.transform = "scale(1)";
      });
      if (spark) {
        spark.style.transition = "clip-path 1.5s cubic-bezier(0.4,0,0.2,1) 0.5s";
        spark.style.clipPath = "inset(0 0% 0 0)";
      }
      dots.forEach((d) => {
        d.style.transition = "opacity 0.4s ease 1.9s";
        d.style.opacity = "1";
      });
    };
    this._btlObs = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          this._btlObs.disconnect();
          go();
        }
      },
      { threshold: 0.3 },
    );
    this._btlObs.observe(sec);
  }
  state = {
    pm: "bun",
    mobileNavOpen: false,
    fw: null,
    fw2: null,
    copiedInstall: false,
    copiedCta: false,
    copiedPrompt: false,
    light: false,
    searchOpen: false,
    query: "",
    selIdx: 0,
    featSel: 0,
    bannerDismissed: false,
  };

  applyTheme(light) {
    document.body.style.filter = "";
    document.body.classList.toggle("cy-light", !!light);
    if (this._Globe) {
      try {
        this._Globe.showAtmosphere(!!light);
      } catch (e) {}
    }

    this.applyAccent();
  }

  noLinesWanted() {
    const v = this.props.sectionLines;
    return v === false || v === "false" || v === 0 || v === "0" || v === "off";
  }

  applyLines() {
    const want = this.noLinesWanted();
    if (this.root.classList.contains("cy-nolines") === want) return;
    this.root.classList.toggle("cy-nolines", want);
    this._gridSig = null;
    if (this._gridEl) this.buildGrid();
  }

  componentDidUpdate() {
    if (this._applyBandTheme) this._applyBandTheme();
    this.applyLines();
  }

  pkg() {
    return this.props.packageName ?? "@cookieyes/cli";
  }

  fwOf(key) {
    return this.state[key] ?? this.props.defaultFramework ?? "React";
  }

  monoStack() {
    return "'Geist Mono', ui-monospace, Menlo, monospace";
  }

  heroFwStyle(active) {
    return {
      height: "40px",
      borderRadius: "4px",
      padding: "0 16px",
      display: "flex",
      flexDirection: "row",
      gap: "10px",
      alignItems: "center",
      boxSizing: "border-box",
      cursor: "pointer",
      userSelect: "none",
      border: "1px solid " + (active ? "var(--cy-accent)" : "var(--cy-faint)"),
      background: active ? "var(--cy-accent)" : "var(--cy-surface)",
      color: active ? "var(--cy-on-accent)" : "var(--cy-muted)",
      transition:
        "background 0.18s ease, color 0.18s ease, border-color 0.18s ease, filter 0.18s ease",
    };
  }

  pmTabStyle(active) {
    return {
      height: "28px",
      borderRadius: "4px",
      padding: "6px 12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box",
      cursor: "pointer",
      fontFamily: this.monoStack(),
      fontWeight: 500,
      fontSize: "12px",
      lineHeight: "16px",
      color: active ? "var(--cy-accent)" : "var(--cy-muted)",
      background: active ? "color-mix(in oklab, var(--cy-accent) 12%, transparent)" : "transparent",
      border: active ? "1px solid var(--cy-accent)" : "1px solid transparent",
      userSelect: "none",
    };
  }

  fwTabStyle(active) {
    return {
      height: "38px",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box",
      cursor: "pointer",
      fontFamily: this.monoStack(),
      fontWeight: 500,
      fontSize: "12px",
      lineHeight: "16px",
      color: active ? "#ECEDEF" : "#9A9DA6",
      borderTop: active ? "1px solid #ECEDEF" : "1px solid transparent",
      borderLeft: active ? "1px solid #ECEDEF" : "1px solid transparent",
      borderRight: active ? "1px solid #ECEDEF" : "1px solid transparent",
      borderBottom: active ? "2px solid #ECEDEF" : "2px solid transparent",
      marginBottom: "-1px",
      userSelect: "none",
    };
  }

  codeFor(fw) {
    const pkg = this.pkg();
    const S = "<" + "script";
    const SE = "</" + "script>";
    if (fw === "Next.js") {
      return (
        '// [placeholder: package name TBC]\nimport { ConsentProvider, ConsentBanner } from "' +
        pkg +
        '/next";\n\nexport default function RootLayout({ children }) {\n  return (\n    <ConsentProvider>\n      <ConsentBanner />\n      {children}\n    </ConsentProvider>\n  );\n}'
      );
    }
    return (
      '// [placeholder: package name TBC]\nimport { ConsentBanner, useConsent } from "' +
      pkg +
      '/react";\n\nexport function App() {\n  const { consent, accept, reject } = useConsent();\n\n  return (\n    <>\n      <ConsentBanner />\n      {consent.analytics && <Analytics />}\n    </>\n  );\n}'
    );
  }

  fileFor(fw) {
    return { React: "App.tsx", "Next.js": "layout.tsx" }[fw] || "App.tsx";
  }

  copyText(text, flag) {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    this.setState({ [flag]: true });
    clearTimeout(this["_t_" + flag]);
    this["_t_" + flag] = setTimeout(() => this.setState({ [flag]: false }), 1500);
  }

  applyAccent() {
    const hex = this.props.accentColor ?? "#136FE8";
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    const [r, g, b] = m
      ? [m[1], m[2], m[3]].map((h) => parseInt(h, 16) / 255)
      : [19 / 255, 111 / 255, 232 / 255];
    // hex -> OKLCH
    const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lr = lin(r),
      lg = lin(g),
      lb = lin(b);
    const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    const C = Math.sqrt(A * A + B * B);
    const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
    // OKLCH -> "r,g,b" (for the rgba(var(--x-rgb), a) slots)
    const toRgb = (L2, C2) => {
      const hr = (H * Math.PI) / 180;
      const a2 = C2 * Math.cos(hr),
        b2 = C2 * Math.sin(hr);
      const l2 = (L2 + 0.3963377774 * a2 + 0.2158037573 * b2) ** 3;
      const m2 = (L2 - 0.1055613458 * a2 - 0.0638541728 * b2) ** 3;
      const s2 = (L2 - 0.0894841775 * a2 - 1.291485548 * b2) ** 3;
      const gam = (c) => {
        c = Math.max(0, Math.min(1, c));
        return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
      };
      return [
        gam(4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2),
        gam(-1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2),
        gam(-0.0041960863 * l2 - 0.7034186147 * m2 + 1.707614701 * s2),
      ].join(",");
    };
    const ok = (L2, C2, a) =>
      "oklch(" +
      (L2 * 100).toFixed(1) +
      "% " +
      C2.toFixed(4) +
      " " +
      H.toFixed(1) +
      (a != null ? " / " + a : "") +
      ")";
    const root = document.documentElement.style;
    root.setProperty("--cy-accent", ok(L, C));
    root.setProperty("--cy-accent-dim", ok(L, C, 0.85));
    root.setProperty("--cy-accent-glow", ok(L, C, 0.8));
    root.setProperty(
      "--cy-wash-rgb",
      this.root.classList.contains("cy-light")
        ? toRgb(0.945, Math.min(C, 0.014))
        : toRgb(0.97, Math.min(C, 0.03)),
    );
    root.setProperty(
      "--cy-line-rgb",
      this.root.classList.contains("cy-light")
        ? toRgb(0.4, Math.min(C, 0.16))
        : toRgb(0.66, Math.min(C, 0.14)),
    );
    this._accentRgb = toRgb(L, C);
    root.setProperty("--cy-accent-rgb", this._accentRgb);
    this._accentBrightRgb = toRgb(Math.min(0.82, L + 0.12), C);
  }

  componentDidUpdate() {
    this.applyAccent();
    if (this._applyBandTheme) this._applyBandTheme();
    if (this._Globe && this._accentRgb !== this._lastGlobeAccent) {
      this._lastGlobeAccent = this._accentRgb;
      this.applyGlobeAccent();
    }
  }

  componentDidMount() {
    this.applyAccent();
    this.applyLines();
    this._linesIv = setInterval(() => this.applyLines(), 350);
    this._lastGlobeAccent = this._accentRgb;
    this._globeLazy = () => {
      if (this._globeStarted || !this._globeMount) return;
      const gr = this._globeMount.getBoundingClientRect();
      if (gr.bottom > -300 && gr.top < window.innerHeight + 300) this.initGlobe();
    };
    this._globeLazy();
    this._fitBento = () => {
      document.querySelectorAll("[data-fit]").forEach((el) => {
        const w = parseFloat(el.getAttribute("data-fit")) || 300;
        const p = el.parentElement;
        if (!p) return;
        const cs = getComputedStyle(p);
        const pw =
          p.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
        const ph =
          p.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
        const h = el.offsetHeight || 1;
        let s = pw / w;
        if (ph > 0 && h > 1) s = Math.min(s, ph / h);
        s = Math.min(1.35, s);
        el.style.transform = Math.abs(s - 1) > 0.01 ? "scale(" + s.toFixed(3) + ")" : "";
        el.style.transformOrigin = "center center";
      });
    };
    this._fitBento();
    window.addEventListener("resize", this._fitBento);
    setTimeout(this._fitBento, 300);
    this._onBentoResize = () => {
      if (this._gateLayout) this._gateLayout();
    };
    window.addEventListener("resize", this._onBentoResize);
    this.startGeoCycle();
    this.startBannerCycle();
    this.startThemeCycle();
    this.startAcCycle();
    this.startToggleCycle();
    if (!this.cyReduce()) {
      if (this._recIv) clearInterval(this._recIv);
      const seq = ["true", "true", "false", "true", "true"]; // analytics of the top visible row per tbFeed step (rows 5..1)
      this._recIv = setInterval(() => {
        const el = document.querySelector("[data-rec-bool]");
        const rows = document.querySelector(".tb-rows");
        if (!el || !rows || !rows.getAnimations) return;
        const anim = rows.getAnimations()[0];
        if (!anim || typeof anim.currentTime !== "number") return;
        const p = ((((anim.currentTime - 150) % 15000) + 15000) % 15000) / 15000;
        const v =
          p < 0.18 ? seq[0] : p < 0.38 ? seq[1] : p < 0.58 ? seq[2] : p < 0.78 ? seq[3] : seq[4];
        if (el.textContent !== v) {
          el.textContent = v;
          el.style.color = v === "true" ? "#56D364" : "#FF7B72";
        }
      }, 250);
    }
    this.startBtlReveal();
    this.startHeroType();
    this.startGateCycle();
    if (!this.cyReduce() && "IntersectionObserver" in window) {
      const cards = Array.from(document.querySelectorAll("[data-bento]"));
      cards.forEach((c) => c.classList.add("cy-pre"));
      const io = new IntersectionObserver(
        (ents) => {
          ents.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.remove("cy-pre");
              io.unobserve(en.target);
            }
          });
        },
        { threshold: 0.2 },
      );
      cards.forEach((c) => io.observe(c));
      this._bentoIO = io;
    }
    this._applyBandTheme = () => {
      const mode = this.props.scheme ?? "Light";
      if (mode === this._lastBandMode) return;
      this._lastBandMode = mode;
      const light = mode === "Light";
      this.setState({ light: light });
      this.applyTheme(light);
    };
    this._applyBandTheme();
    this._onMove = (e) => {
      const c = this._wordEl;
      if (!c) {
        this._wordHot = false;
        return;
      }
      const r = c.getBoundingClientRect();
      this._wordMx = e.clientX - r.left;
      this._wordMy = e.clientY - r.top;
      this._wordHot =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (this._hots) {
        this._hots.forEach((hc) => {
          const hr = hc.getBoundingClientRect();
          hc._hover =
            e.clientX >= hr.left &&
            e.clientX <= hr.right &&
            e.clientY >= hr.top &&
            e.clientY <= hr.bottom;
          hc._mx = e.clientX - hr.left;
          hc._my = e.clientY - hr.top;
        });
      }
      if (this._fws) {
        this._fws.forEach((fc) => {
          const fr = fc.getBoundingClientRect();
          fc._hover = false;
          fc._mx = e.clientX - fr.left;
          fc._my = e.clientY - fr.top;
        });
      }
      // globe parallax target (gentle, normalized -1..1 from viewport center)
      this._globeTx = (e.clientX / window.innerWidth - 0.5) * 2;
      this._globeTy = (e.clientY / window.innerHeight - 0.5) * 2;
      // globe pin hover hit-test (screen coords cached in this._globeHit)
      if (this._globeHit) {
        let found = null;
        for (const p of this._globeHit) {
          if (p.vis && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 22) {
            found = p;
            break;
          }
        }
        this._globeHover = found ? found.region : null;
      }
      if (this._globeTip) this._globeTip.style.opacity = "0";
    };
    window.addEventListener("mousemove", this._onMove);
    this._onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        this.setState({ searchOpen: !this.state.searchOpen, query: "", selIdx: 0 });
        return;
      }
      if (!this.state.searchOpen) return;
      if (e.key === "Escape") this.setState({ searchOpen: false });
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.setState({ selIdx: this.state.selIdx + 1 });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.setState({ selIdx: Math.max(0, this.state.selIdx - 1) });
      } else if (e.key === "Enter") this.setState({ searchOpen: false });
    };
    window.addEventListener("keydown", this._onKey);
    this._onNavScroll = () => {
      const y = window.scrollY || 0;
      const scrolled = y > 24;
      if (this._navEl && scrolled !== this._navScrolled) {
        this._navScrolled = scrolled;
        const s = this._navEl.style;
        if (scrolled) {
          s.maxWidth = "none";
          s.height = "56px";
          s.margin = "0";
          s.background = "var(--cy-bg)";
          s.borderColor = "var(--cy-border)";
          s.boxShadow = "none";
          s.backdropFilter = "none";
          s.webkitBackdropFilter = "none";
          if (this._navVeil) this._navVeil.style.opacity = "1";
          if (this._logoBoxEl) this._logoBoxEl.style.width = "136px";
          if (this._logoFullEl) this._logoFullEl.style.opacity = "1";
          if (this._logoCompactEl) this._logoCompactEl.style.opacity = "0";
        } else {
          s.maxWidth = "none";
          s.height = "56px";
          s.margin = "0";
          s.background = "var(--cy-bg)";
          s.borderColor = "var(--cy-border)";
          s.boxShadow = "none";
          s.backdropFilter = "none";
          s.webkitBackdropFilter = "none";
          if (this._navVeil) this._navVeil.style.opacity = "1";
          if (this._logoBoxEl) this._logoBoxEl.style.width = "136px";
          if (this._logoFullEl) this._logoFullEl.style.opacity = "1";
          if (this._logoCompactEl) this._logoCompactEl.style.opacity = "0";
        }
      }
      // Adapt nav theme to the band it currently floats over
      if (this._navEl) {
        const navHost = this._navEl.closest("nav");
        if (navHost) {
          // Nav keeps the hero section's palette permanently — pinned to the light band variant.
          navHost.classList.remove("cy-band-dark");
          navHost.classList.add("cy-band-light");
        }
      }
    };
    window.addEventListener("scroll", this._onNavScroll, { passive: true });
    this._onNavScroll();
    const fxEls = Array.from(document.querySelectorAll("[data-fx]"));
    const bySection = new Map();
    fxEls.forEach((el) => {
      const sec = el.closest("section");
      if (!sec) return;
      if (!bySection.has(sec)) bySection.set(sec, []);
      bySection.get(sec).push(el);
    });
    const setFx = (sec, on) => {
      (bySection.get(sec) || []).forEach((el) => {
        el.style.setProperty("opacity", on ? "1" : "0", "important");
        const cur = el.style.transform;
        if (cur && cur.indexOf("scale") !== -1) {
          const rev = on
            ? cur.replace(/scaleX\(0\)/, "scaleX(1)").replace(/scaleY\(0\)/, "scaleY(1)")
            : cur.replace(/scaleX\(1\)/, "scaleX(0)").replace(/scaleY\(1\)/, "scaleY(0)");
          el.style.setProperty("transform", rev, "important");
        }
      });
    };
    this._revealSections = Array.from(bySection.keys());
    this._setFx = setFx;
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = 0;
    const tick = (ts) => {
      this._raf = requestAnimationFrame(tick);
      if (this._wordHot && this._wordEl) this.drawWordmark(ts / 1000);
      if (this._hots) this._hots.forEach((h) => this.drawHotspot(h, ts / 1000));
      if (this._fws) this._fws.forEach((f) => this.drawFwParticles(f, ts / 1000));
      if (ts - last < 90) return;
      last = ts;
      if (this._onReveal) this._onReveal();
      if (this._globeLazy) this._globeLazy();
      if (this._gridEl) this.buildGrid();
      const t = ts / 1000;
      if (this._heroEl) this._heroEl.textContent = this.asciiCookie(t);
      if (this._ctaEl) this._ctaEl.textContent = this.asciiWave(t);
      if (this._glows) this._glows.forEach((g) => this.drawGlow(g, t));
      if (this._ripples) this._ripples.forEach((g) => this.drawRipple(g, t));
      if (this._wordEl && !this._wordHot) {
        const wr = this._wordEl.getBoundingClientRect();
        if (wr.bottom > -80 && wr.top < window.innerHeight + 80) this.drawWordmark(t);
      }
    };
    this._sizeBg = () => {
      const c = this._bgEl;
      if (!c) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
      this._bgDpr = dpr;
    };
    this._sizeBg();
    window.addEventListener("resize", this._sizeBg);
    this._rebuildGridSoon = () => {
      clearTimeout(this._gridT);
      this._gridT = setTimeout(() => this.buildGrid(), 80);
    };
    window.addEventListener("resize", this._rebuildGridSoon);
    if (window.ResizeObserver) {
      this._gridRO = new ResizeObserver(this._rebuildGridSoon);
      this._gridRO.observe(document.body);
    }
    setTimeout(() => this.buildGrid(), 500);
    setTimeout(() => this.buildGrid(), 1400);
    setTimeout(() => this.buildGrid(), 2800);
    window.addEventListener("load", this._rebuildGridSoon);
    if (reduce) {
      if (this._heroEl) this._heroEl.textContent = this.asciiCookie(1);
      if (this._ctaEl) this._ctaEl.textContent = this.asciiWave(1);
      if (this._glows) this._glows.forEach((g) => this.drawGlow(g, 1));
    } else {
      this._raf = requestAnimationFrame(tick);
    }
    const perfSec =
      (this._perfEl && this._perfEl.closest("section")) ||
      (document.querySelector(".cy-bar") && document.querySelector(".cy-bar").closest("section"));
    const runPerf = () => {
      if (this._perfDone) return;
      this._perfDone = true;
      if (!perfSec) return;
      const bars = perfSec.querySelectorAll(".cy-bar");
      bars.forEach((b, i) => {
        b.style.animation = "cyGrow 0.9s cubic-bezier(0.22,1,0.36,1) " + (i % 4) * 0.1 + "s both";
      });
      const nums = perfSec.querySelectorAll(".cy-num");
      nums.forEach((n) => {
        const target = parseFloat(n.getAttribute("data-count"));
        const suffix = n.getAttribute("data-suffix") || "";
        if (isNaN(target)) return;
        const dur = 1100,
          t0 = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - t0) / dur);
          const e = 1 - (1 - t) ** 3;
          n.textContent = Math.round(target * e) + suffix;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };
    this._runBp = (sec, instant) => {
      if (!this._bpDone) this._bpDone = new WeakSet();
      if (this._bpDone.has(sec)) return;
      const has = sec.querySelectorAll(".bp-draw, .bp-fade");
      if (!has.length) {
        this._bpDone.add(sec);
        return;
      }
      this._bpDone.add(sec);
      const counters = new Map();
      has.forEach((e2) => {
        const grp = e2.closest ? e2.closest("svg") || sec : sec;
        const i2 = counters.get(grp) || 0;
        counters.set(grp, i2 + 1);
        const isDraw = e2.classList && e2.classList.contains("bp-draw");
        const d = instant ? 0 : 0.1 + i2 * 0.08;
        e2.style.animation =
          (isDraw ? "bpDraw 0.9s cubic-bezier(0.4,0,0.2,1) " : "bpFade 0.5s ease ") +
          d.toFixed(2) +
          "s forwards";
      });
      sec.querySelectorAll(".bp-packet").forEach((p) => {
        p.style.animation =
          "bpPacket 2.6s ease-in-out " + (instant ? "0.2s" : "1.7s") + " infinite";
      });
      sec.querySelectorAll("[data-anim]").forEach((el) => {
        el.style.animation = el.getAttribute("data-anim");
      });
    };
    this._onReveal = () => {
      const vh = window.innerHeight;
      (this._revealSections || []).forEach((sec) => {
        const r = sec.getBoundingClientRect();
        if (r.top < vh * 0.85 && r.bottom > vh * 0.12) {
          this._setFx(sec, true);
          this._runBp(sec, false);
        }
      });
      if (perfSec && !this._perfDone) {
        const r = perfSec.getBoundingClientRect();
        if (r.top < vh * 0.8 && r.bottom > 0) runPerf();
      }
      document.querySelectorAll("[data-bento]").forEach((cell, ci) => {
        if (cell.getAttribute("data-bento-done")) return;
        const r = cell.getBoundingClientRect();
        if (r.top < vh * 0.88 && r.bottom > 0) {
          cell.setAttribute("data-bento-done", "1");
          setTimeout(() => this.playCell(cell), (ci % 2) * 180);
        }
      });
    };
    if (reduce) {
      (this._revealSections || []).forEach((sec) => {
        this._setFx(sec, true);
        this._runBp(sec, true);
      });
      runPerf();
    } else {
      window.addEventListener("scroll", this._onReveal, { passive: true });
      window.addEventListener("resize", this._onReveal);
      this._onReveal();
    }
    // clean scroll-reveal: fade + rise each section's content blocks as they enter, lightly staggered
    if (!reduce && "IntersectionObserver" in window) {
      const rio = new IntersectionObserver(
        (ents) => {
          ents.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("cy-rv-in");
            rio.unobserve(e.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
      );
      document
        .querySelectorAll(
          "section[data-screen-label]:not([data-screen-label='Hero']) > div:not([aria-hidden]), footer[data-screen-label] > div:not([aria-hidden])",
        )
        .forEach((wrap) => {
          const kids = Array.from(wrap.children)
            .filter(
              (k) =>
                k.getAttribute("aria-hidden") !== "true" &&
                getComputedStyle(k).position !== "absolute",
            )
            .flatMap((k) => (k.hasAttribute("data-rv-split") ? Array.from(k.children) : [k]));
          kids.forEach((k, i) => {
            k.classList.add("cy-rv");
            k.style.transitionDelay = Math.min(i, 4) * 80 + "ms";
            rio.observe(k);
          });
        });
      this._revealIO = rio;
    }
  }

  componentWillUnmount() {
    if (this._linesIv) clearInterval(this._linesIv);
    cancelAnimationFrame(this._raf);
    cancelAnimationFrame(this._globeRaf);
    if (this._flagEls) {
      for (const k in this._flagEls) {
        try {
          this._flagEls[k].remove();
        } catch (e) {}
      }
      this._flagEls = null;
    }
    if (this._routeIv) clearInterval(this._routeIv);
    if (this._geoIv) clearInterval(this._geoIv);
    if (this._geoRaf) cancelAnimationFrame(this._geoRaf);
    if (this._cssRaf) cancelAnimationFrame(this._cssRaf);
    if (this._cssT) this._cssT.forEach(clearTimeout);
    if (this._tgIv) clearInterval(this._tgIv);
    if (this._gateIv) clearInterval(this._gateIv);
    if (this._bentoIO) this._bentoIO.disconnect();
    if (this._revealIO) this._revealIO.disconnect();
    if (this._fitBento) window.removeEventListener("resize", this._fitBento);
    if (this._onBentoResize) window.removeEventListener("resize", this._onBentoResize);
    if (this._jbIv) clearInterval(this._jbIv);
    if (this._cbIv) clearInterval(this._cbIv);
    if (this._acIv) clearInterval(this._acIv);
    if (this._three && this._three.renderer) {
      try {
        this._three.renderer.dispose();
      } catch (e) {}
    }
    if (this._sizeGlobe) window.removeEventListener("resize", this._sizeGlobe);
    if (this._featTimer) clearInterval(this._featTimer);
    if (this._io) this._io.disconnect();
    if (this._onReveal) {
      window.removeEventListener("scroll", this._onReveal);
      window.removeEventListener("resize", this._onReveal);
    }
    if (this._sizeBg) window.removeEventListener("resize", this._sizeBg);
    if (this._rebuildGridSoon) window.removeEventListener("resize", this._rebuildGridSoon);
    if (this._gridRO) this._gridRO.disconnect();
    if (this._onMove) window.removeEventListener("mousemove", this._onMove);
    if (this._onKey) window.removeEventListener("keydown", this._onKey);
    if (this._onNavScroll) window.removeEventListener("scroll", this._onNavScroll);
    if (this._fxIo) this._fxIo.disconnect();
    if (this._tickOv) {
      this._tickOv.remove();
      this._tickOv = null;
    }
    clearInterval(this._typeIv);
  }

  globeMarkers() {
    return [
      { region: "EU", law: "GDPR", lat: 50, lon: 10 },
      { region: "UK", law: "UK GDPR", lat: 54, lon: -2 },
      { region: "California", law: "CCPA / CPRA", lat: 37, lon: -119 },
      { region: "Brazil", law: "LGPD", lat: -2, lon: -66 },
      { region: "Canada", law: "PIPEDA", lat: 58, lon: -100 },
    ];
  }

  globeTourOrder() {
    return this.globeMarkers()
      .slice()
      .sort((a, b) => a.lon - b.lon)
      .map((m) => m.region);
  }

  regionLon(region) {
    const m = this.globeMarkers().find((x) => x.region === region);
    return m ? m.lon : 0;
  }

  accentGlobeColor() {
    const rgb = (this._accentRgb || "19,111,232").split(",").map((n) => parseInt(n, 10) / 255);
    return rgb.length === 3 ? rgb : [0.29, 0.54, 0.96];
  }

  accentCss() {
    return "rgb(" + (this._accentRgb || "19,111,232") + ")";
  }

  async initGlobe() {
    const mount = this._globeMount;
    if (!mount || this._globeStarted) return;
    this._globeStarted = true;
    let THREE, ThreeGlobe, countries;
    try {
      // fire all module imports + the country data fetch in parallel (was 4 serial round-trips)
      // The design pulls these from esm.sh and jsDelivr at runtime. Here they are real
      // dependencies, so the globe needs no third-party origin and works under a strict
      // connect-src. Still dynamic imports: three.js stays out of the initial bundle and
      // only loads when the hero is near the viewport.
      const [THREE_, gm, topojson, topo] = await Promise.all([
        import("three"),
        import("three-globe"),
        import("topojson-client"),
        import("world-atlas/countries-110m.json").then((m) => m.default ?? m),
      ]);
      THREE = THREE_;
      ThreeGlobe = gm.default;
      countries = topojson.feature(topo, topo.objects.countries).features;
    } catch (e) {
      this._globeStarted = false;
      return;
    }
    if (!this._globeMount) return;
    this._THREE = THREE;
    const markers = this.globeMarkers();
    const home = markers[0];
    const arcs = markers
      .slice(1)
      .map((m) => ({ startLat: home.lat, startLng: home.lon, endLat: m.lat, endLng: m.lon }));
    const acc = this.accentCss();
    const EU = [
      "Austria",
      "Belgium",
      "Bulgaria",
      "Croatia",
      "Cyprus",
      "Czechia",
      "Czech Republic",
      "Denmark",
      "Estonia",
      "Finland",
      "France",
      "Germany",
      "Greece",
      "Hungary",
      "Ireland",
      "Italy",
      "Latvia",
      "Lithuania",
      "Luxembourg",
      "Malta",
      "Netherlands",
      "Poland",
      "Portugal",
      "Romania",
      "Slovakia",
      "Slovenia",
      "Spain",
      "Sweden",
    ];
    const COMPLIANT = new Set(
      [].concat(EU, [
        "United Kingdom",
        "United States of America",
        "United States",
        "Canada",
        "Brazil",
      ]),
    );
    const nm = (f) =>
      (f && f.properties && (f.properties.name || f.properties.NAME || f.properties.admin)) || "";
    this._isCompliant = (f) => COMPLIANT.has(nm(f));
    const accFill = "rgba(" + (this._accentRgb || "19,111,232") + ",0.2)";
    const outline = "rgba(11,46,102,0.45)";
    const borderPaths = [];
    countries.forEach((f) => {
      const g = f.geometry;
      if (!g) return;
      const polys =
        g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
      polys.forEach((poly) =>
        poly.forEach((ring) => {
          borderPaths.push(ring.map((c) => [c[1], c[0]]));
        }),
      );
    });

    const Globe = new ThreeGlobe({ animateIn: true })
      .showGlobe(true)
      .showAtmosphere(this.root.classList.contains("cy-light"))
      .atmosphereColor("#4A8AF5")
      .atmosphereAltitude(0.09)
      .hexPolygonsData(countries.filter((f) => COMPLIANT.has(nm(f))))
      .hexPolygonResolution(4)
      .hexPolygonMargin(0.45)
      .hexPolygonAltitude(0.006)
      .hexPolygonColor(() => "rgba(" + (this._accentRgb || "19,111,232") + ",0.55)")
      .pathsData(borderPaths)
      .pathPointLat((p) => p[0])
      .pathPointLng((p) => p[1])
      .pathPointAlt(() => 0.007)
      .pathColor(() => outline)
      .pathStroke(0.8)
      .pathTransitionDuration(0)
      .arcsData([])
      .labelsData(markers)
      .labelLat("lat")
      .labelLng("lon")
      .labelText(() => "")
      .labelSize(1.65)
      .labelDotRadius(0.45)
      .labelColor(() => "rgba(13,71,161,0.95)")
      .labelResolution(2)
      .labelAltitude(0.02)
      .pointsData(markers)
      .pointLat("lat")
      .pointLng("lon")
      .pointColor(() => "rgba(158,197,254,0.98)")
      .pointAltitude(0.02)
      .pointRadius(0.55)
      .ringsData(markers)
      .ringLat("lat")
      .ringLng("lon")
      .ringColor(() => (t) => "rgba(158,197,254," + (0.6 * (1 - t)).toFixed(3) + ")")
      .ringAltitude(0.021)
      .ringMaxRadius(3.2)
      .ringPropagationSpeed(1.1)
      .ringRepeatPeriod(1500);
    try {
      const mat = Globe.globeMaterial();
      mat.color = new THREE.Color("#000000");
      mat.emissive = new THREE.Color("#000000");
      mat.emissiveIntensity = 0.4;
      mat.shininess = 0.2;
      mat.specular = new THREE.Color("#000000");
      mat.transparent = false;
      mat.opacity = 1;
      mat.colorWrite = true;
      mat.depthWrite = true;
    } catch (e) {}
    Globe.renderOrder = 0;
    this._Globe = Globe;

    const w = mount.clientWidth || 560,
      h = mount.clientHeight || 560;
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(3, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(Globe);
    scene.add(new THREE.AmbientLight(0xffffff, 3.4));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(1, 1, 1);
    scene.add(dir);
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000);
    camera.position.set(0, 20, 367);
    camera.lookAt(0, 0, 0);
    Globe.rotation.set(0.72, 1.52, -0.3);
    this._three = { renderer, scene, camera };

    // circumference rim — 1px hairline ring sized to the sphere's screen silhouette
    const rim = document.createElement("div");
    rim.setAttribute("aria-hidden", "true");
    rim.setAttribute("data-globe-rim", "1");
    rim.style.cssText =
      "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:1.4px solid rgba(11,46,102,0.35);border-radius:50%;pointer-events:none;opacity:0;transition:opacity 1.4s ease 1.6s";
    mount.appendChild(rim);
    this._globeRim = rim;
    const sizeRim = (hh) => {
      const dCam = Math.hypot(20, 367);
      const rpx =
        ((hh / 2) * Math.tan(Math.asin(100 / dCam))) / Math.tan(((50 / 2) * Math.PI) / 180);
      rim.style.width = rim.style.height = (rpx * 2).toFixed(1) + "px";
    };
    sizeRim(h);
    requestAnimationFrame(() => {
      rim.style.opacity = "1";
    });

    this._sizeGlobe = () => {
      if (!this._globeMount) return;
      const ww = this._globeMount.clientWidth || 560,
        hh = this._globeMount.clientHeight || 560;
      renderer.setSize(ww, hh);
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
      sizeRim(hh);
    };
    window.addEventListener("resize", this._sizeGlobe);

    const loop = () => {
      this._globeRaf = requestAnimationFrame(loop);
      const mr = mount.getBoundingClientRect();
      if (mr.bottom < -60 || mr.top > window.innerHeight + 60) return; // skip GPU work while off-screen
      // two fluid views: [0] Europe (UK + GDPR), [1] the Americas (CCPA + PIPEDA + LGPD); hovering a tag takes over
      const views = this._tourViews || (this._tourViews = [5, -72]);
      const nowT = performance.now();
      if (this._tourI == null) {
        this._tourI = 0;
        this._tourArriveT = 0;
      }
      const held = this._tourHold; // region locked by tag hover
      const targetLon = held != null ? this.regionLon(held) : views[this._tourI];
      const targetRy = (-targetLon * Math.PI) / 180;
      if (this._globeRy == null) this._globeRy = targetRy;
      // commit an absolute target once per swing; tour swings take the LONG way around
      const swingKey = held != null ? "h" + held : "v" + this._tourI;
      if (this._swingKey !== swingKey) {
        this._swingKey = swingKey;
        // always advance in ONE direction — wrap the delta to [0, 2π) so the globe never reverses
        let d = (((targetRy - this._globeRy) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (d < 0.001) d = 2 * Math.PI; // already there → full turn rather than a dead swing
        this._swingFrom = this._globeRy;
        this._globeTargetRy = this._globeRy + d;
        this._swingT0 = nowT;
        this._swingDur = held != null ? 900 : 4500; // both view swings take a fixed 4.5s
      }
      // fixed-duration eased travel (easeInOutSine — gentle tails, motion spread across the full time)
      const p = Math.min(1, (nowT - this._swingT0) / this._swingDur);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * p);
      this._globeRy = this._swingFrom + (this._globeTargetRy - this._swingFrom) * e;
      if (held != null) {
        this._tourArriveT = 0; // paused while a tag is hovered
      } else if (p >= 1) {
        if (!this._tourArriveT) this._tourArriveT = nowT; // arrived → begin dwell
        if (nowT - this._tourArriveT > 2200) {
          // dwell finished → swing to the other view
          this._tourArriveT = 0;
          this._tourI = (this._tourI + 1) % views.length;
        }
      }
      // intro: spin into place on first load (rides on top of the built-in zoom-in)
      if (!this._globeIntroT0) this._globeIntroT0 = performance.now();
      const ip = Math.min(1, (performance.now() - this._globeIntroT0) / 2400);
      const ie = 1 - (1 - ip) ** 3;
      Globe.rotation.set(0.72, this._globeRy + (1 - ie) * 2.4, 0);
      renderer.render(scene, camera);
      this.projectGlobeMarkers();
    };
    loop();
  }

  applyGlobeAccent() {
    if (!this._Globe) return;
    const acc = this.accentCss();
    this._Globe.arcColor(() => acc);
    this._Globe.hexPolygonColor(() => "rgba(" + (this._accentRgb || "19,111,232") + ",0.55)");
  }

  ensureFlagEls() {
    if (this._flagEls) return this._flagEls;
    const star = (cx, cy) =>
      '<circle cx="' +
      cx.toFixed(2) +
      '" cy="' +
      cy.toFixed(2) +
      '" r="0.62" fill="#FFCC00"></circle>';
    let euStars = "";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      euStars += star(10.5 + Math.cos(a) * 4.1, 7 + Math.sin(a) * 4.1);
    }
    const W = "21",
      H = "14";
    const svg = (inner) =>
      '<svg viewBox="0 0 21 14" style="display:block;width:100%;height:100%">' + inner + "</svg>";
    let usStripes = '<rect width="21" height="14" fill="#FFFFFF"></rect>';
    for (let i = 0; i < 13; i += 2)
      usStripes +=
        '<rect y="' +
        ((i * 14) / 13).toFixed(2) +
        '" width="21" height="' +
        (14 / 13).toFixed(2) +
        '" fill="#B22234"></rect>';
    usStripes += '<rect width="9" height="7.54" fill="#3C3B6E"></rect>';
    const flags = {
      EU: svg('<rect width="21" height="14" fill="#003399"></rect>' + euStars),
      UK: svg(
        '<rect width="21" height="14" fill="#012169"></rect><path d="M0 0 L21 14 M21 0 L0 14" stroke="#FFFFFF" stroke-width="2.6"></path><path d="M0 0 L21 14 M21 0 L0 14" stroke="#C8102E" stroke-width="1.1"></path><path d="M10.5 0 V14 M0 7 H21" stroke="#FFFFFF" stroke-width="4"></path><path d="M10.5 0 V14 M0 7 H21" stroke="#C8102E" stroke-width="2.2"></path>',
      ),
      California: svg(usStripes),
      Brazil: svg(
        '<rect width="21" height="14" fill="#009B3A"></rect><path d="M10.5 1.6 L19.2 7 L10.5 12.4 L1.8 7 Z" fill="#FEDF00"></path><circle cx="10.5" cy="7" r="3" fill="#002776"></circle>',
      ),
      Canada: svg(
        '<rect width="21" height="14" fill="#FFFFFF"></rect><rect width="5.2" height="14" fill="#D80621"></rect><rect x="15.8" width="5.2" height="14" fill="#D80621"></rect><path fill="#D80621" d="M10.5 3.2 L11.2 4.7 L12.5 4.2 L12.2 5.6 L13.6 5.9 L12.6 6.9 L13.4 8 L11.9 7.9 L11.7 9.4 L10.5 8.4 L9.3 9.4 L9.1 7.9 L7.6 8 L8.4 6.9 L7.4 5.9 L8.8 5.6 L8.5 4.2 L9.8 4.7 Z"></path>',
      ),
    };
    const laws = {};
    this.globeMarkers().forEach((m) => {
      laws[m.region] = m.law;
    });
    this._flagEls = {};
    for (const k in flags) {
      const d = document.createElement("div");
      d.setAttribute("data-globe-flag", "1");
      d.style.cssText =
        "position:absolute;left:0;top:0;z-index:2;pointer-events:none;cursor:default;display:flex;flex-direction:row;gap:var(--cy-space-8);align-items:center;transform:translate(-50%,-140%);opacity:0;transition:opacity 0.25s ease, transform 0.2s ease;background:#DCE0E6;border:1px solid rgba(20,20,42,0.16);border-radius:9px;padding:var(--cy-space-4) var(--cy-space-12) var(--cy-space-4) var(--cy-space-8);filter:drop-shadow(0 3px 10px rgba(0,0,0,0.22))";
      const f = document.createElement("span");
      f.innerHTML = flags[k];
      f.style.cssText =
        "display:block;width:27px;height:18px;border-radius:3px;overflow:hidden;flex-shrink:0";
      const t = document.createElement("span");
      t.textContent = laws[k] || "";
      t.style.cssText =
        "display:inline-block;font-family:Geist,Inter,sans-serif;font-size:13.5px;font-weight:600;line-height:17px;letter-spacing:-0.1px;color:#1B1F24;white-space:nowrap";
      d.appendChild(f);
      d.appendChild(t);
      d._detail = t;
      (this._globeMount || document.body).appendChild(d);
      this._flagEls[k] = d;
    }
    return this._flagEls;
  }

  projectGlobeMarkers() {
    const mount = this._globeMount,
      three = this._three,
      THREE = this._THREE,
      Globe = this._Globe;
    if (!mount || !three || !THREE || !Globe) return;
    const rect = mount.getBoundingClientRect();
    const cam = three.camera;
    const hit = [];
    for (const m of this.globeMarkers()) {
      const co = Globe.getCoords(m.lat, m.lon, 0.02);
      const world = new THREE.Vector3(co.x, co.y, co.z).applyMatrix4(Globe.matrixWorld);
      const normal = world.clone().normalize();
      const toCam = cam.position.clone().sub(world).normalize();
      const facing = normal.dot(toCam);
      const front = facing > 0.02;
      const ndc = world.clone().project(cam);
      const lx = (ndc.x * 0.5 + 0.5) * rect.width;
      const ly = (-ndc.y * 0.5 + 0.5) * rect.height;
      hit.push({
        region: m.region,
        law: m.law,
        sx: rect.left + lx,
        sy: rect.top + ly,
        lx: lx,
        ly: ly,
        vis: front,
        facing: facing,
      });
    }
    this._globeHit = hit;
    const fl = this.ensureFlagEls();
    for (const h of hit) {
      const el = fl[h.region];
      if (!el) continue;
      el.style.left = h.lx.toFixed(1) + "px";
      el.style.top = h.ly.toFixed(1) + "px";
      // only the tags belonging to the view the globe currently faces are visible;
      // they fade out as the globe swings away and the other group fades in on arrival
      const views = this._tourViews || [5, -72];
      const groupLon = h.region === "EU" || h.region === "UK" ? views[0] : views[1];
      const curLon = (-(this._globeRy || 0) * 180) / Math.PI;
      const dd = Math.abs(((((curLon - groupLon) % 360) + 540) % 360) - 180); // 0..180 from the group's view center
      const grpOp = dd <= 32 ? 1 : dd >= 68 ? 0 : (68 - dd) / 36;
      const hov = this._tourHold === h.region;
      const op = hov ? 1 : grpOp * (h.vis ? 1 : 0);
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = h.vis ? "3" : "1";
      el.style.pointerEvents = "none";
    }
  }

  drawArcs(phi, theta) {
    const c = this._globeArcEl;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = c.clientWidth,
      cssH = c.clientHeight;
    if (c.width !== Math.round(cssW * dpr)) {
      c.width = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
    }
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const R = (cssW / 2) * 0.9,
      cx = cssW / 2,
      cy = cssH / 2;
    const cosT = Math.cos(theta),
      sinT = Math.sin(theta);
    const acc = this._accentRgb || "19,111,232";
    if (!this._arcT0) this._arcT0 = performance.now();
    const t = (performance.now() - this._arcT0) / 1000;
    const markers = this.globeMarkers();
    const home = markers[0];
    const toV = (o) => {
      const la = (o.lat * Math.PI) / 180,
        lo = (o.lon * Math.PI) / 180;
      return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    };
    const slerp = (a, b, f) => {
      const va = toV(a),
        vb = toV(b);
      let d = va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
      d = Math.max(-1, Math.min(1, d));
      const om = Math.acos(d),
        so = Math.sin(om) || 1e-6;
      const s1 = Math.sin((1 - f) * om) / so,
        s2 = Math.sin(f * om) / so;
      const v = [va[0] * s1 + vb[0] * s2, va[1] * s1 + vb[1] * s2, va[2] * s1 + vb[2] * s2];
      return {
        lat: (Math.asin(v[2]) * 180) / Math.PI,
        lon: (Math.atan2(v[1], v[0]) * 180) / Math.PI,
      };
    };
    const proj = (lat, lon, rf) => {
      const la = (lat * Math.PI) / 180,
        lo = (lon * Math.PI) / 180 + phi;
      const x = Math.cos(la) * Math.sin(lo),
        y0 = Math.sin(la),
        z0 = Math.cos(la) * Math.cos(lo);
      const y = y0 * cosT + z0 * sinT,
        z = -y0 * sinT + z0 * cosT;
      return { sx: cx + x * R * rf, sy: cy - y * R * rf, z: z };
    };
    const arcH = 0.34,
      N = 72,
      dur = 2.6,
      gap = 1.4;
    markers.forEach((m, i) => {
      if (i === 0) return;
      const start = (i - 1) * 0.45;
      const cyc = (t - start) % (dur + gap);
      if (cyc < 0) return;
      const prog = Math.max(0, Math.min(1, cyc / dur));
      if (prog <= 0) return;
      // fade the whole arc out during the gap after it completes
      const fade = cyc > dur ? Math.max(0, 1 - (cyc - dur) / gap) : 1;
      ctx.beginPath();
      let started = false;
      for (let k = 0; k <= N; k++) {
        const s = k / N;
        if (s > prog) break;
        const q = slerp(home, m, s);
        const rf = 1 + arcH * Math.sin(Math.PI * s);
        const p = proj(q.lat, q.lon, rf);
        const base = proj(q.lat, q.lon, 1);
        if (base.z > -0.05) {
          if (!started) {
            ctx.moveTo(p.sx, p.sy);
            started = true;
          } else ctx.lineTo(p.sx, p.sy);
        } else started = false;
      }
      ctx.strokeStyle = "rgba(" + acc + "," + (0.85 * fade).toFixed(3) + ")";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // traveling head dot while drawing
      if (prog < 1) {
        const q = slerp(home, m, prog);
        const rf = 1 + arcH * Math.sin(Math.PI * prog);
        const p = proj(q.lat, q.lon, rf);
        const base = proj(q.lat, q.lon, 1);
        if (base.z > -0.05) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + acc + "," + fade.toFixed(3) + ")";
          ctx.fill();
        }
      }
    });
    // markers drawn on the same overlay so they always match the arcs
    markers.forEach((m, i) => {
      const p = proj(m.lat, m.lon, 1);
      if (p.z <= 0.02) return;
      const pulse = (Math.sin(t * 2.2 + i) + 1) / 2;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 4 + pulse * 7, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + acc + "," + (0.45 * (1 - pulse)).toFixed(3) + ")";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + acc + ",1)";
      ctx.fill();
    });
  }

  globeData() {
    if (this._globe) return this._globe;
    // Simplified continent outlines as [lon,lat] polygons (rough, for recognizability)
    const conts = [
      [
        [-168, 65],
        [-155, 71],
        [-135, 70],
        [-110, 72],
        [-92, 73],
        [-80, 68],
        [-62, 60],
        [-55, 52],
        [-66, 45],
        [-72, 41],
        [-76, 35],
        [-81, 25],
        [-97, 18],
        [-105, 22],
        [-115, 29],
        [-125, 40],
        [-125, 48],
        [-137, 58],
        [-152, 60],
        [-168, 65],
      ],
      [
        [-80, 9],
        [-70, 11],
        [-60, 5],
        [-50, 0],
        [-42, -5],
        [-35, -8],
        [-40, -20],
        [-48, -25],
        [-58, -35],
        [-66, -42],
        [-71, -50],
        [-73, -52],
        [-73, -44],
        [-70, -30],
        [-70, -18],
        [-78, -6],
        [-81, 2],
        [-80, 9],
      ],
      [
        [-10, 44],
        [-9, 52],
        [-5, 58],
        [6, 60],
        [14, 55],
        [22, 56],
        [30, 59],
        [41, 60],
        [40, 50],
        [30, 45],
        [20, 40],
        [8, 38],
        [-6, 36],
        [-10, 44],
      ],
      [
        [-16, 15],
        [-10, 30],
        [10, 34],
        [25, 32],
        [36, 30],
        [50, 12],
        [42, -4],
        [40, -15],
        [30, -32],
        [20, -35],
        [13, -28],
        [9, -3],
        [-6, 5],
        [-16, 15],
      ],
      [
        [42, 60],
        [62, 66],
        [92, 70],
        [122, 72],
        [142, 70],
        [162, 68],
        [178, 66],
        [168, 58],
        [145, 45],
        [135, 35],
        [122, 30],
        [120, 22],
        [105, 10],
        [95, 8],
        [80, 9],
        [68, 22],
        [54, 26],
        [45, 38],
        [42, 50],
        [42, 60],
      ],
      [
        [113, -22],
        [130, -12],
        [142, -11],
        [150, -25],
        [153, -32],
        [145, -38],
        [135, -35],
        [120, -34],
        [114, -30],
        [113, -22],
      ],
    ];
    const inPoly = (lon, lat, poly) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0],
          yi = poly[i][1],
          xj = poly[j][0],
          yj = poly[j][1];
        if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
          inside = !inside;
      }
      return inside;
    };
    const dots = [];
    for (let lat = -78; lat <= 82; lat += 4) {
      for (let lon = -180; lon <= 180; lon += 4) {
        for (const c of conts) {
          if (inPoly(lon, lat, c)) {
            dots.push([lon, lat]);
            break;
          }
        }
      }
    }
    const pins = [
      { region: "EU", law: "GDPR", lat: 50, lon: 10, home: true },
      { region: "UK", law: "UK GDPR", lat: 54, lon: -2 },
      { region: "California", law: "CCPA / CPRA", lat: 37, lon: -119 },
      { region: "Brazil", law: "LGPD", lat: -2, lon: -66 },
      { region: "Canada", law: "PIPEDA", lat: 58, lon: -100 },
    ];
    this._globe = { dots, pins };
    return this._globe;
  }

  drawGlobe(t) {
    const c = this._globeEl;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(c.clientWidth * dpr)) {
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
    }
    const ctx = c.getContext("2d");
    const W = c.clientWidth,
      Hh = c.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);
    const cx = W / 2,
      cy = Hh / 2,
      R = Math.min(W, Hh) * 0.42;
    // eased parallax
    this._globePx = (this._globePx || 0) + ((this._globeTx || 0) - (this._globePx || 0)) * 0.05;
    this._globePy = (this._globePy || 0) + ((this._globeTy || 0) - (this._globePy || 0)) * 0.05;
    const spin = t * 8 + this._globePx * 22; // slow drift + gentle horizontal parallax
    const tilt = ((-18 + this._globePy * 10) * Math.PI) / 180;
    const cosT = Math.cos(tilt),
      sinT = Math.sin(tilt);
    const acc = this._accentRgb || "19,111,232";
    const accB = this._accentBrightRgb || "150,190,255";
    const project = (lat, lon) => {
      const la = (lat * Math.PI) / 180,
        lo = ((lon + spin) * Math.PI) / 180;
      const x = Math.cos(la) * Math.sin(lo);
      const y0 = Math.sin(la);
      const z0 = Math.cos(la) * Math.cos(lo);
      const y = y0 * cosT - z0 * sinT;
      const z = y0 * sinT + z0 * cosT;
      return { sx: cx + x * R, sy: cy - y * R, z };
    };
    // sphere fill (very faint)
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(148,150,158,0.03)";
    ctx.fill();
    // circumference rim — crisp 1px hairline, slightly brighter than the wireframe
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(148,150,158,0.38)";
    ctx.stroke();
    // (fallback canvas globe — not used when the THREE globe is active)
    // graticule — latitude rings
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 4) {
        const p = project(lat, lon);
        if (p.z > 0) {
          if (!started) {
            ctx.moveTo(p.sx, p.sy);
            started = true;
          } else ctx.lineTo(p.sx, p.sy);
        } else started = false;
      }
      ctx.strokeStyle = "rgba(148,150,158,0.16)";
      ctx.stroke();
    }
    // graticule — longitude meridians
    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath();
      let started = false;
      for (let lat = -90; lat <= 90; lat += 4) {
        const p = project(lat, lon);
        if (p.z > 0) {
          if (!started) {
            ctx.moveTo(p.sx, p.sy);
            started = true;
          } else ctx.lineTo(p.sx, p.sy);
        } else started = false;
      }
      ctx.strokeStyle = "rgba(148,150,158,0.13)";
      ctx.stroke();
    }
    // outline
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(148,150,158,0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // continent dots
    const g = this.globeData();
    for (const d of g.dots) {
      const p = project(d[1], d[0]);
      if (p.z <= 0.02) continue;
      const a = 0.18 + p.z * 0.4;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 1.05, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(150,152,160," + a.toFixed(3) + ")";
      ctx.fill();
    }
    const rect = c.getBoundingClientRect();
    const toClient = (p) => ({
      x: rect.left + p.sx * (rect.width / W),
      y: rect.top + p.sy * (rect.height / Hh),
    });
    // arcs from home (EU) to each region
    const home = g.pins.find((p) => p.home);
    const slerp = (a, b, f) => {
      const toV = (o) => {
        const la = (o.lat * Math.PI) / 180,
          lo = (o.lon * Math.PI) / 180;
        return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
      };
      const va = toV(a),
        vb = toV(b);
      let dot = va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
      dot = Math.max(-1, Math.min(1, dot));
      const om = Math.acos(dot),
        so = Math.sin(om) || 1e-6;
      const s1 = Math.sin((1 - f) * om) / so,
        s2 = Math.sin(f * om) / so;
      const v = [va[0] * s1 + vb[0] * s2, va[1] * s1 + vb[1] * s2, va[2] * s1 + vb[2] * s2];
      const lat = (Math.asin(v[2]) * 180) / Math.PI,
        lon = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
      return { lat, lon };
    };
    const appear = Math.min(1, t / 1.2);
    g.pins.forEach((pin, i) => {
      if (pin.home) return;
      const prog = Math.max(0, Math.min(1, (t - 0.6 - i * 0.35) / 0.9));
      if (prog <= 0) return;
      ctx.beginPath();
      let started = false;
      for (let s = 0; s <= 1.0001; s += 0.02) {
        if (s > prog) break;
        const q = slerp(home, pin, s);
        const p = project(q.lat, q.lon);
        if (p.z > 0) {
          if (!started) {
            ctx.moveTo(p.sx, p.sy);
            started = true;
          } else ctx.lineTo(p.sx, p.sy);
        } else started = false;
      }
      ctx.strokeStyle = "rgba(" + acc + ",0.55)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });
    // pins
    const hit = [];
    g.pins.forEach((pin, i) => {
      const p = project(pin.lat, pin.lon);
      const vis = p.z > 0.05;
      const dropT = pin.home ? 0 : Math.max(0, Math.min(1, (t - 0.4 - i * 0.35) / 0.5));
      const sc = pin.home ? Math.min(1, t / 0.6) : dropT;
      if (vis && sc > 0) {
        const pulse = (Math.sin(t * 2.4 + i) + 1) / 2;
        const ringR = (5 + pulse * 9) * sc;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + acc + "," + (0.5 * (1 - pulse) * p.z).toFixed(3) + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 3.2 * sc, 0, Math.PI * 2);
        ctx.fillStyle = "rgb(" + accB + ")";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 3.2 * sc, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + acc + ",0.9)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      const cl = toClient(p);
      hit.push({ region: pin.region, law: pin.law, sx: cl.x, sy: cl.y, vis: vis && sc > 0.9 });
    });
    this._globeHit = hit;
    void appear;
  }

  cyReduce() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  cyVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  startAcCycle() {
    if (this._acIv) clearInterval(this._acIv);
    let i = 1;
    const members = ["analytics", "marketing", "functional"];
    const step = (force) => {
      const panel = document.querySelector("[data-ac-panel]");
      if (!panel || (!force && !this.cyVisible(panel))) return;
      const line = document.querySelector("[data-ac-line]");
      if (line) line.textContent = members[i];
      [0, 1, 2].forEach((k) => {
        const row = panel.querySelector('[data-ac-row="' + k + '"]');
        if (row) row.style.background = k === i ? "var(--cy-row-hl)" : "transparent";
      });
      i = (i + 1) % members.length;
    };
    this._acRetrigger = () => {
      const panel = document.querySelector("[data-ac-panel]");
      if (!panel) return;
      panel.style.transitionDuration = "0.15s";
      panel.style.opacity = "0";
      panel.style.transform = "translateY(4px)";
      setTimeout(() => {
        step(true);
        panel.style.transitionDuration = "0.25s";
        panel.style.opacity = "1";
        panel.style.transform = "translateY(0)";
      }, 170);
    };
    this._acAdv = () => step(true);
  }

  startThemeCycle() {
    const grad = (bg) =>
      "linear-gradient(150deg, rgba(var(--cy-fg-rgb),0.05) 0%, rgba(var(--cy-fg-rgb),0.01) 45%), " +
      bg;
    const bgs = ["#FFFFFF", "#F6F3EE", "#EDF5EE"];
    const accs = [
      { v: "#136FE8", rgb: "19,111,232" },
      { v: "#1F8A5B", rgb: "31,138,91" },
      { v: "#8250DF", rgb: "130,80,223" },
    ];
    this._cssSt = { radius: 12, bg: 0, acc: 0 };
    let pi = 1;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    const clearAll = () => {
      if (this._cssT) this._cssT.forEach(clearTimeout);
      this._cssT = [];
      if (this._cssRaf) cancelAnimationFrame(this._cssRaf);
    };
    this._themeAdv = () => {
      const root = document.querySelector("[data-css]");
      if (!root) return;
      clearAll();
      const nameEl = root.querySelector("[data-css-prop]");
      const valEl = root.querySelector("[data-css-val]");
      const panel = root.querySelector("[data-css-panel]");
      const btn = root.querySelector("[data-css-btn]");
      const btn2 = root.querySelector("[data-css-btn2]");
      if (!nameEl || !valEl || !panel || !btn) return;
      const which = pi;
      pi = (pi + 1) % 3;
      const prop = ["--cy-radius", "--cy-bg", "--cy-accent"][which];
      valEl.style.borderRadius = "2px";
      valEl.style.padding = "0 2px";
      valEl.style.background = "rgba(var(--cy-accent-rgb),0.18)";
      nameEl.style.opacity = "0";
      this._cssT.push(
        setTimeout(() => {
          nameEl.textContent = prop;
          nameEl.style.opacity = "1";
          if (which === 0) valEl.textContent = Math.round(this._cssSt.radius) + "px";
          else if (which === 1) valEl.textContent = bgs[this._cssSt.bg];
          else valEl.textContent = accs[this._cssSt.acc].v;
        }, 220),
      );
      const applyRadius = (v) => {
        const r = Math.round(v);
        panel.style.borderRadius = r + "px";
        const br = Math.max(2, Math.round(v * 0.55)) + "px";
        btn.style.borderRadius = br;
        if (btn2) btn2.style.borderRadius = br;
      };
      if (which === 0) {
        const targets = this._cssSt.radius < 10 ? [24, 4, 12] : [2, 24, 8];
        const seq = (k) => {
          if (k >= targets.length) {
            this._cssT.push(
              setTimeout(() => {
                valEl.style.background = "transparent";
              }, 500),
            );
            return;
          }
          this._cssT.push(
            setTimeout(
              () => {
                const from = this._cssSt.radius,
                  to = targets[k],
                  t0 = performance.now(),
                  dur = 560;
                const fr = (now) => {
                  const t = Math.min(1, (now - t0) / dur);
                  const v = from + (to - from) * ease(t);
                  this._cssSt.radius = v;
                  valEl.textContent = Math.round(v) + "px";
                  applyRadius(v);
                  if (t < 1) this._cssRaf = requestAnimationFrame(fr);
                  else seq(k + 1);
                };
                this._cssRaf = requestAnimationFrame(fr);
              },
              k === 0 ? 560 : 420,
            ),
          );
        };
        seq(0);
      } else if (which === 1) {
        const b0 = this._cssSt.bg;
        [(b0 + 1) % 3, (b0 + 2) % 3].forEach((b, k, arr) => {
          this._cssT.push(
            setTimeout(
              () => {
                this._cssSt.bg = b;
                valEl.textContent = bgs[b];
                panel.style.background = grad(bgs[b]);
                if (k === arr.length - 1)
                  this._cssT.push(
                    setTimeout(() => {
                      valEl.style.background = "transparent";
                    }, 800),
                  );
              },
              620 + k * 950,
            ),
          );
        });
      } else {
        const a0 = this._cssSt.acc;
        [(a0 + 1) % 3, (a0 + 2) % 3].forEach((a, k, arr) => {
          this._cssT.push(
            setTimeout(
              () => {
                this._cssSt.acc = a;
                const ac = accs[a];
                valEl.textContent = ac.v;
                btn.style.transition =
                  "background 0.8s ease, box-shadow 0.8s ease, border-radius 0.3s ease";
                btn.style.background = ac.v;
                btn.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.3)";
                if (k === arr.length - 1)
                  this._cssT.push(
                    setTimeout(() => {
                      valEl.style.background = "transparent";
                    }, 800),
                  );
              },
              620 + k * 950,
            ),
          );
        });
      }
    };
  }

  startBannerCycle() {
    if (this._jbIv) clearInterval(this._jbIv);
    const states = [
      {
        title: "We value your privacy",
        region: "eu",
        two: true,
        a: "Accept all",
        b: "Reject all",
        link: "Manage preferences",
      },
      {
        title: "Your privacy choices",
        region: "us",
        two: false,
        a: "OK",
        b: "",
        link: "Do Not Sell or Share My Personal Information",
      },
      {
        title: "N\u00F3s valorizamos sua privacidade",
        region: "br",
        two: true,
        a: "Aceitar todos",
        b: "Recusar",
        link: "Gerenciar prefer\u00EAncias",
      },
    ];
    let idx = 1;
    const apply = (k) => {
      const root = document.querySelector("[data-st]");
      if (!root) return;
      const st = states[k];
      [0, 1, 2].forEach((s) => {
        const el = root.querySelector('[data-st-stamp="' + s + '"]');
        if (!el) return;
        const glow = el.querySelector("[data-st-glow]");
        if (s === k) {
          el.style.color = "var(--cy-accent)";
          if (glow) glow.style.opacity = "1";
          try {
            el.animate(
              [{ transform: "scale(1)" }, { transform: "scale(0.9)" }, { transform: "scale(1)" }],
              { duration: 240, easing: "ease-out" },
            );
          } catch (e) {}
        } else {
          el.style.color = "var(--cy-faint)";
          if (glow) glow.style.opacity = "0";
        }
      });
      const ripple = root.querySelector("[data-st-ripple]");
      if (ripple) {
        ripple.style.animation = "none";
        void ripple.offsetWidth;
        ripple.style.animation = "cyRipple 0.7s ease-out";
      }
      const swap = (sel, v) => {
        const el = root.querySelector(sel);
        if (!el) return;
        el.style.opacity = "0";
        setTimeout(() => {
          el.textContent = v;
          el.style.opacity = "1";
        }, 240);
      };
      swap("[data-st-title]", st.title);
      swap("[data-st-link]", st.link);
      const a = root.querySelector("[data-st-a]");
      if (a) {
        a.style.transition = a.style.transition || "opacity 0.25s ease";
        a.style.opacity = "0";
        setTimeout(() => {
          a.textContent = st.a;
          a.style.opacity = "1";
        }, 240);
      }
      const b = root.querySelector("[data-st-b]");
      if (b) {
        if (st.two)
          setTimeout(() => {
            b.textContent = st.b;
          }, 240);
        b.style.flexBasis = st.two ? "0%" : "0px";
        b.style.flexGrow = st.two ? "1" : "0";
        b.style.opacity = st.two ? "1" : "0";
        b.style.marginLeft = st.two ? "0" : "-7px";
        b.style.borderWidth = st.two ? "1px" : "0";
      }
    };
    this._stampAdv = () => {
      apply(idx);
      idx = (idx + 1) % states.length;
    };
  }

  startGeoCycle() {
    const regions = [
      { r: "eu", law: "gdpr", lat: 50, lon: 10 },
      { r: "us", law: "ccpa", lat: 39, lon: -98 },
      { r: "br", law: "lgpd", lat: -10, lon: -52 },
    ];
    let idx = 0;
    this._geoRot = -10;
    const draw = (rot, pin) => {
      const cv = document.querySelector("[data-geo-cv]");
      if (!cv) return;
      const dpr = 2,
        W = 300,
        H = 292;
      if (cv.width !== W * dpr || cv.height !== H * dpr) {
        cv.width = W * dpr;
        cv.height = H * dpr;
      }
      const ctx = cv.getContext("2d");
      const isLight = cv.closest("[data-bento]")
        ? true
        : cv.closest(".cy-band-dark")
          ? false
          : cv.closest(".cy-band-light")
            ? true
            : this.root.classList.contains("cy-light");
      const dotInk = isLight ? "19,111,232" : "125,190,248";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const cx = 116,
        cy = 176,
        R = 110,
        tilt = -0.12;
      const proj = (lat, lon) => {
        const la = (lat * Math.PI) / 180,
          lo = ((lon + rot) * Math.PI) / 180;
        const x = Math.cos(la) * Math.sin(lo);
        const z = Math.cos(la) * Math.cos(lo);
        const y = Math.sin(la);
        const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
        const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
        return { sx: cx + R * x, sy: cy - R * y2, z: z2 };
      };
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      const gr = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.42, R * 0.1, cx, cy, R);
      if (isLight) {
        gr.addColorStop(0, "rgba(255,255,255,0.32)");
        gr.addColorStop(0.45, "rgba(255,255,255,0.06)");
        gr.addColorStop(1, "rgba(20,20,42,0.07)");
      } else {
        gr.addColorStop(0, "rgba(236,237,239,0.05)");
        gr.addColorStop(1, "rgba(0,0,0,0.35)");
      }
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.strokeStyle = isLight ? "rgba(19,111,232,0.28)" : "rgba(125,190,248,0.32)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const g = this.globeData();
      let pinVis = 0,
        accD = "19,111,232";
      if (pin) {
        const f = Math.cos(((pin.lon + rot) * Math.PI) / 180);
        pinVis = Math.max(0, Math.min(1, (f - 0.7) / 0.2));
        accD =
          (
            getComputedStyle(document.documentElement).getPropertyValue("--cy-accent-rgb") ||
            "19,111,232"
          ).trim() || "19,111,232";
      }
      for (let di = 0; di < g.dots.length; di++) {
        const d = g.dots[di];
        const offs = [
          [0, 0, 1.1],
          [((di % 3) - 1) * 2.2, di % 2 ? 1.4 : -1.4, 0.85],
          [di % 2 ? -1.9 : 1.9, ((di % 3) - 1) * 1.5, 0.8],
        ];
        for (const o of offs) {
          const lat = d[1] + o[1],
            lon = d[0] + o[0];
          const p = proj(lat, lon);
          if (p.z <= 0.02) continue;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, o[2], 0, Math.PI * 2);
          ctx.fillStyle =
            "rgba(" +
            dotInk +
            "," +
            (isLight ? (0.16 + p.z * 0.44).toFixed(3) : (0.14 + p.z * 0.42).toFixed(3)) +
            ")";
          ctx.fill();
        }
      }
      if (pin) {
        const acc =
          (
            getComputedStyle(document.documentElement).getPropertyValue("--cy-accent-rgb") ||
            "19,111,232"
          ).trim() || "19,111,232";
        const p = proj(pin.lat, pin.lon);
        if (p.z > 0) {
          const pf = Math.cos(((pin.lon + rot) * Math.PI) / 180);
          const pv = Math.max(0, Math.min(1, (pf - 0.7) / 0.2));
          if (pv > 0) {
            const t = (performance.now() % 2400) / 2400;
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, 4 + t * 10, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(" + acc + "," + (0.5 * (1 - t) * pv).toFixed(3) + ")";
            ctx.lineWidth = 1.2;
            ctx.stroke();
            const gl = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, 14);
            gl.addColorStop(0, "rgba(" + acc + "," + (0.4 * pv).toFixed(3) + ")");
            gl.addColorStop(1, "rgba(" + acc + ",0)");
            ctx.beginPath();
            ctx.arc(p.sx, p.sy, 14, 0, Math.PI * 2);
            ctx.fillStyle = gl;
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 3.4, 0, Math.PI * 2);
          if (pv > 0) {
            ctx.fillStyle = "rgba(" + acc + "," + (0.35 + 0.65 * pv).toFixed(3) + ")";
          } else {
            ctx.fillStyle = "rgba(125,190,248,0.75)";
          }
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, 3.4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255," + (0.2 + 0.3 * pv).toFixed(3) + ")";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          const facing = Math.cos(((pin.lon + rot) * Math.PI) / 180);
          if (p.z > 0.05 && facing > 0.7) {
            const vis = Math.min(1, (facing - 0.7) / 0.2);
            ctx.font = "600 8.5px 'Geist Mono', ui-monospace, monospace";
            ctx.fillStyle = isLight
              ? "rgba(20,20,42," + (0.85 * vis).toFixed(3) + ")"
              : "rgba(236,237,239," + (0.8 * vis).toFixed(3) + ")";
            ctx.fillText(pin.r, p.sx + 9, p.sy + 3);
            const chipX = 212,
              chipY = 19;
            ctx.beginPath();
            ctx.moveTo(p.sx + 4, p.sy - 4);
            ctx.bezierCurveTo(
              (p.sx + chipX) / 2 + 20,
              p.sy - 30,
              chipX - 40,
              chipY + 26,
              chipX,
              chipY,
            );
            ctx.strokeStyle = "rgba(" + acc + "," + (0.75 * vis).toFixed(3) + ")";
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(chipX, chipY, 2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(" + acc + "," + vis.toFixed(3) + ")";
            ctx.fill();
          }
        }
      }
    };
    const swap = (sel, v) => {
      const root = document.querySelector("[data-geo]");
      if (!root) return;
      const el = root.querySelector(sel);
      if (!el) return;
      el.style.opacity = "0";
      setTimeout(() => {
        el.textContent = v;
        el.style.opacity = "1";
      }, 220);
    };
    const spinTo = (k) => {
      const target = regions[k];
      swap("[data-geo-val]", target.r);
      swap("[data-geo-law]", target.law);
      const from = this._geoRot;
      let to = -target.lon;
      while (to <= from + 1) to += 360;
      const t0 = performance.now(),
        dur = 2100;
      if (this._geoRaf) cancelAnimationFrame(this._geoRaf);
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
      const stepFn = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        this._geoRot = from + (to - from) * ease(t);
        draw(this._geoRot, target);
        if (t < 1) this._geoRaf = requestAnimationFrame(stepFn);
        else {
          this._geoRot = ((((to + 180) % 360) + 360) % 360) - 180;
          const p0 = performance.now();
          const pulse = (n) => {
            draw(this._geoRot, target);
            if (n - p0 < 3600) this._geoRaf = requestAnimationFrame(pulse);
          };
          this._geoRaf = requestAnimationFrame(pulse);
        }
      };
      this._geoRaf = requestAnimationFrame(stepFn);
    };
    this._geoAdv = () => {
      idx = (idx + 1) % regions.length;
      spinTo(idx);
    };
    setTimeout(() => draw(this._geoRot, regions[0]), 80);
  }

  startToggleCycle() {
    if (this._i18nIv) clearInterval(this._i18nIv);
    if (this._i18nTos) this._i18nTos.forEach(clearTimeout);
    this._i18nTos = [];
    const L = [
      {
        chip: "EN",
        label: "English",
        title: "This site uses cookies.",
        body: "Required ones are always on. Analytics and marketing need your yes first.",
        accept: "Accept all",
        reject: "Reject all",
        manage: "Manage preferences",
      },
      {
        chip: "DE",
        label: "Deutsch",
        title: "Diese Website verwendet Cookies.",
        body: "Notwendige sind immer aktiv. Analyse und Marketing erst nach Zustimmung.",
        accept: "Alle akzeptieren",
        reject: "Alle ablehnen",
        manage: "Einstellungen verwalten",
      },
      {
        chip: "FR",
        label: "Fran\u00e7ais",
        title: "Ce site utilise des cookies.",
        body: "Les n\u00e9cessaires sont toujours actifs. Analyse et marketing apr\u00e8s votre accord.",
        accept: "Tout accepter",
        reject: "Tout refuser",
        manage: "G\u00e9rer les pr\u00e9f\u00e9rences",
      },
      {
        chip: "IT",
        label: "Italiano",
        title: "Questo sito utilizza i cookie.",
        body: "I necessari sono sempre attivi. Analisi e marketing solo dopo il consenso.",
        accept: "Accetta tutti",
        reject: "Rifiuta tutti",
        manage: "Gestisci le preferenze",
      },
    ];
    let idx = 1;
    const cur = () => {
      const menu = document.querySelector("[data-i18n-menu]");
      if (!menu) return idx;
      const k = Array.from(menu.children).findIndex((r) => r.style.color === "rgb(121, 184, 255)");
      return k >= 0 ? k : idx;
    };
    const schedule = () => {
      if (this.cyReduce()) return;
      if (this._i18nIv) clearTimeout(this._i18nIv);
      this._i18nIv = setTimeout(() => apply((cur() + 1) % L.length), 2000);
    };
    const apply = (k) => {
      const root = document.querySelector("[data-i18n]");
      if (!root) return;
      const now = Date.now();
      if (now - (this._i18nLast || 0) < 800) {
        schedule();
        return;
      }
      this._i18nLast = now;
      idx = k;
      const t = L[k];
      const menu = root.querySelector("[data-i18n-menu]");
      if (menu)
        Array.from(menu.children).forEach((row, ri) => {
          row.style.background = ri === k ? "rgba(255,255,255,0.1)" : "transparent";
          row.style.color = ri === k ? "#79B8FF" : "rgba(230,234,243,0.6)";
        });
      this._i18nTos.forEach(clearTimeout);
      this._i18nTos = [];
      const els = ["title", "body", "accept", "reject", "manage"]
        .map((n) => {
          const el = root.querySelector("[data-i18n-" + n + "]");
          return el ? [el, t[n]] : null;
        })
        .filter(Boolean);
      els.forEach(([el]) => {
        el.style.opacity = "0";
      });
      this._i18nTos.push(
        setTimeout(() => {
          els.forEach(([el, txt]) => {
            el.textContent = txt;
            el.style.opacity = "1";
          });
        }, 260),
      );
      schedule();
    };
    this._tgAdv = () => apply((cur() + 1) % L.length);
    schedule();
  }

  startGateCycle() {
    if (this._gateIv) clearInterval(this._gateIv);
    const setGate = (open) => {
      const root = document.querySelector("[data-gate]");
      if (!root) return;
      this._gateOpen = open;
      const latch = root.querySelector("[data-gate-latch]");
      if (latch) latch.style.transform = open ? "translateY(-34px)" : "translateY(0px)";
      const mtg = root.querySelector("[data-gate-mtg]");
      if (mtg) {
        mtg.style.background = open
          ? "linear-gradient(165deg, var(--cy-accent), var(--cy-accent-deep) 160%)"
          : "var(--cy-track)";
        mtg.style.borderColor = open ? "rgba(var(--cy-accent-rgb),0.6)" : "var(--cy-border)";
      }
      const mth = root.querySelector("[data-gate-mth]");
      if (mth) mth.style.transform = open ? "translateX(15px)" : "translateX(0)";
      const stat = root.querySelector("[data-gate-status]");
      if (stat) {
        stat.style.opacity = "0";
        setTimeout(() => {
          stat.textContent = open ? "marketing: granted" : "marketing: denied";
          stat.style.opacity = "1";
        }, 200);
      }
      for (let k = 0; k < 6; k++) {
        const ov = root.querySelector('[data-gate-o="' + k + '"]');
        if (ov) {
          if (open) {
            const L = ov.getTotalLength();
            ov.style.transition = "none";
            ov.style.strokeDasharray = L;
            ov.style.strokeDashoffset = L;
            ov.style.opacity = "0.85";
            void ov.getBoundingClientRect();
            ov.style.transition =
              "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1) " +
              (0.15 + k * 0.06).toFixed(2) +
              "s";
            ov.style.strokeDashoffset = "0";
          } else {
            ov.style.transition = "opacity 0.4s ease";
            ov.style.opacity = "0";
          }
        }
        const chip = root.querySelector('[data-gate-chip="' + k + '"]');
        if (chip) {
          chip.style.transitionDelay = open ? (0.3 + k * 0.06).toFixed(2) + "s" : "0s";
          chip.style.opacity = open ? "1" : "0.4";
          chip.style.transform = open ? "translateY(-3px)" : "translateY(0)";
          chip.style.boxShadow = open
            ? "inset 0 1px 0 var(--cy-ill-inset), 0 1px 2px var(--cy-ill-drop-sm), 0 6px 16px var(--cy-ill-drop)"
            : "inset 0 1px 0 var(--cy-ill-inset)";
        }
      }
    };
    this._gateOpen = true;
    this._gateAdv = () => setGate(!this._gateOpen);
    this._gateLayout = () => {
      const root = document.querySelector("[data-gate]");
      if (!root) return;
      const svg = root.querySelector("[data-gate-svg]");
      if (!svg) return;
      const sr = svg.getBoundingClientRect();
      if (sr.width < 20) return;
      svg.setAttribute("viewBox", "0 0 " + sr.width.toFixed(1) + " " + sr.height.toFixed(1));
      const midY = sr.height / 2;
      const gateX = Math.max(40, Math.min(64, sr.width * 0.14));
      const bar = svg.querySelector("[data-gate-bar]");
      if (bar) {
        bar.setAttribute("x1", gateX);
        bar.setAttribute("x2", gateX);
        bar.setAttribute("y1", 14);
        bar.setAttribute("y2", sr.height - 14);
      }
      const latch = svg.querySelector("[data-gate-latch]");
      if (latch) {
        latch.setAttribute("x", gateX - 7);
        latch.setAttribute("y", midY - 17);
      }
      for (let k = 0; k < 6; k++) {
        const chip = root.querySelector('[data-gate-chip="' + k + '"]');
        if (!chip) continue;
        const cr = chip.getBoundingClientRect();
        const y = (cr.top + cr.height / 2 - sr.top).toFixed(1);
        const d =
          "M 0 " +
          midY.toFixed(1) +
          " C " +
          (sr.width * 0.32).toFixed(1) +
          " " +
          midY.toFixed(1) +
          " " +
          (sr.width * 0.5).toFixed(1) +
          " " +
          y +
          " " +
          sr.width.toFixed(1) +
          " " +
          y;
        const b = svg.querySelector('[data-gate-b="' + k + '"]');
        const o = svg.querySelector('[data-gate-o="' + k + '"]');
        if (b) b.setAttribute("d", d);
        if (o) {
          o.setAttribute("d", d);
          if (this._gateOpen) {
            o.style.strokeDasharray = "";
            o.style.strokeDashoffset = "";
          }
        }
      }
    };
    this._gateLayout();
    setTimeout(this._gateLayout, 300);
  }

  panelStyle(i) {
    const on = (this.state.featSel || 0) === i;
    return (
      "position:absolute;left:0;top:0;right:0;bottom:0;padding:var(--cy-space-36) var(--cy-space-44);box-sizing:border-box;display:flex;flex-direction:column;gap:var(--cy-space-20);align-items:center;justify-content:center;text-align:left;transition:opacity 0.3s ease;opacity:" +
      (on ? "1" : "0") +
      ";visibility:" +
      (on ? "visible" : "hidden")
    );
  }

  selectFeat(i, manual) {
    if (manual) this._featPauseUntil = Date.now() + 15000;
    if ((this.state.featSel || 0) === i) return;
    this.setState({ featSel: i });
    setTimeout(() => this.replayIll(i), 60);
  }

  playCell(cell) {
    if (!cell) return;
    const els = cell.querySelectorAll(".bp-draw, .bp-fade");
    els.forEach((e) => {
      e.style.animation = "none";
    });
    void cell.offsetWidth;
    let k = 0;
    els.forEach((e) => {
      const d = (0.05 + k * 0.05).toFixed(2);
      e.style.animation =
        (e.classList.contains("bp-draw")
          ? "bpDraw 0.7s cubic-bezier(0.4,0,0.2,1) "
          : "bpFade 0.4s ease ") +
        d +
        "s forwards";
      k++;
    });
  }

  replayIll(i) {
    const p = document.querySelector('[data-feat-panel="' + i + '"]');
    if (!p) return;
    const els = p.querySelectorAll(".bp-draw, .bp-fade");
    els.forEach((e) => {
      e.style.animation = "none";
    });
    void p.offsetWidth;
    let k = 0;
    els.forEach((e) => {
      const d = (0.05 + k * 0.05).toFixed(2);
      e.style.animation =
        (e.classList.contains("bp-draw")
          ? "bpDraw 0.7s cubic-bezier(0.4,0,0.2,1) "
          : "bpFade 0.4s ease ") +
        d +
        "s forwards";
      k++;
    });
  }

  fgBase() {
    return this.root.classList.contains("cy-light") ? "20,20,42" : "236,237,239";
  }

  buildGrid() {
    const el = this._gridEl;
    if (!el) return;
    const contRect = el.getBoundingClientRect();
    const secs = Array.from(document.querySelectorAll("section[data-screen-label]"));
    if (!secs.length) return;
    const tops = secs.map((s) => Math.round(s.getBoundingClientRect().top - contRect.top));
    const bottom = Math.round(secs[secs.length - 1].getBoundingClientRect().bottom - contRect.top);
    const bandEls = Array.from(
      document.querySelectorAll(
        "section.cy-band-dark, footer.cy-band-dark, section.cy-band-light, footer.cy-band-light",
      ),
    );
    const sig =
      tops.join(",") +
      "|" +
      bottom +
      "|" +
      Math.round(contRect.width) +
      "|" +
      (this.root.classList.contains("cy-light") ? "L" : "D") +
      bandEls
        .map(
          (b) =>
            (b.classList.contains("cy-band-dark") ? "d" : "l") +
            (b.style.background || "") +
            Math.round(b.getBoundingClientRect().top - contRect.top) +
            ":" +
            Math.round(b.getBoundingClientRect().height),
        )
        .join("_");
    if (sig === this._gridSig) return;
    this._gridSig = sig;
    el.querySelectorAll("[data-gridline]").forEach((n) => n.remove());
    const minorC = "rgba(var(--cy-fg-rgb),0.028)";
    const vC = "rgba(var(--cy-fg-rgb),0.045)";
    const mk = (css, kind) => {
      const d = document.createElement("div");
      d.setAttribute("data-gridline", kind);
      d.style.cssText = "position:absolute;pointer-events:none;" + css;
      el.appendChild(d);
    };
    const bounds = tops.filter((y) => y >= 0);
    bounds.push(bottom);
    const TOP_BEVEL =
      "clip-path:polygon(0 0,calc(50% - 90px) 0,calc(50% - 90px + var(--seam-bevel)) var(--seam-bevel),calc(50% + 90px - var(--seam-bevel)) var(--seam-bevel),calc(50% + 90px) 0,100% 0,100% 100%,0 100%)";
    const PANEL_BEVEL =
      "clip-path:polygon(0 0,calc(50% - 90px) 0,calc(50% - 90px + var(--seam-bevel)) var(--seam-bevel),calc(50% + 90px - var(--seam-bevel)) var(--seam-bevel),calc(50% + 90px) 0,100% 0,100% 100%,calc(50% + 90px) 100%,calc(50% + 90px - var(--seam-bevel)) calc(100% - var(--seam-bevel)),calc(50% - 90px + var(--seam-bevel)) calc(100% - var(--seam-bevel)),calc(50% - 90px) 100%,0 100%)";
    const bandRanges = bandEls.map((s) => {
      const r = s.getBoundingClientRect();
      const lbl = s.getAttribute("data-screen-label") || "";
      const bevel =
        lbl === "01 Performance"
          ? "panel"
          : lbl === "02 What it does" ||
              lbl === "05 Built to last" ||
              lbl === "CTA Start with install"
            ? "top"
            : null;
      const inlineBg = getComputedStyle(s).backgroundColor;
      return {
        top: r.top - contRect.top,
        bottom: r.bottom - contRect.top,
        light: s.classList.contains("cy-band-light"),
        bevel: bevel,
        bg: inlineBg && inlineBg !== "rgba(0, 0, 0, 0)" ? inlineBg : null,
      };
    });
    const bevelPx = parseFloat(getComputedStyle(el).getPropertyValue("--seam-bevel")) || 15;
    bandRanges.forEach((b, i) => {
      const next = bandRanges[i + 1];
      // extend this band's bottom into the next band's top notch so the upper color fills it (visible separator)
      const overlap = next && (next.bevel === "top" || next.bevel === "panel") ? bevelPx + 2 : 1;
      const bh = b.bottom - b.top + overlap;
      const bandBg = b.bg || (b.light ? "#FFFFFF" : "#F4F5FA");
      const bandEdge = b.light ? "#E3E5F1" : "#E3E5F1";
      const bandClip =
        b.bevel === "panel" ? ";" + PANEL_BEVEL : b.bevel === "top" ? ";" + TOP_BEVEL : "";
      mk(
        "left:" +
          (-(contRect.left + (el.clientLeft || 0))).toFixed(1) +
          "px;width:100vw;top:" +
          b.top.toFixed(2) +
          "px;height:" +
          bh.toFixed(2) +
          "px;background:" +
          bandBg +
          bandClip,
        "band",
      );
      mk(
        "left:-1px;width:1px;top:" +
          b.top.toFixed(2) +
          "px;height:" +
          bh.toFixed(2) +
          "px;background:" +
          bandEdge,
        "bandedge",
      );
      mk(
        "left:" +
          el.clientWidth +
          "px;width:1px;top:" +
          b.top.toFixed(2) +
          "px;height:" +
          bh.toFixed(2) +
          "px;background:" +
          bandEdge,
        "bandedge",
      );
    });
    const inBand = (y) => bandRanges.some((b) => y > b.top + 2 && y < b.bottom - 2);
    const fgAt = (y) => (inBand(y) || (inBand(y - 6) && inBand(y + 6)) ? "236,237,239" : null);
    // exact content edges, measured from a real section wrapper (accounts for container border)
    const bl = el.clientLeft || 0;
    if (this._tickOv && this._tickOv.isConnected) {
      this._tickOv.remove();
      this._tickOv = null;
    }
    const wrap0 = Array.from(secs[0].children).find(
      (ch) => ch.tagName === "DIV" && !ch.getAttribute("aria-hidden") && ch.offsetWidth > 0,
    );
    const wr0 = wrap0 ? wrap0.getBoundingClientRect() : contRect;
    // exact (unrounded) content-edge columns; the right line occupies the pixel column just INSIDE the edge, matching the accent glow lines
    const leftIn = wr0.left + 24 - contRect.left - bl;
    const rightIn = wr0.right - 24 - contRect.left - bl - 1;
    // section boundaries: crosshairs removed
    // verticals: the two content edges + a center axis — nothing arbitrary
    mk("top:0;bottom:0;left:" + leftIn.toFixed(2) + "px;width:1px;background:" + vC, "v");
    mk("top:0;bottom:0;left:" + rightIn.toFixed(2) + "px;width:1px;background:" + vC, "v");
    mk(
      "top:0;bottom:0;left:" +
        ((leftIn + rightIn) / 2).toFixed(2) +
        "px;width:1px;background:" +
        minorC,
      "v",
    );
    bandRanges.forEach((b) => {
      const hh = b.bottom - b.top;
      mk(
        "top:" +
          b.top +
          "px;height:" +
          hh +
          "px;left:" +
          leftIn.toFixed(2) +
          "px;width:1px;background:rgba(236,237,239,0.045)",
        "v",
      );
      mk(
        "top:" +
          b.top +
          "px;height:" +
          hh +
          "px;left:" +
          rightIn.toFixed(2) +
          "px;width:1px;background:rgba(236,237,239,0.045)",
        "v",
      );
      mk(
        "top:" +
          b.top +
          "px;height:" +
          hh +
          "px;left:" +
          ((leftIn + rightIn) / 2).toFixed(2) +
          "px;width:1px;background:rgba(236,237,239,0.028)",
        "v",
      );
    });
  }

  drawBg(t) {
    const c = this._bgEl;
    if (!c || !c.width) return;
    const ctx = c.getContext("2d");
    const light = this.root.classList.contains("cy-light");
    const dpr = this._bgDpr || 1;
    const w = c.width / dpr,
      h = c.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cell = 9,
      ramp = ".:-=+*#";
    ctx.font = "8px 'Geist Mono', ui-monospace, Menlo, monospace";
    const hash = (x, y) => {
      let n = (x * 374761393 + y * 668265263) | 0;
      n = ((n ^ (n >> 13)) * 1274126177) | 0;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    };
    const trails = [];
    for (let i = 0; i < 7; i++) {
      const speed = 80 + 55 * ((i * 0.37) % 1);
      const baseY = h * ((i * 0.163 + 0.06) % 1);
      const x = ((t * speed + i * 520) % (w + 480)) - 240;
      trails.push({ x: x, y: baseY, len: 150 + 90 * ((i * 0.53) % 1) });
    }
    for (let gy = cell; gy < h; gy += cell) {
      for (let gx = 0; gx < w; gx += cell) {
        const r = hash(gx, gy);
        let v =
          0.3 +
          0.3 * Math.sin(gx * 0.02 + gy * 0.03 - t * 0.8) +
          0.25 * Math.sin(gx * 0.05 - gy * 0.02 + t * 0.5 + r * 2.5);
        v *= 0.62;
        for (let i = 0; i < trails.length; i++) {
          const tr = trails[i];
          const dyy = Math.abs(gy - tr.y);
          if (dyy > 26) continue;
          const behind = tr.x - gx;
          if (behind < 0 || behind > tr.len) continue;
          const tv = (1 - behind / tr.len) * (1 - dyy / 26);
          if (tv > v) v = tv;
        }
        if (r < 0.12) continue;
        if (v < 0.1) continue;
        const a = Math.min(light ? 0.56 : 0.17, (v - 0.05) * (light ? 0.6 : 0.18));
        ctx.fillStyle = "rgba(" + this.fgBase() + "," + a.toFixed(3) + ")";
        v = Math.max(0, Math.min(0.999, v));
        ctx.fillText(ramp[Math.floor(v * ramp.length)], gx, gy);
      }
    }
  }

  bgHash(x, y) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  sizeCanvas(c) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = c.clientWidth,
      ch = c.clientHeight;
    if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
    }
    return dpr;
  }

  drawGlow(c, t) {
    if (!c.isConnected) {
      this._glows.delete(c);
      return;
    }
    const dpr = this.sizeCanvas(c);
    const ctx = c.getContext("2d");
    const w = c.width / dpr,
      h = c.height / dpr;
    if (!w || !h) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const hero = c.getAttribute("data-glow") === "hero";
    const cell = 10;
    const cx = w * (hero ? 0.3 : 0.22),
      cy = h * 0.5;
    const R = Math.max(w, h) * (hero ? 0.5 : 0.42);
    const acc = this._accentRgb || "19,111,232";
    const aMax = hero ? 0.34 : 0.26;
    for (let gy = cell; gy < h; gy += cell) {
      for (let gx = 0; gx < w; gx += cell) {
        const dx = gx - cx,
          dy = (gy - cy) * 1.7;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > R) continue;
        const fall = (1 - d / R) ** 1.7;
        const r1 = this.bgHash(gx, gy);
        if (r1 < 0.12) continue;
        const breathe = 0.7 + 0.3 * Math.sin(t * 0.8 + d * 0.014 + r1 * 4);
        const a = fall * breathe * aMax * (0.3 + 0.7 * r1);
        if (a < 0.02) continue;
        ctx.fillStyle = "rgba(" + acc + "," + Math.min(0.4, a).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(gx, gy, 1 + fall * 1.1, 0, 6.283);
        ctx.fill();
      }
    }
  }

  drawWordmark(t) {
    t = 1;
    const c = this._wordEl;
    if (!c || !c.isConnected) return;
    const dpr = this.sizeCanvas(c);
    const ctx = c.getContext("2d");
    const w = c.width / dpr,
      h = c.height / dpr;
    if (!w || !h) return;
    const cell = 4;
    const cols = Math.floor(w / cell),
      rows = Math.floor(h / cell);
    const fontsReady = document.fonts ? document.fonts.status : "n/a";
    const key = cols + "x" + rows + ":" + fontsReady;
    if (!this._wordMask || this._wordMask.key !== key) {
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d");
      octx.fillStyle = "#fff";
      let fs = rows * 1.15;
      octx.font = "700 " + fs + "px Poppins, Inter, sans-serif";
      const tw = octx.measureText("CookieYes").width;
      if (tw > cols * 0.98) {
        fs *= (cols * 0.98) / tw;
        octx.font = "700 " + fs + "px Poppins, Inter, sans-serif";
      }
      octx.textBaseline = "middle";
      octx.textAlign = "center";
      octx.fillText("CookieYes", cols / 2, rows * 0.52);
      const data = octx.getImageData(0, 0, cols, rows).data;
      const mask = new Uint8Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) mask[i] = data[i * 4 + 3] > 110 ? 1 : 0;
      this._wordMask = { key: key, cols: cols, rows: rows, mask: mask };
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const acc = this._accentRgb || "19,111,232";
    const m = this._wordMask;
    const _wr = c.getBoundingClientRect();
    const _vh = window.innerHeight || 800;
    let _rp = (_vh - _wr.top) / (_wr.height || 200);
    _rp = _rp < 0 ? 0 : _rp > 1 ? 1 : _rp;
    this._wordReveal = Math.max(this._wordReveal || 0, _rp);
    const RP = this._wordReveal,
      REVBAND = 0.16;
    const ht = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    for (let y = 0; y < m.rows; y++) {
      for (let x = 0; x < m.cols; x++) {
        if (!m.mask[y * m.cols + x]) continue;
        const rev = Math.max(0, Math.min(1, (RP - (x / m.cols) * (1 - REVBAND)) / REVBAND));
        if (rev <= 0) continue;
        const n = this.bgHash(x, y);
        let a = 0.3 + 0.14 * Math.sin(ht * 1.1 + x * 0.08 + n * 5);
        let px = x * cell,
          py = y * cell + cell;
        let rr = 1.25;
        if (this._wordHot) {
          const mdx = px - this._wordMx,
            mdy = py - this._wordMy;
          const md = Math.sqrt(mdx * mdx + mdy * mdy);
          const R = 82;
          if (md < R && md > 0.5) {
            const f = 1 - md / R;
            const ang = Math.atan2(mdy, mdx);
            const push = f * f * 46;
            px += Math.cos(ang) * push;
            py += Math.sin(ang) * push;
            a = Math.min(0.85, a + 0.4 * f);
            rr += f * 0.7;
          }
        }
        a *= rev;
        py += (1 - rev) * 7;
        ctx.fillStyle = "rgba(" + acc + "," + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(px, py, rr, 0, 6.283);
        ctx.fill();
      }
    }
  }

  drawFwParticles(c, t) {
    if (!c.isConnected) {
      this._fws.delete(c);
      return;
    }
    // hover energy ramps in quickly, decays out smoothly
    c._energy = (c._energy || 0) + ((c._hover ? 1 : 0) - (c._energy || 0)) * 0.09;
    const en = c._energy;
    const dpr = this.sizeCanvas(c);
    const ctx = c.getContext("2d");
    const w = c.width / dpr,
      h = c.height / dpr;
    if (!w || !h) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (en < 0.01) {
      c._ps = null;
      c._sweep = null;
      return;
    }
    // fixed particle field, lit as a sweep front passes over it
    if (!c._ps) {
      c._ps = [];
      const n = Math.round((w * h) / 13);
      for (let i = 0; i < n; i++) {
        c._ps.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.3 + Math.random() * 0.7,
          ph: Math.random() * 6.283,
          sp: 1.2 + Math.random() * 1.4,
        });
      }
    }
    // restart the sweep from the left each time the cell is (re-)entered
    if (c._hover && !c._wasHover) {
      c._sweepStart = t;
      // radiate from the center of the cell's logo
      const cell = c.parentElement;
      const logo = cell && cell.querySelector(".cy-fw-logo, .cy-fw-more");
      if (logo) {
        const cr = c.getBoundingClientRect(),
          lr = logo.getBoundingClientRect();
        c._cx0 = (lr.left + lr.right) / 2 - cr.left;
        c._cy0 = (lr.top + lr.bottom) / 2 - cr.top;
      } else {
        c._cx0 = c._mx;
        c._cy0 = c._my;
      }
    }
    c._wasHover = c._hover;
    const col = this._accentRgb || "19,111,232";
    const dur = 1.15; // seconds for one full expansion
    const elapsed = t - (c._sweepStart || t);
    const prog = elapsed / dur; // plays once per hover; >1 means the ring has passed (resting)
    // vertical wavefront sweeping left to right, easing in (slow start -> fast finish)
    const band = w * 0.85; // horizontal thickness of the lit band (long trail — particles persist behind the front)
    const fp = Math.min(prog, 1); // linear travel
    const frontX = fp * (w + band);
    // graceful tail: once the front finishes, ease the whole field out over ~0.7s instead of cutting
    const fade = prog <= 1.0 ? 1 : Math.max(0, 1 - (prog - 1.0) / 1.1);
    const done = fade <= 0.001;
    // no glow ring — the sweep's color reads purely from the dense particle field
    for (const p of c._ps) {
      const py = p.y + Math.sin(t * 0.7 + p.ph) * 1.8;
      const behind = frontX - p.x; // >0 once the front has passed this particle
      // particle ignites as the ring reaches it, then trails inward and fades
      let lit = 0;
      if (!done && behind >= -band * 0.12 && behind < band) {
        lit = behind < 0 ? 1 + behind / (band * 0.12) : 1 - behind / band;
      }
      const tw = 0.55 + 0.45 * Math.sin(t * p.sp + p.ph);
      const a = en * Math.max(0, lit) * tw * 0.6 * fade;
      if (a < 0.01) continue;
      ctx.fillStyle = "rgba(" + col + "," + a.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(p.x, py, p.r, 0, 6.283);
      ctx.fill();
    }
  }

  drawHotspot(c, t) {
    if (!c.isConnected) {
      this._hots.delete(c);
      return;
    }
    c._energy = (c._energy || 0) + ((c._hover ? 1 : 0) - (c._energy || 0)) * 0.14;
    const en = c._energy;
    const dpr = this.sizeCanvas(c);
    const ctx = c.getContext("2d");
    const w = c.width / dpr,
      h = c.height / dpr;
    if (!w || !h) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cell = 7;
    const cols = Math.ceil(w / cell),
      rows = Math.ceil(h / cell);
    if (!c._cellE || c._cellE.length !== cols * rows) c._cellE = new Float32Array(cols * rows);
    const E = c._cellE;
    if (c._hover) {
      const ci = Math.floor((c._mx || 0) / cell),
        ri = Math.floor((c._my || 0) / cell);
      if (ci >= 0 && ci < cols && ri >= 0 && ri < rows) E[ri * cols + ci] = 1;
      c._fx = c._mx;
      c._fy = c._my;
    }
    let hasLit = false;
    for (let i = 0; i < E.length; i++) {
      if (E[i] > 0.01) {
        hasLit = true;
        break;
      }
    }
    if (en < 0.02 && !hasLit) return;
    const base = this._accentRgb || "19,111,232";
    const mx = c._fx != null ? c._fx : w / 2,
      my = c._fy != null ? c._fy : h / 2;
    const R = 150;
    ctx.lineWidth = 1;
    for (let ri = 0; ri < rows; ri++) {
      for (let ci = 0; ci < cols; ci++) {
        const i = ri * cols + ci;
        const x = ci * cell + 0.5,
          y = ri * cell + 0.5;
        const dx = x + cell / 2 - mx,
          dy = y + cell / 2 - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        const v = E[i];
        if (v > 0.01) {
          E[i] = v * 0.82;
          ctx.fillStyle = "rgba(" + base + "," + (v * 0.08).toFixed(3) + ")";
          ctx.fillRect(x, y, cell - 1, cell - 1);
        } else if (v !== 0) {
          E[i] = 0;
        }
        if (d > R) continue;
        const edge = Math.min(1, Math.min(x, y, w - x - cell, h - y - cell) / 56);
        if (edge <= 0) continue;
        const fall = (1 - d / R) ** 1.6 * edge * edge;
        const stroke = 0.045 * en * fall;
        if (stroke > 0.004) {
          ctx.strokeStyle = "rgba(" + base + "," + stroke.toFixed(3) + ")";
          ctx.strokeRect(x, y, cell - 1, cell - 1);
        }
      }
    }
  }

  drawRipple(c, t) {
    if (!c || !c.isConnected) {
      if (this._ripples) this._ripples.delete(c);
      return;
    }
    const dpr = this.sizeCanvas(c);
    const ctx = c.getContext("2d");
    const w = c.width / dpr,
      h = c.height / dpr;
    if (!w || !h) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cellX = 8,
      cellY = 9;
    ctx.font = "8px 'Geist Mono', ui-monospace, Menlo, monospace";
    const glyphs = "--==++*#";
    const bucket = Math.floor(t * 0.7);
    const pulse = 0.55 + 0.45 * Math.sin(t * 1.4);
    for (let gy = cellY; gy < h; gy += cellY) {
      for (let gx = 0; gx < w; gx += cellX) {
        const ix = gx / cellX,
          iy = gy / cellY;
        const n = this.bgHash(ix + bucket * 13, iy - bucket * 7);
        if (n < 0.3) continue;
        const flick =
          0.5 +
          0.5 *
            Math.sin(t * (0.6 + 0.8 * this.bgHash(ix, iy)) + this.bgHash(ix + 9, iy + 4) * 6.283);
        const v = ((n - 0.3) / 0.7) * (0.3 + 0.7 * flick) * (0.35 + 0.65 * pulse);
        if (v < 0.04) continue;
        const edge = Math.min(1, Math.min(gx, gy, w - gx, h - gy) / 40);
        ctx.fillStyle =
          "rgba(" + this.fgBase() + "," + Math.min(0.2, v * 0.2 * edge).toFixed(3) + ")";
        ctx.fillText(glyphs[Math.floor(this.bgHash(ix + 57, iy + 31) * glyphs.length)], gx, gy);
      }
    }
  }

  drawSparkles(t) {
    const c = this._sparkleEl;
    if (!c || !c.isConnected) return;
    const dpr = this.sizeCanvas(c);
    const ctx = c.getContext("2d");
    const w = c.width / dpr,
      h = c.height / dpr;
    if (!w || !h) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cell = 10,
      ramp = ".:+*#";
    ctx.font = "7px 'Geist Mono', ui-monospace, Menlo, monospace";
    const sy = window.scrollY || 0;
    const startDoc = Math.floor(sy / cell) * cell;
    for (let docY = startDoc; docY < sy + h + cell; docY += cell) {
      for (let gx = 0; gx < w; gx += cell) {
        const ix = gx / cell,
          iy = docY / cell;
        const r = this.bgHash(ix, iy);
        if (r < 0.91) continue;
        const r2 = this.bgHash(ix + 31, iy + 17);
        const phase = (t * (0.25 + 0.45 * r2) + r * 7) % 1;
        const tri = 1 - Math.abs(phase * 2 - 1);
        if (tri < 0.15) continue;
        const swap = this.bgHash(ix + 5, iy + Math.floor(t * 5) * 53);
        ctx.fillStyle = "rgba(" + this.fgBase() + "," + Math.min(0.15, tri * 0.17).toFixed(3) + ")";
        ctx.fillText(ramp[Math.floor(swap * ramp.length)], gx, docY - sy);
      }
    }
  }

  asciiCookie(t) {
    const cols = 92,
      rows = 46,
      ramp = " .:-=+*";
    const cx = cols / 2,
      cy = rows / 2,
      r = 21;
    const chips = [
      [-9, -5],
      [7, -8],
      [10, 4],
      [-4, 7],
      [1, -1],
      [-12, 2],
      [4, 11],
      [-7, -11],
    ];
    let out = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = (x - cx) * 0.69,
          dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) {
          out += " ";
          continue;
        }
        let chip = false;
        for (let i = 0; i < chips.length; i++) {
          const qx = dx - chips[i][0],
            qy = dy - chips[i][1];
          if (qx * qx + qy * qy < 6) {
            chip = true;
            break;
          }
        }
        if (chip) {
          out += "%";
          continue;
        }
        let b =
          0.5 +
          0.35 * Math.sin(t * 0.9 + dx * 0.275 + dy * 0.4) +
          0.15 * Math.sin(t * 1.7 - dx * 0.15 + dy * 0.2);
        b *= Math.max(0, 1 - d / r) ** 0.3;
        b = Math.max(0, Math.min(0.999, b));
        out += ramp[Math.floor(b * ramp.length)];
      }
      out += "\n";
    }
    return out;
  }

  asciiWave(t) {
    const cols = 52,
      rows = 7,
      ramp = " .:-=+*#";
    let out = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let b = 0.5 + 0.5 * Math.sin(x * 0.25 - t * 1.6 + Math.sin(y * 0.7 + t * 0.8) * 1.2);
        b *= 0.85;
        b = Math.max(0, Math.min(0.999, b));
        out += ramp[Math.floor(b * ramp.length)];
      }
      out += "\n";
    }
    return out;
  }
}

export { DesignMotion };
