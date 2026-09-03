/* =============================================================
   app.js  —  isaacfun.xyz page logic
   -------------------------------------------------------------
   All CONTENT lives in projects.js (window.MENU / window.SITE /
   window.SECTION_INTRO). This file only turns that data into
   pages and handles navigation — you shouldn't need to touch it
   just to change what's on the site.

   ROUTING
   Clean paths, no "#" (e.g. isaacfun.xyz/imagine, not .../#/imagine).
   Two kinds of link:
     - "real" project links (a `url` in projects.js) are ordinary
       <a> tags with no special handling — clicking one is a normal
       full-page navigation to that project's own index.html.
     - every other in-site link (home, the menu, and placeholder
       project stubs) is marked data-spa and is handled entirely by
       the tiny router below via history.pushState, so moving
       between site pages never reloads the page.
   For this to work in production, the host must serve index.html
   for any path that isn't a real file (see vercel.json rewrites).

   LOCAL PREVIEW OVER file://
   Browsers refuse to let pushState change the address bar on a
   file:// page (security restriction — there's no real path to
   navigate to). Double-clicking index.html still works: we just
   track the current page ourselves instead of relying on the
   address bar. Only the URL display degrades; clicking around the
   site does not. Over a real server (http/https) this never
   triggers and the address bar updates normally.
   ============================================================= */

(function () {
  "use strict";

  const PAGES  = window.MENU || [];           // [{ slug, label, masked? }]
  const SITE   = window.SITE || {};            // { about:[...], use:[...], ... }
  const INTRO  = window.SECTION_INTRO || {};    // { use: "...", imagine: "...", ... }
  const LABELS = Object.fromEntries(PAGES.map(p => [p.slug, p.label]));

  const main  = document.getElementById("main");
  const app   = document.getElementById("app");
  const index = document.getElementById("index");
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------------- small helpers ---------------- */
  const heading  = slug => (LABELS[slug] || slug).toLowerCase();
  const initials = t => (t.split(" ").map(w => w[0]).join("").slice(0, 2) || "·").toUpperCase();

  // Deterministic "missing letter" for the home menu (desktop reveals it on
  // hover). Same word -> same hidden spot every time (never randomized).
  const hashOf = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function mask(label, blanks = 1) {
    if (label.length < 2) return label;
    const pos = [];                                   // positions after the 1st letter
    for (let i = 1; i < label.length; i++) pos.push(i);
    pos.sort((a, b) => hashOf(label + "#" + a) - hashOf(label + "#" + b));
    const hide = new Set(pos.slice(0, Math.min(blanks, pos.length)));
    return [...label].map((ch, i) => hide.has(i) ? "_" : ch).join("");
  }

  /* ---------------- renderers ---------------- */

  // Home menu (the numbered index). data-spa: always an in-site page.
  function renderIndex(current) {
    index.innerHTML = PAGES.map((p, i) => {
      const num = String(i + 1).padStart(2, "0");
      const masked = p.masked || mask(p.label, p.blanks);
      return `
        <a class="idx-link${p.slug === current ? " active" : ""}" href="/${p.slug}" data-spa>
          <span class="n">${num}</span>
          <span class="t"><span class="masked">${masked}</span><span class="full">${p.label}</span></span>
        </a>`;
    }).join("");
  }

  function renderAbout() {
    const paras = (SITE.about || []).map(p => `<p>${p}</p>`).join("");
    return `<h1 class="page-title">${heading("about")}</h1><div class="about">${paras}</div>`;
  }

  // One project card. Real, built-out projects (item.url set) are plain
  // links — no data-spa — so they load normally, outside the SPA router.
  function card(slug, item) {
    const isReal = Boolean(item.url);
    const href = item.url || `/${slug}/${item.slug}`;
    const spaAttr = isReal ? "" : "data-spa";
    const logo = item.image
      ? `<div class="logo"><img src="${item.image}" alt="" loading="lazy" decoding="async" onerror="this.closest('.logo').outerHTML='<div class=&quot;logo&quot;>${initials(item.title)}</div>'"></div>`
      : `<div class="logo">${initials(item.title)}</div>`;
    return `
      <a class="card" href="${href}" ${spaAttr}>
        ${logo}
        <div class="body">
          <div class="title">${item.title}</div>
          <div class="desc">${item.description}</div>
        </div>
      </a>`;
  }

  // A section page (use / imagine / enjoy / digest): optional intro line,
  // then the card grid.
  function renderCollection(slug) {
    const items = SITE[slug] || [];
    const intro = INTRO[slug] ? `<p class="section-intro">${INTRO[slug]}</p>` : "";
    const body = items.length
      ? `<div class="grid">${items.map(it => card(slug, it)).join("")}</div>`
      : `<p class="empty">nothing here yet.</p>`;
    return `<h1 class="page-title">${heading(slug)}</h1>${intro}${body}`;
  }

  // Fallback stub for a project without its own page.
  function renderProject(slug, itemSlug) {
    const item = (SITE[slug] || []).find(i => i.slug === itemSlug);
    if (!item) return renderCollection(slug);
    return `
      <h1 class="page-title">${item.title}</h1>
      <div class="about"><p>${item.description}</p>
      <p>this project lives at <code>${slug}/${item.slug}/</code></p></div>
      <p class="back"><a href="/${slug}" data-spa>&larr; ${heading(slug)}</a></p>`;
  }

  /* ---------------- router (clean paths, no "#") ---------------- */
  const isFileProtocol = location.protocol === "file:";
  // Source of truth for "what page are we on". Over http(s) this always
  // mirrors location.pathname. Over file://, pushState can't change the
  // address bar, so we track it ourselves instead.
  let virtualPath = "/";

  function currentPath() {
    return isFileProtocol ? virtualPath : location.pathname;
  }

  function go(pathname) {
    if (pathname === currentPath()) return;
    if (!isFileProtocol) {
      try {
        history.pushState({}, "", pathname);
      } catch (err) {
        // Some browsers refuse pushState in edge cases (sandboxed iframes,
        // certain local previews) — fall back to tracking it ourselves so
        // navigation still works even if the address bar can't update.
      }
    }
    virtualPath = pathname;
    route();
  }

  function route() {
    const parts = currentPath().replace(/^\/|\/$/g, "").split("/").filter(Boolean);
    const slug = parts[0] || "home";
    renderIndex(slug);

    const isHome = slug === "home";
    main.classList.toggle("is-home", isHome);

    if (isHome) app.innerHTML = "";
    else if (slug === "about") app.innerHTML = renderAbout();
    else if (SITE[slug]) app.innerHTML = parts[1] ? renderProject(slug, parts[1]) : renderCollection(slug);
    else app.innerHTML = renderAbout();

    window.scrollTo(0, 0);
  }

  // Intercept clicks on in-site links (data-spa) so navigation is instant
  // and never triggers a full reload. Every data-spa href is one we
  // generated ourselves above (always a site-relative "/..." path), so we
  // read it directly rather than resolving it as a URL — that resolution
  // behaves inconsistently under file://. Anything else (real project
  // pages, external links) behaves like a normal <a> tag.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-spa]");
    if (!link) return;
    e.preventDefault();
    go(link.getAttribute("href"));
  });

  window.addEventListener("popstate", () => {
    if (!isFileProtocol) route();
  });

  // Entering the SPA from a REAL project page (JanDorm, the Museum, ...)
  // can't link to a bare section path like "/imagine" — "imagine" is also
  // a real folder on disk (it holds those projects' files), so a plain
  // full-page link to it is ambiguous and some servers will show that
  // folder's contents instead of the site. Those back-links instead point
  // at "index.html?page=imagine", which always resolves to this exact
  // file no matter the server. We translate that into a normal in-app
  // navigation on load, then swap the address bar back to the clean path.
  const pageParam = new URLSearchParams(location.search).get("page");
  if (pageParam) {
    const initialPath = "/" + pageParam.replace(/^\/+/, "");
    if (!isFileProtocol) {
      try { history.replaceState({}, "", initialPath); } catch (err) { /* see go() */ }
    }
    virtualPath = initialPath;
  }

  route();
})();
