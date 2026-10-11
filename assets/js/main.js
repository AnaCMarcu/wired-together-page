/* Wired Together — project page behaviour.
   Play clips while they are on screen, filter the moment grids by outcome
   and kind, keep the sticky section buttons in step with scrolling, and
   typeset the equations. The page works with JavaScript off: every clip is
   then a poster frame with native controls one click away. */

(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const videos = Array.from(document.querySelectorAll(".card video"));

  // ── clips: on-screen autoplay, with a Stop/Play button ────────────
  // A clip the reader stopped stays stopped: the observer only restarts
  // clips it paused itself (off-screen), never one stopped by hand.
  videos.forEach(v => {
    v.controls = false;
    v.setAttribute("tabindex", "0");
    const heading = v.parentElement.querySelector("figcaption h3");
    if (heading && !v.hasAttribute("aria-label")) {
      v.setAttribute("aria-label", heading.textContent.trim() + " — click to play or stop");
    }
    const btn = document.createElement("button");
    btn.className = "vctl";
    btn.type = "button";
    const label = () => {
      btn.textContent = v.paused ? "▶ Play" : "■ Stop";
      btn.setAttribute("aria-label", v.paused ? "Play clip" : "Stop clip");
    };
    const stop = () => { v.dataset.userPaused = "1"; v.pause(); };
    const play = () => { delete v.dataset.userPaused; v.play().catch(() => { v.controls = true; }); };
    const toggle = () => (v.paused ? play() : stop());
    btn.addEventListener("click", e => { e.stopPropagation(); toggle(); });
    v.addEventListener("click", toggle);
    v.addEventListener("keydown", e => {
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

  // The hero loop is decorative: keep it silent and never show controls.
  const hero = document.querySelector("#hero video");
  if (hero && !reduced) hero.play().catch(() => { hero.style.display = "none"; });

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
  document.querySelectorAll(".chip[data-filter-family]").forEach(chip => {
    chip.addEventListener("click", () => {
      state.family = chip.dataset.filterFamily;
      chip.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
      apply();
    });
  });
  document.querySelectorAll(".chip[data-filter]").forEach(chip => {
    chip.addEventListener("click", () => {
      state.outcome = chip.dataset.filter;
      chip.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
      apply();
    });
  });
  document.querySelectorAll(".chip[data-filter-kind]").forEach(chip => {
    chip.addEventListener("click", () => {
      state.kind = chip.dataset.filterKind;
      chip.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
      apply();
    });
  });

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
      playAll.textContent = anyPaused ? "⏸ Pause all visible" : "▶ Play all visible";
    });
  }

  // ── figure variants: a chip swaps the image it names ──────────────
  document.querySelectorAll(".chip[data-swap]").forEach(chip => {
    chip.addEventListener("click", () => {
      const img = document.querySelector(chip.dataset.swap);
      if (!img) return;
      img.src = chip.dataset.src;
      chip.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
    });
  });

  // ── scaling: team size and view style for the two swarm videos ────
  // Each video spans its whole episode in the same 16.5 s, so starting them
  // together lines up first steps and endings, not every step in between.
  // A video's data-swarm is its path with {style} ("mc_" for Minecraft, ""
  // for the network chart) and {n} left open; data-swarm-prov maps team size
  // to the episode shown.
  const swarm = Array.from(document.querySelectorAll("video[data-swarm]"));
  const swarmState = { n: "15", style: "game" };
  // play() resolves once a clip is actually running, so rewinding after both
  // have resolved lines them up even when one buffered longer.
  const restartSwarm = () => {
    Promise.all(swarm.map(v => {
      delete v.dataset.userPaused;
      return v.play().catch(() => { v.controls = true; });
    })).then(() => swarm.forEach(v => { v.currentTime = 0; }));
  };
  const showSwarm = () => {
    swarm.forEach(v => {
      const path = v.dataset.swarm
        .replace("{style}", swarmState.style === "game" ? "mc_" : "")
        .replace("{n}", swarmState.n);
      v.setAttribute("poster", path + ".jpg");
      v.src = path + ".mp4";
      v.load();
      const prov = v.closest(".card").querySelector("[data-swarm-prov]");
      if (prov) {
        const ep = JSON.parse(prov.dataset.swarmProv)[swarmState.n] || "";
        prov.textContent = `N = ${swarmState.n} · 2,600 tokens per agent · ${ep}`;
      }
    });
    restartSwarm();
  };
  document.querySelectorAll(".chip[data-swarm-n], .chip[data-swarm-view]").forEach(chip => {
    chip.addEventListener("click", () => {
      if (chip.dataset.swarmN) swarmState.n = chip.dataset.swarmN;
      else swarmState.style = chip.dataset.swarmView;
      chip.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === chip));
      showSwarm();
    });
  });
  const swarmRestart = document.getElementById("swarm-restart");
  if (swarmRestart) swarmRestart.addEventListener("click", restartSwarm);

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
        list.scrollTo({ top: latest.offsetTop + latest.offsetHeight - list.clientHeight + 8, behavior: "smooth" });
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

  // ── sticky nav: highlight the section in view ─────────────────────
  const navLinks = Array.from(document.querySelectorAll("#navbar a[href^='#']"));
  const targets = navLinks.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if (targets.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    targets.forEach(t => spy.observe(t));
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

  // ── Code button: land on the repository link ──────────────────────
  // Images above the target load lazily and push it down during a smooth
  // scroll, so jump instantly and re-align until the layout stops moving.
  const jumpTo = id => {
    const el = document.getElementById(id);
    if (!el) return;
    document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = "eager"; });
    let last = null, still = 0, tries = 0;
    const align = () => {
      const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80);
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

  // ── downloads that have no URL yet ────────────────────────────────
  document.querySelectorAll(".dl[data-needs-url]").forEach(a => {
    a.title = "Published with the arXiv release";
    a.textContent = a.textContent.trim() + " · coming soon";
    a.addEventListener("click", e => e.preventDefault());
  });
})();
