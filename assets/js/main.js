/* Wired Together — project page behaviour.
   Play clips while they are on screen, filter the moment grids by outcome
   and kind, fold the top bar into a menu on small screens, keep the in-page
   contents in step with scrolling, enlarge figures, copy the citation, and
   typeset the equations. The page works with JavaScript off: every clip is
   then a poster frame with native controls one click away, and every figure
   is its plain image. */

(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const videos = Array.from(document.querySelectorAll(".stage video"));

  // ── top bar: a menu button on small screens ───────────────────────
  const navbar = document.getElementById("navbar");
  const menuBtn = navbar && navbar.querySelector(".menu-btn");
  if (menuBtn) {
    menuBtn.hidden = false;   // the stylesheet shows it only on narrow screens
    const setOpen = open => {
      navbar.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn.addEventListener("click", () => setOpen(!navbar.classList.contains("open")));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && navbar.classList.contains("open")) { setOpen(false); menuBtn.focus(); }
    });
    document.addEventListener("click", e => {
      if (navbar.classList.contains("open") && !navbar.contains(e.target)) setOpen(false);
    });
    navbar.querySelectorAll(".menu a").forEach(a => a.addEventListener("click", () => setOpen(false)));
    const wide = window.matchMedia("(min-width: 921px)");
    const onWide = e => { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide); else wide.addListener(onWide);
  }

  // ── clips: on-screen autoplay, with a Stop/Play button ────────────
  // A clip the reader stopped stays stopped: the observer only restarts
  // clips it paused itself (off-screen), never one stopped by hand.
  videos.forEach(v => {
    v.controls = false;
    v.setAttribute("tabindex", "0");
    const card = v.closest(".card");
    const heading = card && card.querySelector("figcaption h3");
    if (heading && !v.hasAttribute("aria-label")) {
      v.setAttribute("aria-label", heading.textContent.trim() + " — click to play or stop");
    }
    const btn = document.createElement("button");
    btn.className = "vctl";
    btn.type = "button";
    const label = () => {
      btn.textContent = v.paused ? "▶ Play" : "❚❚ Pause";
      btn.setAttribute("aria-label", v.paused ? "Play video" : "Pause video");
    };
    const stop = () => { v.dataset.userPaused = "1"; v.pause(); };
    const play = () => { delete v.dataset.userPaused; v.play().catch(() => { v.controls = true; }); };
    const toggle = () => (v.paused ? play() : stop());
    btn.addEventListener("click", e => { e.stopPropagation(); toggle(); });
    // With native controls showing, clicks and keys belong to them.
    v.addEventListener("click", () => { if (!v.controls) toggle(); });
    v.addEventListener("keydown", e => {
      if (v.controls) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
    });
    v.addEventListener("play", label);
    v.addEventListener("pause", label);
    label();
    // Controls live in one strip at the stage's top-right.
    const stage = v.parentElement;
    let strip = stage.querySelector(".stagectl");
    if (!strip) { strip = document.createElement("div"); strip.className = "stagectl"; stage.appendChild(strip); }
    strip.appendChild(btn);
    // Recorded evidence can be stepped through with the browser's own scrubber.
    if (card && !card.classList.contains("swarm")) {
      const scrub = document.createElement("button");
      scrub.className = "vscrub";
      scrub.type = "button";
      scrub.textContent = "Scrub";
      scrub.title = "Show the video's own controls, to step through the recording";
      scrub.setAttribute("aria-pressed", "false");
      scrub.addEventListener("click", e => {
        e.stopPropagation();
        v.controls = !v.controls;
        scrub.classList.toggle("on", v.controls);
        scrub.setAttribute("aria-pressed", String(v.controls));
      });
      strip.appendChild(scrub);
    }
  });

  // ── focus / all views: swap between the N-panel and the named-agents clip
  // Clips open with every agent in the episode, so views compare in
  // parallel; the button narrows to the agents the moment is about.
  // Playback position, rate and state carry across the swap, and the
  // labels switch with it.
  document.querySelectorAll(".card[data-pair-video]").forEach(card => {
    const v = card.querySelector("video");
    const stage = v.parentElement;
    const strip = stage.querySelector(".stagectl");
    const tagsPair = stage.querySelector(".viewtags.pair");
    const tagsAll = stage.querySelector(".viewtags.all");
    if (!v || !strip || !tagsPair || !tagsAll) return;
    const all = { src: v.getAttribute("src"), poster: v.getAttribute("poster") || v.dataset.poster };
    const pair = { src: card.dataset.pairVideo, poster: card.dataset.pairPoster };
    const nAll = card.dataset.allN, nPair = +card.dataset.pairN;
    let showingAll = true;
    // On a phone, three or six panels in 350px are unreadable: open on the
    // acting agents and keep every view one tap away.
    if (window.matchMedia("(max-width: 600px)").matches) {
      showingAll = false;
      if (v.getAttribute("poster")) v.setAttribute("poster", pair.poster);
      v.dataset.poster = pair.poster;
      v.src = pair.src;
      tagsPair.hidden = false;
      tagsAll.hidden = true;
      card.classList.add("focus");
    }
    const btn = document.createElement("button");
    btn.className = "vall";
    btn.type = "button";
    const label = () => {
      btn.textContent = showingAll
        ? (nPair === 1 ? "⊟ Only the acting agent" : "⊟ Only the agents acting")
        : `⊞ All ${nAll} views`;
      btn.title = showingAll
        ? "Narrow to the agents contributing to the action"
        : "Every agent in the episode, side by side";
      btn.classList.toggle("on", !showingAll);
    };
    btn.addEventListener("click", e => {
      e.stopPropagation();
      showingAll = !showingAll;
      const t = v.currentTime, wasPlaying = !v.paused, rate = v.playbackRate;
      const next = showingAll ? all : pair;
      v.setAttribute("poster", next.poster);
      v.dataset.poster = next.poster;
      v.addEventListener("loadedmetadata", () => {
        v.currentTime = t;
        v.playbackRate = rate;
        if (wasPlaying) v.play().catch(() => {});
      }, { once: true });
      v.src = next.src;
      v.load();
      tagsPair.hidden = showingAll;
      tagsAll.hidden = !showingAll;
      card.classList.toggle("focus", !showingAll);
      label();
    });
    label();
    strip.insertBefore(btn, strip.firstChild);
  });

  // ── on-screen autoplay, lazy posters ──────────────────────────────
  // A visible clip loops; an off-screen one is paused. Posters are fetched
  // a screen ahead rather than all at once: the gallery has a few hundred.
  const revealPoster = v => {
    if (v.dataset.poster && !v.getAttribute("poster")) v.setAttribute("poster", v.dataset.poster);
  };
  if ("IntersectionObserver" in window && !reduced) {
    const near = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { revealPoster(entry.target); near.unobserve(entry.target); }
      });
    }, { rootMargin: "900px 0px" });
    videos.forEach(v => near.observe(v));
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const v = entry.target;
        if (entry.isIntersecting) {
          revealPoster(v);
          if (v.preload === "none") v.preload = "auto";
          if (!v.dataset.userPaused) v.play().catch(() => { v.controls = true; });
        } else {
          v.pause();
        }
      });
    }, { rootMargin: "160px 0px", threshold: 0.2 });
    videos.forEach(v => io.observe(v));
  } else {
    videos.forEach(v => { revealPoster(v); v.controls = true; v.preload = "metadata"; });
  }

  // ── filters (outcome × kind × family), one grid section at a time ─
  const state = { outcome: "all", kind: "all", family: "all" };
  const apply = () => {
    document.querySelectorAll(".card[data-outcome]").forEach(card => {
      const okOutcome = state.outcome === "all" || card.dataset.outcome === state.outcome;
      const okKind = state.kind === "all" || card.dataset.kind === state.kind;
      const okFamily = state.family === "all" || card.dataset.family === state.family;
      const show = okOutcome && okKind && okFamily;
      card.classList.toggle("hidden", !show);
      if (!show) card.querySelector("video").pause();
    });
    document.querySelectorAll(".armhead").forEach(head => {
      const grid = head.nextElementSibling;
      const any = grid && grid.querySelector(".card:not(.hidden)");
      head.style.display = any ? "" : "none";
      if (grid) grid.style.display = any ? "" : "none";
    });
    // A family heading with nothing left under it goes too.
    document.querySelectorAll("h2.family").forEach(h => {
      let el = h.nextElementSibling, any = false;
      while (el && !el.matches("h2.family")) {
        if (el.matches(".armhead") && el.style.display !== "none") { any = true; break; }
        el = el.nextElementSibling;
      }
      h.classList.toggle("hidden", !any);
    });
  };
  const pick = (chip, set) => chip.addEventListener("click", () => {
    set();
    chip.parentElement.querySelectorAll(".chip").forEach(c => {
      c.classList.toggle("active", c === chip);
      c.setAttribute("aria-pressed", String(c === chip));
    });
    apply();
  });
  document.querySelectorAll(".chip[data-filter-family]").forEach(chip => pick(chip, () => { state.family = chip.dataset.filterFamily; }));
  document.querySelectorAll(".chip[data-filter]").forEach(chip => pick(chip, () => { state.outcome = chip.dataset.filter; }));
  document.querySelectorAll(".chip[data-filter-kind]").forEach(chip => pick(chip, () => { state.kind = chip.dataset.filterKind; }));
  document.querySelectorAll(".chip[data-filter-family], .chip[data-filter], .chip[data-filter-kind]").forEach(c =>
    c.setAttribute("aria-pressed", String(c.classList.contains("active"))));

  const playAll = document.getElementById("playall");
  if (playAll) {
    playAll.addEventListener("click", () => {
      const visible = Array.from(document.querySelectorAll(".card:not(.hidden) video"))
        .filter(v => v.getBoundingClientRect().top < window.innerHeight * 3);
      const anyPaused = visible.some(v => v.paused);
      visible.forEach(v => {
        v.currentTime = 0;
        if (anyPaused) { delete v.dataset.userPaused; v.play().catch(() => {}); }
        else { v.dataset.userPaused = "1"; v.pause(); }
      });
      playAll.textContent = anyPaused ? "❚❚ Pause all visible" : "▶ Play all visible";
    });
  }

  // ── figure variants: a chip swaps the images it names ─────────────
  // data-swap lists image selectors and data-src their new sources, both
  // comma-separated and in the same order.
  document.querySelectorAll(".chip[data-swap]").forEach(chip => {
    chip.addEventListener("click", () => {
      const srcs = chip.dataset.src.split(",");
      chip.dataset.swap.split(",").forEach((sel, i) => {
        const img = document.querySelector(sel.trim());
        if (img && srcs[i]) img.src = srcs[i].trim();
      });
      chip.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
    });
  });

  // ── swarm videos: team size, view style and arm ───────────────────
  // Each video spans its whole episode in the same 16.5 s, so starting them
  // together lines up first steps and endings, not every step in between.
  // A video's data-swarm is its path with {style} ("mc_" for Minecraft, ""
  // for the network chart), {n} and {arm} left open; data-swarm-prov on its
  // caption maps "arm:n" or "n" to the episode shown. Chips and the restart
  // button act on the videos of their own [data-swarm-scope].
  const ARM_NAME = { plastic: "+Social plasticity", base: "Baseline (no social layer)" };
  document.querySelectorAll("[data-swarm-scope]").forEach(scope => {
    const swarm = Array.from(scope.querySelectorAll("video[data-swarm]"));
    if (!swarm.length) return;
    const st = { n: "15", style: "game", arm: "plastic" };
    const activeOf = attr => { const c = scope.querySelector(`.chip.active[${attr}]`); return c && c.getAttribute(attr); };
    st.n = activeOf("data-swarm-n") || st.n;
    st.style = activeOf("data-swarm-view") || st.style;
    st.arm = activeOf("data-swarm-arm") || st.arm;
    // play() resolves once a clip is actually running, so rewinding after
    // all have resolved lines them up even when one buffered longer.
    const restart = () => {
      Promise.all(swarm.map(v => {
        delete v.dataset.userPaused;
        return v.play().catch(() => { v.controls = true; });
      })).then(() => swarm.forEach(v => { v.currentTime = 0; }));
    };
    const show = () => {
      swarm.forEach(v => {
        const path = v.dataset.swarm
          .replace("{style}", st.style === "game" ? "mc_" : "")
          .replace("{n}", st.n)
          .replace("{arm}", st.arm);
        v.setAttribute("poster", path + ".jpg");
        v.src = path + ".mp4";
        v.load();
        if (v.dataset.swarmLabel) {
          v.setAttribute("aria-label", v.dataset.swarmLabel.replace("{n}", st.n).replace("{arm}", ARM_NAME[st.arm] || st.arm));
        }
        const fig = v.closest("figure");
        const prov = fig && fig.querySelector("[data-swarm-prov]");
        if (prov) {
          const map = JSON.parse(prov.dataset.swarmProv);
          const ep = map[`${st.arm}:${st.n}`] || map[st.n] || "";
          const tmpl = prov.dataset.swarmTemplate || "N = {n} · 2,600 tokens per agent · {ep}";
          prov.textContent = tmpl.replace("{n}", st.n).replace("{ep}", ep).replace("{arm}", ARM_NAME[st.arm] || st.arm);
        }
      });
      restart();
    };
    scope.querySelectorAll(".chip[data-swarm-n], .chip[data-swarm-view], .chip[data-swarm-arm]").forEach(chip => {
      chip.setAttribute("aria-pressed", String(chip.classList.contains("active")));
      chip.addEventListener("click", () => {
        if (chip.dataset.swarmN) st.n = chip.dataset.swarmN;
        else if (chip.dataset.swarmView) st.style = chip.dataset.swarmView;
        else st.arm = chip.dataset.swarmArm;
        chip.parentElement.querySelectorAll(".chip").forEach(c => {
          c.classList.toggle("active", c === chip);
          c.setAttribute("aria-pressed", String(c === chip));
        });
        show();
      });
    });
    scope.querySelectorAll("[data-swarm-restart]").forEach(b => b.addEventListener("click", restart));
  });

  // ── transcripts: a live chat that follows the clip ─────────────────
  // Clips replay at data-fps environment steps per second from data-t0, so
  // playback time maps straight onto message steps. A message appears when
  // the clip reaches its step and the panel scrolls to it; the reader's own
  // scrolling pauses that for a few seconds, and a loop or a click on a
  // message resets it.
  const RATES = [["1×", 1], ["½×", 0.5]];
  const DEFAULT_RATE = 1;
  const IDLE_MS = 4000;
  document.querySelectorAll(".card[data-t0]").forEach(card => {
    const v = card.querySelector("video");
    const list = card.querySelector(".chat ol");
    const head = card.querySelector(".chat-head");
    if (!v || !list) return;
    const t0 = +card.dataset.t0, fps = +card.dataset.fps || 6;
    const msgs = Array.from(list.querySelectorAll(".msg"));
    let last = null, pausedUntil = 0;

    const update = () => {
      const step = t0 + Math.floor(v.currentTime * fps);
      if (step === last) return;
      if (last !== null && step < last) pausedUntil = 0;   // the clip looped
      last = step;
      let latest = null, changed = false;
      msgs.forEach(m => {
        const on = +m.dataset.t <= step;
        if (m.classList.contains("on") !== on) changed = true;
        m.classList.toggle("on", on);
        m.classList.remove("now");
        if (on && !m.classList.contains("hidden")) latest = m;
      });
      if (latest) latest.classList.add("now");
      if (!changed || Date.now() < pausedUntil) return;
      if (latest) {
        list.scrollTo({ top: latest.offsetTop + latest.offsetHeight - list.clientHeight + 8, behavior: reduced ? "auto" : "smooth" });
      } else {
        list.scrollTo({ top: 0 });
      }
    };
    // Only the reader's own input pauses the follow; programmatic scrolls
    // also fire "scroll", so those are not listened to.
    ["wheel", "touchmove", "pointerdown"].forEach(ev =>
      list.addEventListener(ev, () => { pausedUntil = Date.now() + IDLE_MS; }, { passive: true }));

    const applyMode = mode => {
      msgs.forEach(m => m.classList.toggle("hidden", mode === "pair" && !m.classList.contains("partner")));
      last = null; pausedUntil = 0;
      update();
    };
    ["timeupdate", "seeked", "play"].forEach(ev => v.addEventListener(ev, update));
    msgs.forEach(m => m.addEventListener("click", () => {
      pausedUntil = 0;
      v.currentTime = Math.max(0, (+m.dataset.t - t0) / fps);
      v.play().catch(() => {});
    }));
    card.querySelectorAll(".chat-head .chip[data-chat]").forEach(chip => {
      chip.addEventListener("click", () => {
        chip.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
        applyMode(chip.dataset.chat);
      });
    });

    // Speed control, added here so the page without scripts stays clean.
    if (head) {
      const box = document.createElement("div");
      box.className = "chips speed";
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", "Playback speed");
      RATES.forEach(([label, rate]) => {
        const b = document.createElement("button");
        b.className = "chip" + (rate === DEFAULT_RATE ? " active" : "");
        b.type = "button";
        b.textContent = label;
        b.title = `${rate * fps} environment steps per second`;
        b.addEventListener("click", () => {
          v.playbackRate = rate;
          box.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === b));
        });
        box.appendChild(b);
      });
      head.appendChild(box);
    }
    v.playbackRate = DEFAULT_RATE;

    const active = card.querySelector(".chat-head .chip.active[data-chat]");
    applyMode(active ? active.dataset.chat : "all");
  });

  // ── in-page contents: mark the section being read ─────────────────
  const subLinks = Array.from(document.querySelectorAll(".subnav a[href^='#']"));
  const subTargets = subLinks.map(a => document.getElementById(a.getAttribute("href").slice(1)));
  if (subLinks.length) {
    const strip = document.querySelector(".subnav ul");
    let ticking = false, current = null;
    const spy = () => {
      ticking = false;
      const line = (navbar ? navbar.offsetHeight : 60) + (strip ? strip.offsetHeight : 0) + 40;
      let idx = -1;
      subTargets.forEach((t, i) => { if (t && t.getBoundingClientRect().top - line <= 0) idx = i; });
      if (idx === current) return;
      current = idx;
      subLinks.forEach((a, i) => {
        a.classList.toggle("active", i === idx);
        if (i === idx) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
      });
      const a = subLinks[idx];
      if (a && strip && strip.scrollWidth > strip.clientWidth) {
        strip.scrollTo({ left: a.offsetLeft - 16, behavior: reduced ? "auto" : "smooth" });
      }
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }

  // ── equations ─────────────────────────────────────────────────────
  const eqs = Array.from(document.querySelectorAll(".eq[data-tex]"));
  const typeset = () => {
    if (!window.katex) {
      eqs.forEach(el => { if (!el.textContent.trim()) { el.classList.add("raw"); el.textContent = el.dataset.tex; } });
      return;
    }
    eqs.forEach(el => {
      try { window.katex.render(el.dataset.tex, el, { displayMode: true, throwOnError: false }); }
      catch (err) { el.classList.add("raw"); el.textContent = el.dataset.tex; }
    });
  };
  if (eqs.length) {
    if (window.katex) typeset(); else window.addEventListener("load", () => setTimeout(typeset, 300));
  }

  // ── tables: say when there is more to the right ───────────────────
  const wraps = Array.from(document.querySelectorAll(".tablewrap"));
  wraps.forEach(w => {
    if (w.nextElementSibling && w.nextElementSibling.classList.contains("scroll-hint")) return;
    const hint = document.createElement("p");
    hint.className = "scroll-hint";
    hint.textContent = "Scroll the table sideways for every column →";
    w.after(hint);
  });
  const measure = () => wraps.forEach(w => w.classList.toggle("scrolls", w.scrollWidth > w.clientWidth + 2));
  if (wraps.length) { measure(); window.addEventListener("resize", measure); window.addEventListener("load", measure); }

  // ── figures: click to enlarge ─────────────────────────────────────
  // A transparent button over each figure image opens it in a dialog, fitted
  // to the screen, with an actual-size view for panning and the caption.
  const figs = Array.from(document.querySelectorAll("main .image img"));
  let box = null, lastTrigger = null;
  const buildBox = () => {
    box = document.createElement("dialog");
    box.className = "lightbox";
    box.setAttribute("aria-label", "Enlarged figure");
    box.innerHTML = '<div class="lb-bar"><span class="lb-title"></span>'
      + '<button type="button" class="lb-size" aria-pressed="false">Actual size</button>'
      + '<a class="lb-open" target="_blank" rel="noopener">Open image ↗</a>'
      + '<button type="button" class="lb-close">Close</button></div>'
      + '<div class="lb-body"><img alt=""></div><p class="lb-cap"></p>';
    document.body.appendChild(box);
    const body = box.querySelector(".lb-body");
    const size = box.querySelector(".lb-size");
    box.querySelector(".lb-close").addEventListener("click", () => box.close());
    size.addEventListener("click", () => {
      const actual = body.classList.toggle("actual");
      size.textContent = actual ? "Fit to screen" : "Actual size";
      size.setAttribute("aria-pressed", String(actual));
    });
    // A click on the backdrop (the dialog element itself) closes it.
    box.addEventListener("click", e => { if (e.target === box) box.close(); });
    box.addEventListener("close", () => {
      body.classList.remove("actual");
      size.textContent = "Actual size";
      size.setAttribute("aria-pressed", "false");
      if (lastTrigger) lastTrigger.focus();
    });
  };
  const openFig = (img, trigger) => {
    const src = img.currentSrc || img.src;
    if (typeof HTMLDialogElement !== "function") { window.open(src, "_blank", "noopener"); return; }
    if (!box) buildBox();
    lastTrigger = trigger;
    const fig = img.closest("figure");
    const cap = fig && fig.querySelector("figcaption");
    const strong = cap && cap.querySelector("strong");
    const big = box.querySelector(".lb-body img");
    big.src = src;
    big.alt = img.alt || "";
    box.querySelector(".lb-open").href = src;
    box.querySelector(".lb-title").textContent = strong ? strong.textContent.replace(/[.:]\s*$/, "") : (img.alt || "Figure");
    const capEl = box.querySelector(".lb-cap");
    capEl.innerHTML = cap ? cap.innerHTML.trim() : "";   // the page's own caption markup (sub/superscripts)
    capEl.hidden = !cap;
    box.showModal();
    box.querySelector(".lb-close").focus();
  };
  figs.forEach(img => {
    const holder = img.closest(".image");
    if (!holder || holder.querySelector(".zoom-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "zoom-btn";
    btn.setAttribute("aria-label", "Enlarge figure" + (img.alt ? ": " + img.alt : ""));
    btn.addEventListener("click", () => openFig(img, btn));
    holder.appendChild(btn);
  });

  // ── citation: copy to the clipboard ───────────────────────────────
  document.querySelectorAll("[data-copy]").forEach(btn => {
    const target = document.querySelector(btn.dataset.copy);
    const status = document.getElementById(btn.dataset.status || "");
    if (!target) return;
    btn.hidden = false;
    btn.addEventListener("click", () => {
      const text = target.textContent.trim();
      const done = ok => {
        btn.textContent = ok ? "Copied" : "Copy";
        if (status) status.textContent = ok ? "BibTeX copied to the clipboard." : "Select the text and copy it with Ctrl+C or ⌘C.";
        if (ok) setTimeout(() => { btn.textContent = "Copy"; }, 2200);
      };
      const fallback = () => {
        const r = document.createRange();
        r.selectNodeContents(target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        let ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        done(ok);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => done(true), fallback);
      } else {
        fallback();
      }
    });
  });

  // ── Code row: land on the repository link ─────────────────────────
  // Images above the target load lazily and push it down during a smooth
  // scroll, so jump instantly and re-align until the layout stops moving.
  const jumpTo = id => {
    const el = document.getElementById(id);
    if (!el) return;
    document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = "eager"; });
    let last = null, still = 0, tries = 0;
    const align = () => {
      const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 90);
      window.scrollTo({ top: y, behavior: "instant" });
      still = last !== null && Math.abs(y - last) < 2 ? still + 1 : 0;
      last = y;
      if (still < 3 && ++tries < 50) setTimeout(align, 100);
    };
    align();
    const row = el.querySelector(".code-row");
    if (row) { row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash"); }
  };
  document.querySelectorAll("a[href='#code']").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    history.replaceState(null, "", "#code");
    jumpTo("code");
  }));
  if (location.hash === "#code") window.addEventListener("load", () => jumpTo("code"));

  // ── links that have no URL yet ────────────────────────────────────
  document.querySelectorAll("a[data-needs-url]").forEach(a => {
    a.title = "Published with the arXiv release";
    a.setAttribute("aria-disabled", "true");
    a.textContent = a.textContent.trim() + " · coming soon";
    a.addEventListener("click", e => e.preventDefault());
  });
})();
