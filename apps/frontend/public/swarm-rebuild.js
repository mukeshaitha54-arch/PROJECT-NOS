(() => {
  "use strict";

  const script =
    document.currentScript ||
    (typeof document !== "undefined"
      ? document.querySelector('script[src*="swarm-rebuild"]') ||
        document.querySelector("script[data-agents]")
      : null);
  const options = script ? script.dataset : {};
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const noop = () => {};
  let pagePointer = null;
  let nosShine = null;
  let nosText = null;
  let nosAgents = [];
  let lastNosPosition = "";

  function updateNosShine(agents = []) {
    nosShine ||= document.querySelector(".nos-shine");
    nosText ||= document.querySelector(".nos-glass");
    if (!nosShine || !nosText) return;

    const textNode = nosText.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    const rects = [];
    for (let index = 0; index < textNode.length; index += 1) {
      const range = document.createRange();
      range.setStart(textNode, index);
      range.setEnd(textNode, index + 1);
      rects.push(range.getBoundingClientRect());
    }

    let nearestDistance = 58;
    let nearestPoint = null;
    const inspectPoint = (x, y) => {
      for (const rect of rects) {
        const dx = Math.max(rect.left - x, 0, x - rect.right);
        const dy = Math.max(rect.top - y, 0, y - rect.bottom);
        const distance = Math.hypot(dx, dy);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPoint = { x, y };
        }
      }
    };

    for (const agent of agents) inspectPoint(agent.x, agent.y);
    if (pagePointer) inspectPoint(pagePointer.x, pagePointer.y);
    if (!nearestPoint) {
      nosShine.removeAttribute("data-active");
      lastNosPosition = "";
      return;
    }

    const bounds = nosShine.getBoundingClientRect();
    const x = `${nearestPoint.x - bounds.left}px`;
    const y = `${nearestPoint.y - bounds.top}px`;
    const position = `${x},${y}`;
    if (position !== lastNosPosition) {
      nosShine.style.setProperty("--nos-x", x);
      nosShine.style.setProperty("--nos-y", y);
      lastNosPosition = position;
    }
    nosShine.setAttribute("data-active", "");
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      pagePointer = { x: event.clientX, y: event.clientY };
      updateNosShine(nosAgents);
    },
    { passive: true },
  );

  function clearNosPointer() {
    pagePointer = null;
    if (motionPreference.matches) updateNosShine();
  }

  document.documentElement.addEventListener("mouseleave", clearNosPointer);
  window.addEventListener("blur", clearNosPointer);

  if (motionPreference.matches) {
    window.SwarmRebuild = {
      replay: noop,
      skip: noop,
      setSpeed: noop,
      tour: noop,
      layers: [],
    };
    return;
  }

  const agentNames = [
    "Ada",
    "Bo",
    "Cyd",
    "Dex",
    "Eli",
    "Fen",
    "Gus",
    "Hal",
    "Ivy",
    "Jun",
    "Kai",
    "Lux",
    "Mo",
    "Nia",
    "Oz",
    "Pip",
  ];
  const agentColors = [
    "#FF5C8A",
    "#FFC233",
    "#A970FF",
    "#2DD4BF",
    "#4ADE80",
    "#FF8A3D",
    "#38BDF8",
    "#F43F5E",
    "#C084FC",
    "#FACC15",
    "#34D399",
    "#60A5FA",
    "#FB7185",
    "#F97316",
    "#22D3EE",
    "#A3E635",
  ];
  const mediaTags = new Set([
    "IMG",
    "SVG",
    "CANVAS",
    "VIDEO",
    "AUDIO",
    "PICTURE",
    "INPUT",
    "TEXTAREA",
    "SELECT",
    "IFRAME",
    "HR",
    "PROGRESS",
    "METER",
    "OBJECT",
    "EMBED",
  ]);
  const skippedTags = new Set(["SCRIPT", "STYLE", "TEMPLATE", "META", "BR"]);
  const parsedAgents = Number.parseInt(options.agents || "14", 10);
  const requestedAgentCount = Math.max(
    1,
    Math.min(Number.isFinite(parsedAgents) ? parsedAgents : 14, 64),
  );
  let agentCount = Math.min(
    requestedAgentCount,
    window.innerWidth < 640 ? 8 : 64,
  );
  const configuredSpeed = Number.parseInt(options.speed || "1", 10);
  let speed = [1, 2, 4].includes(configuredSpeed) ? configuredSpeed : 1;
  const configuredLine = Number.parseFloat(options.line || "0.88");
  const buildLine = Number.isFinite(configuredLine)
    ? Math.min(0.98, Math.max(0.1, configuredLine))
    : 0.88;
  const background = options.bg || "#000";
  const accent = options.accent || "#3D8BFF";

  const injectedStyle = document.createElement("style");
  injectedStyle.dataset.srStyle = "";
  injectedStyle.textContent = `
    html.sr-lock { overflow: hidden !important; }
    #sr-root, #sr-agents, #sr-scan, #sr-hud { position: fixed !important; inset: 0 !important; }
    #sr-root, #sr-agents, #sr-scan { pointer-events: none !important; }
    #sr-hud { pointer-events: auto !important; }
    #sr-root { z-index: 2147483000 !important; }
    #sr-scan { z-index: 2147483001 !important; }
    #sr-agents { z-index: 2147483002 !important; }
    #sr-hud { z-index: 2147483003 !important; }
    #sr-root, #sr-agents { overflow: hidden !important; }
    #sr-root .sr-guides { position: absolute; inset: 0; width: 100%; height: 100%; }
    #sr-root .sr-frames { position: absolute; inset: 0; }
    #sr-agents .sr-agent {
      position: absolute; top: 0; left: 0; width: 18px; height: 21px;
      transform-origin: 0 0; will-change: transform; color: var(--sr-agent-color);
    }
    #sr-agents .sr-arrow, #sr-agents .sr-ibeam {
      position: absolute; top: 0; left: 0; width: 18px; height: 21px;
      overflow: visible; filter: drop-shadow(0 1px 2px rgba(0,0,0,.65));
    }
    #sr-agents .sr-arrow { opacity: 1; }
    #sr-agents .sr-ibeam { opacity: 0; }
    #sr-agents .sr-agent.sr-typing .sr-arrow { opacity: 0; }
    #sr-agents .sr-agent.sr-typing .sr-ibeam { opacity: 1; }
    #sr-agents .sr-name {
      position: absolute; top: 14px; left: 11px; display: none; padding: 2px 6px;
      border-radius: 999px; background: var(--sr-agent-color); color: #101116;
      font: 500 10.5px/1.35 "Geist", "Segoe UI", sans-serif; white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,.24);
    }
    #sr-agents .sr-agent.sr-working .sr-name { display: block; }
    #sr-root .sr-frame {
      position: absolute; top: 0; left: 0; width: 0; height: 0;
      border: 1px solid var(--sr-accent); opacity: 1;
      box-shadow: 0 0 0 1px rgba(0,0,0,.15);
      transition: opacity 250ms cubic-bezier(.23,1,.32,1);
    }
    #sr-root .sr-frame.sr-frame-out { opacity: 0; }
    #sr-root .sr-frame-handle {
      position: absolute; width: 7px; height: 7px; border: 1px solid var(--sr-accent);
      background: #fff; border-radius: 1px;
    }
    #sr-root .sr-handle-nw { top: -4px; left: -4px; }
    #sr-root .sr-handle-ne { top: -4px; right: -4px; }
    #sr-root .sr-handle-sw { bottom: -4px; left: -4px; }
    #sr-root .sr-handle-se { right: -4px; bottom: -4px; }
    #sr-root .sr-text-frame .sr-frame-handle { display: none; }
    #sr-root .sr-size-label {
      position: absolute; top: calc(100% + 6px); left: 50%; padding: 2px 5px;
      border-radius: 3px; background: var(--sr-accent); color: #fff;
      font: 400 10px/1.45 "Geist Mono", Consolas, monospace; white-space: nowrap;
      transform: translateX(-50%);
    }
    #sr-root .sr-caret {
      position: absolute; width: 2px; min-height: 15px; background: var(--sr-agent-color);
      box-shadow: 0 0 7px var(--sr-agent-color); pointer-events: none;
    }
    #sr-scan {
      display: grid; place-items: center; background: var(--sr-scan-bg);
      opacity: 1; visibility: visible; transition: opacity 550ms cubic-bezier(.23,1,.32,1);
      pointer-events: none;
    }
    #sr-scan.sr-scan-out { opacity: 0; }
    #sr-scan .sr-scan-card {
      width: 64px; height: 64px; display: grid; place-items: center;
      border: 1px solid rgba(255,255,255,.2); border-radius: 19px;
      background: rgba(255,255,255,.08); box-shadow: 0 0 80px rgba(61,139,255,.2);
      backdrop-filter: blur(14px); animation: sr-pulse 1.5s ease-in-out infinite;
    }
    #sr-scan .sr-scan-logo { width: 30px; height: 30px; display: grid; place-items: center; color: #fff; }
    #sr-scan .sr-scan-logo svg { width: 100%; height: 100%; color: #fff; }
    #sr-scan .sr-scan-fallback { width: 29px; height: 29px; fill: #fff; }
    @keyframes sr-pulse { 50% { transform: scale(1.055); box-shadow: 0 0 90px rgba(61,139,255,.34); } }
    #sr-hud {
      inset: auto auto max(18px, env(safe-area-inset-bottom)) 50% !important;
      width: max-content; max-width: calc(100vw - 24px); height: 48px;
      display: flex; align-items: center; gap: 12px; padding: 0 10px 0 12px;
      border: 1px solid rgba(255,255,255,.13); border-radius: 13px;
      background: rgba(22,23,27,.9); color: #e6e8ed;
      box-shadow: 0 12px 40px rgba(0,0,0,.4); backdrop-filter: blur(14px);
      transform: translateX(-50%); pointer-events: auto;
      font: 400 11px/1.25 "Geist", "Segoe UI", sans-serif;
    }
    #sr-hud .sr-avatars { display: flex; align-items: center; padding-left: 2px; }
    #sr-hud .sr-avatar {
      width: 21px; height: 21px; display: grid; place-items: center; margin-left: -4px;
      border: 1px solid rgba(22,23,27,.95); border-radius: 50%; color: #111318;
      font: 600 8px/1 "Geist", "Segoe UI", sans-serif;
    }
    #sr-hud .sr-hud-status { max-width: 260px; overflow: hidden; color: #d7d9df; white-space: nowrap; text-overflow: ellipsis; }
    #sr-hud .sr-agent-count { color: #8e95a5; }
    #sr-hud .sr-progress-track { width: 64px; height: 3px; overflow: hidden; border-radius: 4px; background: #383b43; }
    #sr-hud .sr-progress-fill { width: 0; height: 100%; border-radius: inherit; background: var(--sr-accent); transition: width 150ms linear; }
    #sr-hud button {
      min-width: 31px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
      gap: 5px; padding: 0 7px; border: 1px solid rgba(255,255,255,.12); border-radius: 7px;
      background: rgba(255,255,255,.06); color: #e6e8ed; cursor: pointer;
      font: 500 10px/1 "Geist", "Segoe UI", sans-serif;
      transition: background-color 140ms ease, transform 140ms cubic-bezier(.23,1,.32,1);
    }
    #sr-hud button:hover { background: rgba(255,255,255,.13); }
    #sr-hud button:active { transform: scale(.96); }
    #sr-hud button:focus-visible { outline: 2px solid #78adff; outline-offset: 2px; }
    #sr-hud .sr-hud-close { width: 28px; padding: 0; font-size: 15px; }
    .sr-hide-paint {
      background-color: transparent !important; background-image: none !important;
      border-color: transparent !important; box-shadow: none !important; outline: none !important;
    }
    .sr-hide-media { opacity: 0 !important; }
    .sr-rest {
      color: transparent !important; -webkit-text-fill-color: transparent !important;
      user-select: none !important;
    }
    .sr-w { font-variant-ligatures: none; }
    .sr-reveal {
      transition: background-color .45s ease, border-color .45s ease, box-shadow .6s ease, opacity .45s ease !important;
    }
    @media (max-width: 700px) {
      #sr-root .sr-guides { opacity: .8; }
    }
    @media (max-width: 560px) {
      #sr-hud { gap: 7px; height: 44px; padding-inline: 9px; }
      #sr-hud .sr-avatars, #sr-hud .sr-progress-track, #sr-hud .sr-agent-count { display: none; }
      #sr-hud .sr-hud-status { max-width: min(45vw, 190px); font-size: 10px; }
      #sr-hud button { min-width: 29px; height: 27px; padding-inline: 6px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #sr-scan, #sr-hud, #sr-root, #sr-agents { display: none !important; }
    }
  `;
  document.documentElement.append(injectedStyle);

  const root = document.createElement("div");
  root.id = "sr-root";
  root.innerHTML =
    '<canvas class="sr-guides" aria-hidden="true"></canvas><div class="sr-frames"></div>';
  root.style.setProperty("--sr-accent", accent);

  const scan = document.createElement("div");
  scan.id = "sr-scan";
  scan.setAttribute("aria-hidden", "true");
  scan.innerHTML =
    '<div class="sr-scan-card"><div class="sr-scan-logo"></div></div>';
  scan.style.setProperty("--sr-scan-bg", background);

  const agentLayer = document.createElement("div");
  agentLayer.id = "sr-agents";
  agentLayer.setAttribute("aria-hidden", "true");

  const hud = document.createElement("div");
  hud.id = "sr-hud";
  hud.innerHTML = `
    <div class="sr-avatars" aria-hidden="true"></div>
    <span class="sr-hud-status" aria-live="off">Scanning page...</span>
    <span class="sr-agent-count"></span>
    <div class="sr-progress-track" aria-hidden="true"><div class="sr-progress-fill"></div></div>
    <button class="sr-tour" type="button" aria-label="Tour the page">Tour</button>
    <button class="sr-speed" type="button" aria-label="Change build speed">1×</button>
    <button class="sr-hud-close" type="button" aria-label="Skip the build">×</button>`;
  const hudStatus = hud.querySelector(".sr-hud-status");
  const agentCountLabel = hud.querySelector(".sr-agent-count");
  const progressTrack = hud.querySelector(".sr-progress-track");
  const progressFill = hud.querySelector(".sr-progress-fill");
  const tourButton = hud.querySelector(".sr-tour");
  const speedButton = hud.querySelector(".sr-speed");
  const closeButton = hud.querySelector(".sr-hud-close");
  const avatarStack = hud.querySelector(".sr-avatars");
  const frames = root.querySelector(".sr-frames");
  const canvas = root.querySelector("canvas");
  const context = canvas.getContext("2d");

  document.documentElement.append(root, scan, agentLayer, hud);
  document.documentElement.style.setProperty("--sr-accent", accent);
  document.documentElement.classList.add("sr-lock");
  const previousScrollRestoration = history.scrollRestoration;
  history.scrollRestoration = "manual";

  const allAgents = Array.from({ length: requestedAgentCount }, (_, index) => {
    const color = agentColors[index % agentColors.length];
    const name = agentNames[index % agentNames.length];
    const element = document.createElement("div");
    element.className = "sr-agent";
    if (index >= agentCount) element.style.display = "none";
    element.style.setProperty("--sr-agent-color", color);
    element.innerHTML = `
      <svg class="sr-arrow" viewBox="0 0 18 21" aria-hidden="true">
        <path d="M0 0V16.5L4.6 12.4L7.6 19L10.4 17.8L7.5 11.3H13.4Z" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"></path>
      </svg>
      <svg class="sr-ibeam" viewBox="0 0 18 21" aria-hidden="true">
        <path d="M5 2h8M9 2v17M5 19h8" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"></path>
      </svg>
      <span class="sr-name">${name}</span>`;
    agentLayer.append(element);
    const avatar = document.createElement("span");
    avatar.className = "sr-avatar";
    avatar.textContent = name.slice(0, 1);
    avatar.style.backgroundColor = color;
    if (index < 5) avatarStack.append(avatar);
    return {
      index,
      name,
      element,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      targetX: 0,
      targetY: 0,
      angle: -135,
      targetAngle: -135,
      mode: "wander",
      task: null,
      wanderAt: 0,
      wanderX: Math.random() * window.innerWidth,
      wanderY: Math.random() * window.innerHeight * buildLine,
    };
  });
  let agents = allAgents.slice(0, agentCount);
  nosAgents = agents;

  const guideContext = context;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let pageLayers = [];
  let scanStartedAt = performance.now();
  let collectionFinishedAt = 0;
  let scanFadeAt = 0;
  let scanFinished = false;
  let finishedAt = 0;
  let finishedSeconds = 0;
  let layersCollected = false;
  let lastFrameAt = scanStartedAt;
  let guideOpacity = 0;
  let lastTaskAt = scanStartedAt;
  let lastScrollAt = -Infinity;
  let scrollPending = true;
  let lastTriggerReadAt = 0;
  let tourActive = false;
  let mousePresent = false;
  let mouseX = 0;
  let mouseY = 0;
  let mouseMovedAt = 0;
  let mouseDirectionX = 1;
  let mouseDirectionY = 0;
  let mousePreviousX = 0;
  let mousePreviousY = 0;
  let mouseHasPosition = false;
  let isExiting = false;
  let exitStartedAt = 0;
  let skipRequested = false;
  const frameRemovalQueue = [];
  const revealedLayers = new Set();
  const now = () => performance.now();

  function setHudStatus(text) {
    hudStatus.textContent = text;
  }

  function isVisiblePaint(color) {
    if (!color || color === "transparent") return false;
    const alphaMatch = color.match(/[,/]\s*([\d.]+%?)\s*\)$/);
    if (!alphaMatch) return true;
    const alpha = alphaMatch[1].endsWith("%")
      ? Number.parseFloat(alphaMatch[1]) / 100
      : Number.parseFloat(alphaMatch[1]);
    return Number.isFinite(alpha) && alpha > 0;
  }

  function isPainted(element, style) {
    const hasBackground =
      isVisiblePaint(style.backgroundColor) || style.backgroundImage !== "none";
    const shadowColor = style.boxShadow?.match(
      /rgba?\([^)]*\)|#[\da-f]{3,8}/i,
    )?.[0];
    const hasShadow =
      style.boxShadow &&
      style.boxShadow !== "none" &&
      isVisiblePaint(shadowColor);
    const borderVisible = ["Top", "Right", "Bottom", "Left"].some((side) => {
      const width = Number.parseFloat(style[`border${side}Width`]) || 0;
      return (
        width > 0 &&
        style[`border${side}Style`] !== "none" &&
        isVisiblePaint(style[`border${side}Color`])
      );
    });
    return hasBackground || hasShadow || borderVisible;
  }

  function isOurElement(element) {
    return (
      element.id?.startsWith("sr-") ||
      element.dataset.srStyle !== undefined ||
      element.className
        ?.toString()
        .split(/\s+/)
        .some((name) => name.startsWith("sr-") && name !== "sr-tn")
    );
  }

  function createTextLayer(element, parentLayer) {
    const value = element.textContent || "";
    if (!value.trim()) return null;
    return {
      element,
      parent: parentLayer,
      kind: "text",
      hasText: true,
      originalText: value,
      done: false,
      started: false,
      triggered: false,
      frame: null,
      caret: null,
    };
  }

  function collectLayers() {
    const layers = [];

    function visit(element, nearestLayer) {
      if (
        !(element instanceof Element) ||
        skippedTags.has(element.tagName) ||
        isOurElement(element)
      )
        return;
      if (
        element.hasAttribute("data-sr-skip") ||
        element.closest("[data-sr-skip]")
      )
        return;
      const style = getComputedStyle(element);
      if (style.display === "none") return;

      const media = mediaTags.has(element.tagName);
      const paint = !media && isPainted(element, style);
      const children = Array.from(element.childNodes);
      const elementChildren = children.filter(
        (node) => node.nodeType === Node.ELEMENT_NODE,
      );
      const hasLeafText =
        !elementChildren.length &&
        (element.textContent || "").trim().length > 0;
      let layer = null;

      if (media || paint || hasLeafText) {
        layer = {
          element,
          parent: nearestLayer,
          kind: media ? "media" : paint ? "box" : "text",
          hasText: hasLeafText && !media,
          originalText: hasLeafText && !media ? element.textContent || "" : "",
          done: false,
          started: false,
          triggered: false,
          frame: null,
          caret: null,
        };
        layers.push(layer);
      }

      if (media) return;
      const parentForChildren = layer || nearestLayer;
      if (elementChildren.length) {
        for (const child of children) {
          if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim()) {
            const textWrapper = document.createElement("span");
            textWrapper.className = "sr-tn";
            textWrapper.textContent = child.nodeValue;
            element.replaceChild(textWrapper, child);
            visit(textWrapper, parentForChildren);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            visit(child, parentForChildren);
          }
        }
      } else if (!layer && children.length) {
        for (const child of children) {
          if (child.nodeType === Node.ELEMENT_NODE)
            visit(child, parentForChildren);
        }
      }
    }

    visit(document.body, null);
    const counts = {
      layers: layers.length,
      texts: layers.filter((layer) => layer.hasText).length,
      frames: layers.filter(
        (layer) => layer.kind === "box" || layer.kind === "media",
      ).length,
      agents: agentCount,
    };
    document.querySelectorAll("[data-sr-stat]").forEach((element) => {
      const key = element.dataset.srStat;
      if (Object.hasOwn(counts, key))
        element.textContent = counts[key].toLocaleString();
    });

    for (const layer of layers) {
      if (layer.hasText) layer.originalText = layer.element.textContent || "";
      hideLayer(layer);
    }
    return layers;
  }

  function hideLayer(layer) {
    const element = layer.element;
    element.classList.remove("sr-reveal");
    if (layer.kind === "box") element.classList.add("sr-hide-paint");
    if (layer.kind === "media") element.classList.add("sr-hide-media");
    if (!layer.hasText) return;

    const wrapper = document.createElement("span");
    wrapper.className = "sr-w";
    const typed = document.createElement("span");
    typed.className = "sr-typed";
    const rest = document.createElement("span");
    rest.className = "sr-rest";
    rest.textContent = layer.originalText;
    wrapper.append(typed, rest);
    element.replaceChildren(wrapper);
    layer.wrapper = wrapper;
    layer.typed = typed;
    layer.rest = rest;
  }

  function restoreLayer(layer, keepReveal = false) {
    layer.element.classList.remove("sr-hide-paint", "sr-hide-media");
    if (!keepReveal) layer.element.classList.remove("sr-reveal");
    if (layer.hasText) {
      layer.element.textContent = layer.originalText;
      layer.wrapper = null;
      layer.typed = null;
      layer.rest = null;
    }
  }

  function copyLogoToScan() {
    const slot = scan.querySelector(".sr-scan-logo");
    slot.replaceChildren();
    const logo = document.querySelector("[data-sr-logo]");
    if (logo) {
      const clone = logo.cloneNode(true);
      clone.removeAttribute("id");
      clone.removeAttribute("data-sr-logo");
      clone.setAttribute("aria-hidden", "true");
      slot.append(clone);
    } else {
      const star = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      star.setAttribute("class", "sr-scan-fallback");
      star.setAttribute("viewBox", "0 0 32 32");
      star.innerHTML =
        '<path d="M16 1 19.8 12.2 31 16l-11.2 3.8L16 31l-3.8-11.2L1 16l11.2-3.8L16 1Z"></path>';
      slot.append(star);
    }
  }

  function makeFrame(layer, rect, text = false) {
    const frame = document.createElement("div");
    frame.className = `sr-frame${text ? " sr-text-frame" : ""}`;
    frame.style.setProperty("--sr-accent", accent);
    if (!text) {
      for (const corner of ["nw", "ne", "sw", "se"]) {
        const handle = document.createElement("span");
        handle.className = `sr-frame-handle sr-handle-${corner}`;
        frame.append(handle);
      }
    }
    const size = document.createElement("span");
    size.className = "sr-size-label";
    size.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    frame.append(size);
    frames.append(frame);
    layer.frame = frame;
    layer.sizeLabel = size;
    return frame;
  }

  function textRect(layer, end = false) {
    if (!layer.hasText || !layer.rest || !layer.typed)
      return layer.element.getBoundingClientRect();
    const range = document.createRange();
    const selected = end && layer.typed.textContent ? layer.typed : layer.rest;
    range.selectNodeContents(selected);
    const rects = Array.from(range.getClientRects());
    if (!rects.length) return layer.element.getBoundingClientRect();
    return end && layer.typed.textContent ? rects[rects.length - 1] : rects[0];
  }

  function frameRectFor(layer, rect, progress = 1) {
    if (!layer.frame) makeFrame(layer, rect, layer.kind === "text");
    const width = Math.max(0, rect.width * progress);
    const height = Math.max(0, rect.height * progress);
    layer.frame.style.left = `${rect.left}px`;
    layer.frame.style.top = `${rect.top}px`;
    layer.frame.style.width = `${width}px`;
    layer.frame.style.height = `${height}px`;
    if (layer.sizeLabel) {
      layer.sizeLabel.textContent = `${Math.round(width)} × ${Math.round(height)}`;
    }
  }

  function startTask(agent, layer, rect) {
    layer.started = true;
    layer.triggered = true;
    agent.mode = "build";
    const targetRect = layer.hasText ? textRect(layer) : rect;
    const frameRect = rect;
    agent.task = {
      layer,
      phase: "travel",
      elapsed: 0,
      phaseDuration: 1200 / speed,
      startX: agent.x,
      startY: agent.y,
      rect: frameRect,
    };
    agent.element.classList.add("sr-working");
    agent.element.classList.remove("sr-typing");
    agent.targetX = targetRect.left;
    agent.targetY = targetRect.top;
    lastTaskAt = now();
  }

  function eligibleParent(layer) {
    return !layer.parent || layer.parent.started || layer.parent.done;
  }

  function pendingTriggeredCount() {
    return pageLayers.filter(
      (layer) =>
        layer.triggered &&
        !layer.done &&
        !layer.started &&
        eligibleParent(layer),
    ).length;
  }

  function activeTaskCount() {
    return agents.reduce(
      (count, agent) => count + Number(Boolean(agent.task)),
      0,
    );
  }

  function finishLayerInstantly(layer) {
    if (layer.done) return;
    const owner = agents.find((agent) => agent.task?.layer === layer);
    if (owner) clearAgentTask(owner);
    restoreLayer(layer);
    layer.done = true;
    layer.started = true;
    layer.triggered = true;
    if (layer.frame) {
      layer.frame.remove();
      layer.frame = null;
    }
    if (layer.caret) {
      layer.caret.remove();
      layer.caret = null;
    }
  }

  function finishEverything(skipped = false) {
    tourActive = false;
    for (const agent of agents) if (agent.task) clearAgentTask(agent);
    for (const layer of pageLayers) finishLayerInstantly(layer);
    revealRemainingLayers();
    for (const pending of frameRemovalQueue) pending.frame.remove();
    frameRemovalQueue.length = 0;
    frames.replaceChildren();
    scan.classList.add("sr-scan-out");
    document.documentElement.classList.remove("sr-lock");
    history.scrollRestoration = previousScrollRestoration;
    scanFinished = true;
    scanFadeAt = now() - 550;
    if (skipped) {
      finishedAt = now();
      finishedSeconds = Math.max(0.1, (finishedAt - scanStartedAt) / 1000);
    }
    updateDoneState();
  }

  function revealRemainingLayers() {
    for (const layer of pageLayers) {
      if (!layer.done) finishLayerInstantly(layer);
    }
  }

  function clearAgentTask(agent) {
    const task = agent.task;
    if (task?.layer.frame) {
      task.layer.frame.remove();
      task.layer.frame = null;
    }
    if (task?.layer.caret) {
      task.layer.caret.remove();
      task.layer.caret = null;
    }
    agent.task = null;
    agent.element.classList.remove("sr-working", "sr-typing");
  }

  function revealLayer(layer) {
    layer.element.classList.remove("sr-hide-paint", "sr-hide-media");
    layer.element.classList.add("sr-reveal");
    layer.revealAt = now() + 800;
    revealedLayers.add(layer);
  }

  function updateDoneState() {
    const built = pageLayers.reduce(
      (count, layer) => count + Number(layer.done),
      0,
    );
    if (!layersCollected || built !== pageLayers.length || activeTaskCount())
      return false;
    if (!finishedAt) {
      finishedAt = now();
      finishedSeconds = Math.max(0.1, (finishedAt - scanStartedAt) / 1000);
    }
    tourActive = false;
    tourButton.textContent = "Replay";
    tourButton.setAttribute("aria-label", "Replay the page build");
    closeButton.setAttribute("aria-label", "Hide the cursor swarm");
    progressTrack.style.display = "none";
    agentCountLabel.textContent = "";
    setHudStatus(
      `Rebuilt ${pageLayers.length.toLocaleString()} layers in ${finishedSeconds.toFixed(1)}s`,
    );
    return true;
  }

  function beginScan() {
    scanStartedAt = now();
    scanFadeAt = 0;
    scanFinished = false;
    skipRequested = false;
    finishedAt = 0;
    finishedSeconds = 0;
    isExiting = false;
    agentLayer.style.display = "";
    hud.style.display = "";
    document.documentElement.append(root, scan, agentLayer, hud);
    scan.classList.remove("sr-scan-out");
    root.style.display = "";
    copyLogoToScan();
    document.documentElement.classList.add("sr-lock");
    history.scrollRestoration = "manual";
    for (const layer of pageLayers) {
      restoreLayer(layer);
      layer.done = false;
      layer.started = false;
      layer.triggered = false;
      layer.revealAt = 0;
      hideLayer(layer);
    }
    for (const agent of agents) {
      clearAgentTask(agent);
      agent.x = Math.random() * viewportWidth;
      agent.y = Math.random() * viewportHeight;
      agent.angle = -135;
      agent.wanderAt = 0;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    lastTaskAt = scanStartedAt;
    lastTriggerReadAt = 0;
    scrollPending = true;
    setHudStatus(`Scanning page... 0 layers`);
    agentCountLabel.textContent = "";
    progressTrack.style.display = "none";
    tourButton.textContent = "Tour";
    tourButton.setAttribute("aria-label", "Tour the page");
    closeButton.setAttribute("aria-label", "Skip the build");
  }

  function replay() {
    if (!layersCollected) return;
    beginScan();
  }

  function skip() {
    if (!layersCollected) {
      skipRequested = true;
      return;
    }
    finishEverything(true);
  }

  function setSpeed(nextSpeed) {
    const parsed = Number(nextSpeed);
    if (![1, 2, 4].includes(parsed)) return;
    const previousSpeed = speed;
    speed = parsed;
    for (const agent of agents) {
      if (agent.task) agent.task.phaseDuration *= previousSpeed / speed;
    }
    speedButton.textContent = `${speed}×`;
    speedButton.setAttribute(
      "aria-label",
      `Build speed ${speed} times; change build speed`,
    );
  }

  function toggleTour() {
    if (updateDoneState()) {
      replay();
      return;
    }
    tourActive = !tourActive;
    tourButton.textContent = tourActive ? "Pause" : "Tour";
    tourButton.setAttribute(
      "aria-label",
      tourActive ? "Pause the page tour" : "Tour the page",
    );
  }

  function hideFinishedSwarm() {
    if (!updateDoneState() || isExiting) return;
    isExiting = true;
    exitStartedAt = now();
    for (const agent of agents) {
      const distances = [
        { x: -40, y: agent.y, distance: agent.x },
        {
          x: viewportWidth + 40,
          y: agent.y,
          distance: viewportWidth - agent.x,
        },
        { x: agent.x, y: -40, distance: agent.y },
        {
          x: agent.x,
          y: viewportHeight + 40,
          distance: viewportHeight - agent.y,
        },
      ];
      const nearest = distances.reduce((best, candidate) =>
        candidate.distance < best.distance ? candidate : best,
      );
      agent.targetX = nearest.x;
      agent.targetY = nearest.y;
    }
  }

  function addScrollListeners() {
    window.addEventListener("wheel", stopTour, { passive: true });
    window.addEventListener("touchstart", stopTour, { passive: true });
    window.addEventListener("keydown", onTourKey);
  }

  function stopTour() {
    if (!tourActive) return;
    tourActive = false;
    tourButton.textContent = "Tour";
    tourButton.setAttribute("aria-label", "Tour the page");
  }

  function onTourKey(event) {
    if (
      ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"].includes(
        event.key,
      )
    )
      stopTour();
  }

  function updateAgentPosition(agent, dt) {
    const easing = 1 - Math.exp((-agent.ease * dt) / 1000);
    const previousX = agent.x;
    const previousY = agent.y;
    agent.x += (agent.targetX - agent.x) * easing;
    agent.y += (agent.targetY - agent.y) * easing;
    if (
      (agent.mode === "scan" || agent.mode === "mouse-trail") &&
      Math.hypot(agent.x - previousX, agent.y - previousY) > 0.01
    ) {
      agent.targetAngle = cursorRotation(
        agent.x - previousX,
        agent.y - previousY,
      );
    }
    const angleDelta = ((agent.targetAngle - agent.angle + 540) % 360) - 180;
    agent.angle += angleDelta * Math.min(1, dt / 90);
    agent.angle = (((agent.angle % 360) + 540) % 360) - 180;
    agent.element.style.transform = `translate3d(${agent.x}px, ${agent.y}px, 0) rotate(${agent.angle}deg)`;
  }

  function cursorRotation(dx, dy) {
    return (Math.atan2(dy, dx) * 180) / Math.PI + 135;
  }

  function chooseLayer(agent, rects) {
    let best = null;
    let bestScore = Infinity;
    for (const layer of pageLayers) {
      const rect = rects.get(layer);
      if (
        layer.done ||
        layer.started ||
        !layer.triggered ||
        !eligibleParent(layer) ||
        !rect
      )
        continue;
      const distance = Math.hypot(rect.left - agent.x, rect.top - agent.y);
      const score = rect.top + 0.3 * distance;
      if (score < bestScore) {
        best = layer;
        bestScore = score;
      }
    }
    return best;
  }

  function updateTriggers(rects, currentTime) {
    if (
      !scanFinished ||
      (currentTime - lastTriggerReadAt < 350 && !scrollPending)
    )
      return;
    lastTriggerReadAt = currentTime;
    scrollPending = false;
    const triggerY = viewportHeight * buildLine;
    for (const layer of pageLayers) {
      if (layer.done || layer.started) continue;
      const rect = rects.get(layer);
      if (!rect) continue;
      if (
        rect.bottom < -60 ||
        (rect.top <= triggerY &&
          (rect.width <= 0 ||
            rect.height <= 0 ||
            rect.right < 0 ||
            rect.left > viewportWidth))
      ) {
        finishLayerInstantly(layer);
        continue;
      }
      if (rect.top <= triggerY) layer.triggered = true;
    }
  }

  function getTargetRect(layer) {
    return layer.hasText && layer.rest
      ? textRect(layer)
      : layer.element.getBoundingClientRect();
  }

  function updateTask(agent, dt, rects) {
    const task = agent.task;
    if (!task) return;
    const layer = task.layer;
    let rect = rects.get(layer) || layer.element.getBoundingClientRect();
    if (layer.hasText && layer.rest)
      rect = layer.element.getBoundingClientRect();
    task.elapsed += dt;

    if (task.phase === "travel") {
      const target = getTargetRect(layer);
      agent.targetX = target.left;
      agent.targetY = target.top;
      agent.ease = 6 + 3 * speed;
      agent.targetAngle = cursorRotation(
        agent.targetX - agent.x,
        agent.targetY - agent.y,
      );
      if (
        Math.hypot(agent.targetX - agent.x, agent.targetY - agent.y) < 4 ||
        task.elapsed >= task.phaseDuration
      ) {
        agent.x = agent.targetX;
        agent.y = agent.targetY;
        task.elapsed = 0;
        frameRectFor(layer, rect, layer.kind === "text" ? 1 : 0);
        if (layer.kind === "box" || layer.kind === "media") {
          task.phase = "draw";
          const areaDuration = Math.min(
            340,
            Math.sqrt(Math.max(0, rect.width * rect.height)) / 1.6,
          );
          task.phaseDuration = (220 + areaDuration) / speed;
        } else {
          task.phase = "type";
          task.phaseDuration =
            Math.min(1300, Math.max(250, layer.originalText.length * 18)) /
            speed;
          agent.element.classList.add("sr-typing");
          layer.caret = document.createElement("div");
          layer.caret.className = "sr-caret";
          layer.caret.style.setProperty(
            "--sr-agent-color",
            agentColors[agent.index % agentColors.length],
          );
          root.append(layer.caret);
        }
      }
      return;
    }

    if (task.phase === "draw") {
      const rawProgress = Math.min(1, task.elapsed / task.phaseDuration);
      const progress = 1 - Math.pow(1 - rawProgress, 3);
      rect = layer.element.getBoundingClientRect();
      frameRectFor(layer, rect, progress);
      agent.targetX = rect.left + rect.width * progress;
      agent.targetY = rect.top + rect.height * progress;
      agent.ease = 12;
      agent.targetAngle = cursorRotation(
        agent.targetX - agent.x,
        agent.targetY - agent.y,
      );
      if (rawProgress >= 1) {
        frameRectFor(layer, rect, 1);
        revealLayer(layer);
        task.phase = "fill";
        task.elapsed = 0;
        task.phaseDuration = 320 / speed;
      }
      return;
    }

    if (task.phase === "fill") {
      const wiggle = Math.sin(task.elapsed / 34) * 4;
      agent.targetX = rect.left + rect.width + wiggle;
      agent.targetY = rect.top + rect.height + Math.cos(task.elapsed / 38) * 3;
      agent.ease = 15;
      agent.targetAngle = cursorRotation(
        agent.targetX - agent.x,
        agent.targetY - agent.y,
      );
      if (task.elapsed >= task.phaseDuration) {
        if (layer.hasText) {
          task.phase = "type";
          task.elapsed = 0;
          task.phaseDuration =
            Math.min(1300, Math.max(250, layer.originalText.length * 18)) /
            speed;
          agent.element.classList.add("sr-typing");
          layer.caret = document.createElement("div");
          layer.caret.className = "sr-caret";
          layer.caret.style.setProperty(
            "--sr-agent-color",
            agentColors[agent.index % agentColors.length],
          );
          root.append(layer.caret);
        } else {
          task.phase = "hold";
          task.elapsed = 0;
          task.phaseDuration = 160 / speed;
        }
      }
      return;
    }

    if (task.phase === "type") {
      const textLength = layer.originalText.length;
      const progress = Math.min(1, task.elapsed / task.phaseDuration);
      const characterCount =
        progress >= 1 ? textLength : Math.floor(progress * textLength);
      layer.typed.textContent = layer.originalText.slice(0, characterCount);
      layer.rest.textContent = layer.originalText.slice(characterCount);
      const caretRect = textRect(layer, true);
      agent.targetX = caretRect.right;
      agent.targetY = caretRect.top;
      agent.ease = 15;
      agent.targetAngle = cursorRotation(
        agent.targetX - agent.x,
        agent.targetY - agent.y,
      );
      if (layer.caret) {
        layer.caret.style.left = `${caretRect.right}px`;
        layer.caret.style.top = `${caretRect.top}px`;
        layer.caret.style.height = `${Math.max(12, caretRect.height)}px`;
      }
      if (progress >= 1) {
        task.phase = "hold";
        task.elapsed = 0;
        task.phaseDuration = 160 / speed;
      }
      return;
    }

    if (task.phase === "hold" && task.elapsed >= task.phaseDuration) {
      restoreLayer(layer, true);
      layer.done = true;
      layer.started = true;
      if (layer.frame) {
        layer.frame.classList.add("sr-frame-out");
        frameRemovalQueue.push({ frame: layer.frame, removeAt: now() + 250 });
        layer.frame = null;
      }
      if (layer.caret) {
        layer.caret.remove();
        layer.caret = null;
      }
      agent.task = null;
      agent.element.classList.remove("sr-working", "sr-typing");
      lastTaskAt = now();
    }
  }

  function updateIdleAgent(agent, dt, currentTime, freeSwarm) {
    if (freeSwarm && mousePresent && !isExiting) {
      const sinceMove = currentTime - mouseMovedAt;
      if (sinceMove < 350) {
        agent.mode = "mouse-trail";
        const lag = 34 + (agent.index % 5) * 11;
        const spread = (((agent.index * 37) % 60) - 30) * 0.9;
        agent.targetX =
          mouseX - mouseDirectionX * lag - mouseDirectionY * spread;
        agent.targetY =
          mouseY - mouseDirectionY * lag + mouseDirectionX * spread;
        agent.ease = 3.2 + (agent.index % 4) * 0.9;
        agent.targetAngle = cursorRotation(
          agent.targetX - agent.x,
          agent.targetY - agent.y,
        );
      } else {
        agent.mode = "mouse-ring";
        const angle =
          (Math.PI * 2 * agent.index) / agentCount +
          (currentTime / 1000) * 0.35;
        const radius = Math.max(46, agentCount * 4.4);
        agent.targetX = mouseX + Math.cos(angle) * radius;
        agent.targetY = mouseY + Math.sin(angle) * radius;
        agent.ease = 5;
        agent.targetAngle = cursorRotation(mouseX - agent.x, mouseY - agent.y);
      }
      return;
    }

    if (isExiting) {
      agent.mode = "exit";
      agent.ease = 8;
      agent.targetAngle = cursorRotation(
        agent.targetX - agent.x,
        agent.targetY - agent.y,
      );
      return;
    }
    if (currentTime >= agent.wanderAt) {
      agent.wanderAt = currentTime + 1200 + Math.random() * 2000;
      agent.wanderX = Math.random() * viewportWidth;
      agent.wanderY = Math.random() * viewportHeight * buildLine;
    }
    agent.mode = "wander";
    agent.targetX = agent.wanderX;
    agent.targetY = agent.wanderY;
    agent.ease = 1.4;
    agent.targetAngle = -135;
  }

  function updateScanAgents(currentTime) {
    const elapsed = currentTime - scanStartedAt;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const radiusX = Math.min(viewportWidth * 0.32, 230);
    const radiusY = Math.min(viewportHeight * 0.28, 170);
    const flockDuration = 1900 / speed;
    for (const agent of agents) {
      agent.mode = "scan";
      const flock = Math.floor(
        agent.index / Math.max(1, Math.ceil(agentCount / 3)),
      );
      const direction = flock === 1 ? -1 : 1;
      const phase =
        (agent.index * Math.PI * 2) / agentCount +
        (elapsed / flockDuration) * Math.PI * 2 * direction;
      agent.targetX =
        centerX +
        Math.cos(phase) * radiusX +
        Math.sin(elapsed / 90 + agent.index) * 10;
      agent.targetY =
        centerY +
        Math.sin(phase) * radiusY +
        Math.cos(elapsed / 100 + agent.index) * 10;
      agent.ease = 5.5;
      agent.targetAngle = cursorRotation(
        agent.targetX - agent.x,
        agent.targetY - agent.y,
      );
    }
  }

  function drawGuides(activeLayers, currentTime, dt) {
    if (!guideContext) return;
    const hasWork = activeTaskCount() > 0;
    if (hasWork) {
      guideOpacity = Math.min(1, guideOpacity + dt / 180);
      lastTaskAt = currentTime;
    } else if (currentTime - lastTaskAt > 1200) {
      guideOpacity = Math.max(0, guideOpacity - dt / 350);
    }
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (
      canvas.width !== Math.round(viewportWidth * ratio) ||
      canvas.height !== Math.round(viewportHeight * ratio)
    ) {
      canvas.width = Math.round(viewportWidth * ratio);
      canvas.height = Math.round(viewportHeight * ratio);
    }
    guideContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    guideContext.clearRect(0, 0, viewportWidth, viewportHeight);
    if (!guideOpacity) return;
    guideContext.save();
    guideContext.globalAlpha = guideOpacity;

    const lineY = viewportHeight * buildLine;
    guideContext.strokeStyle = "#FF453A";
    guideContext.fillStyle = "#FF453A";
    guideContext.lineWidth = 1;
    guideContext.beginPath();
    guideContext.moveTo(0, lineY);
    guideContext.lineTo(viewportWidth, lineY);
    guideContext.stroke();
    guideContext.font = '9px "Geist Mono", Consolas, monospace';
    guideContext.textAlign = "right";
    guideContext.fillText("BUILD LINE", viewportWidth - 8, lineY - 5);

    for (const layer of activeLayers) {
      if (!layer.frame) continue;
      const x = Number.parseFloat(layer.frame.style.left) || 0;
      const y = Number.parseFloat(layer.frame.style.top) || 0;
      guideContext.strokeStyle = accent;
      guideContext.globalAlpha = guideOpacity * 0.55;
      guideContext.setLineDash([2, 3]);
      guideContext.beginPath();
      guideContext.moveTo(x, y);
      guideContext.lineTo(0, y);
      guideContext.moveTo(x, y);
      guideContext.lineTo(x, 0);
      guideContext.stroke();
      guideContext.setLineDash([]);
      guideContext.globalAlpha = guideOpacity;
    }

    if (viewportWidth >= 700) {
      const rulerSize = 20;
      guideContext.fillStyle = "rgba(17,18,22,.96)";
      guideContext.fillRect(0, 0, viewportWidth, rulerSize);
      guideContext.fillRect(0, 0, rulerSize, viewportHeight);
      for (let x = 0; x <= viewportWidth; x += 10) {
        const major100 = x % 100 === 0;
        const major50 = x % 50 === 0;
        guideContext.strokeStyle = "rgba(205,211,224,.48)";
        guideContext.lineWidth = 1;
        guideContext.beginPath();
        guideContext.moveTo(x + 0.5, rulerSize);
        guideContext.lineTo(x + 0.5, major100 ? 0 : major50 ? 13 : 16);
        guideContext.stroke();
        if (major100) {
          guideContext.fillStyle = "#a3aab9";
          guideContext.font = '9px "Geist Mono", Consolas, monospace';
          guideContext.textAlign = "left";
          guideContext.fillText(String(x), x + 3, 10);
        }
      }
      for (let y = 0; y <= viewportHeight; y += 10) {
        const pageY = Math.max(0, Math.round(y + window.scrollY));
        const major100 = pageY % 100 < 10;
        const major50 = pageY % 50 < 10;
        guideContext.strokeStyle = "rgba(205,211,224,.48)";
        guideContext.beginPath();
        guideContext.moveTo(rulerSize, y + 0.5);
        guideContext.lineTo(major100 ? 0 : major50 ? 13 : 16, y + 0.5);
        guideContext.stroke();
        if (major100 && y > 24) {
          guideContext.save();
          guideContext.translate(11, y + 3);
          guideContext.rotate(-Math.PI / 2);
          guideContext.fillStyle = "#a3aab9";
          guideContext.font = '9px "Geist Mono", Consolas, monospace';
          guideContext.textAlign = "left";
          guideContext.fillText(String(pageY), 0, 0);
          guideContext.restore();
        }
      }
      for (const layer of activeLayers) {
        if (!layer.frame) continue;
        const x = Number.parseFloat(layer.frame.style.left) || 0;
        const y = Number.parseFloat(layer.frame.style.top) || 0;
        const width = Number.parseFloat(layer.frame.style.width) || 0;
        const height = Number.parseFloat(layer.frame.style.height) || 0;
        guideContext.fillStyle = "rgba(61,139,255,.3)";
        guideContext.fillRect(
          Math.max(20, x),
          0,
          Math.max(0, width - Math.max(0, 20 - x)),
          rulerSize,
        );
        guideContext.fillRect(
          0,
          Math.max(20, y),
          rulerSize,
          Math.max(0, height - Math.max(0, 20 - y)),
        );
      }
    }
    guideContext.restore();
  }

  function updateHud() {
    if (!layersCollected) return;
    if (!scanFinished && collectionFinishedAt) {
      const count = Math.min(
        pageLayers.length,
        Math.round(
          ((now() - scanStartedAt) / Math.max(1, 1900 / speed)) *
            pageLayers.length,
        ),
      );
      setHudStatus(`Scanning page... ${count.toLocaleString()} layers`);
      progressTrack.style.display = "block";
      progressFill.style.width = `${pageLayers.length ? (count / pageLayers.length) * 100 : 100}%`;
      return;
    }
    if (scanFinished && !updateDoneState()) {
      progressTrack.style.display = "block";
      const built = pageLayers.reduce(
        (count, layer) => count + Number(layer.done),
        0,
      );
      const pending = pageLayers.length - built;
      agentCountLabel.textContent = `${agentCount} agents`;
      setHudStatus(
        viewportWidth < 560
          ? `${built.toLocaleString()} / ${pageLayers.length.toLocaleString()} layers`
          : `${agentCount} agents  ${built.toLocaleString()} / ${pageLayers.length.toLocaleString()} layers`,
      );
      progressFill.style.width = `${((pageLayers.length - pending) / pageLayers.length) * 100}%`;
      tourButton.textContent = tourActive ? "Pause" : "Tour";
    }
  }

  function updateTour(dt) {
    if (!tourActive || !scanFinished) return;
    const rootElement = document.documentElement;
    const maxScroll = Math.max(0, rootElement.scrollHeight - viewportHeight);
    if (window.scrollY >= maxScroll - 1) {
      stopTour();
      return;
    }
    if (pendingTriggeredCount() < agentCount * 0.6) {
      window.scrollTo({
        top: Math.min(maxScroll, window.scrollY + (240 * speed * dt) / 1000),
        behavior: "instant",
      });
      scrollPending = true;
    }
  }

  function animate(currentTime) {
    const dt = Math.min(50, Math.max(0, currentTime - lastFrameAt));
    lastFrameAt = currentTime;
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;

    if (!scanFinished) {
      updateScanAgents(currentTime);
      const introComplete = currentTime - scanStartedAt >= 1900 / speed;
      if (introComplete && collectionFinishedAt) {
        if (!scanFadeAt) {
          scanFadeAt = currentTime;
          scan.classList.add("sr-scan-out");
        } else if (currentTime - scanFadeAt >= 550) {
          scan.remove();
          scanFinished = true;
          document.documentElement.classList.remove("sr-lock");
          history.scrollRestoration = previousScrollRestoration;
          scrollPending = true;
          lastTriggerReadAt = 0;
        }
      }
    } else if (layersCollected) {
      const rects = new Map();
      for (const layer of pageLayers) {
        if (!layer.done)
          rects.set(layer, layer.element.getBoundingClientRect());
      }
      updateTriggers(rects, currentTime);
      for (const agent of agents) {
        if (!agent.task) {
          const next = chooseLayer(agent, rects);
          if (next) startTask(agent, next, rects.get(next));
        }
      }
      for (const agent of agents) if (agent.task) updateTask(agent, dt, rects);
      updateTour(dt);
      updateDoneState();

      const freeSwarm =
        activeTaskCount() === 0 &&
        pendingTriggeredCount() === 0 &&
        currentTime - lastScrollAt > 500 &&
        !tourActive;
      for (const agent of agents) {
        if (!agent.task) updateIdleAgent(agent, dt, currentTime, freeSwarm);
      }
      const activeLayers = agents
        .filter((agent) => agent.task?.layer.frame)
        .map((agent) => agent.task.layer);
      drawGuides(activeLayers, currentTime, dt);

      for (let index = frameRemovalQueue.length - 1; index >= 0; index -= 1) {
        if (currentTime >= frameRemovalQueue[index].removeAt) {
          frameRemovalQueue[index].frame.remove();
          frameRemovalQueue.splice(index, 1);
        }
      }
      for (const layer of revealedLayers) {
        if (layer.revealAt && currentTime >= layer.revealAt) {
          layer.element.classList.remove("sr-reveal");
          layer.revealAt = 0;
          revealedLayers.delete(layer);
        }
      }
      if (isExiting && currentTime - exitStartedAt >= 1800) {
        agentLayer.style.display = "none";
        hud.style.display = "none";
        isExiting = false;
      }
    } else {
      updateScanAgents(currentTime);
    }

    for (const agent of agents) {
      if (!agent.task) agent.targetAngle = agent.targetAngle || -135;
      updateAgentPosition(agent, dt);
    }
    updateNosShine(agents);
    updateHud();
    requestAnimationFrame(animate);
  }

  function onScroll() {
    lastScrollAt = now();
    scrollPending = true;
  }

  function onResize() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    const nextAgentCount = Math.min(
      requestedAgentCount,
      viewportWidth < 640 ? 8 : 64,
    );
    if (nextAgentCount < agentCount) {
      for (const agent of allAgents.slice(nextAgentCount, agentCount)) {
        if (agent.task) {
          agent.task.layer.started = false;
          clearAgentTask(agent);
        }
        agent.element.style.display = "none";
      }
    } else if (nextAgentCount > agentCount) {
      for (const agent of allAgents.slice(agentCount, nextAgentCount))
        agent.element.style.display = "";
    }
    agentCount = nextAgentCount;
    agents = allAgents.slice(0, agentCount);
    nosAgents = agents;
    if (layersCollected) {
      const statLayer = pageLayers.find((layer) =>
        layer.element.matches('[data-sr-stat="agents"]'),
      );
      if (statLayer) {
        statLayer.originalText = agentCount.toLocaleString();
        if (statLayer.rest) {
          statLayer.typed.textContent = "";
          statLayer.rest.textContent = statLayer.originalText;
        } else {
          statLayer.element.textContent = statLayer.originalText;
        }
      }
      agentCountLabel.textContent = scanFinished ? `${agentCount} agents` : "";
    }
    scrollPending = true;
  }

  function onPointerMove(event) {
    if (event.pointerType !== "mouse") return;
    if (!mouseHasPosition) {
      mousePresent = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
      mousePreviousX = event.clientX;
      mousePreviousY = event.clientY;
      mouseMovedAt = now();
      mouseHasPosition = true;
      return;
    }
    const dx = event.clientX - mousePreviousX;
    const dy = event.clientY - mousePreviousY;
    const distance = Math.hypot(dx, dy);
    mousePresent = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (distance > 2) {
      const nextX = dx / distance;
      const nextY = dy / distance;
      const blend = Math.min(1, distance / 40);
      const mixedX = mouseDirectionX + (nextX - mouseDirectionX) * blend;
      const mixedY = mouseDirectionY + (nextY - mouseDirectionY) * blend;
      const magnitude = Math.hypot(mixedX, mixedY) || 1;
      mouseDirectionX = mixedX / magnitude;
      mouseDirectionY = mixedY / magnitude;
      mouseMovedAt = now();
    }
    mousePreviousX = event.clientX;
    mousePreviousY = event.clientY;
  }

  function collectAfterLoad() {
    const fontsReady = document.fonts?.ready
      ? document.fonts.ready.catch((error) => {
          console.error(
            "Swarm Rebuild could not wait for document fonts:",
            error,
          );
        })
      : Promise.resolve();
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 1200));
    Promise.race([fontsReady, timeout]).then(() => {
      pageLayers = collectLayers();
      layersCollected = true;
      collectionFinishedAt = now();
      copyLogoToScan();
      progressTrack.style.display = "block";
      agentCountLabel.textContent = "";
      setHudStatus(`Scanning page... 0 layers`);
      window.SwarmRebuild.layers = pageLayers;
      if (skipRequested) {
        finishEverything(true);
        return;
      }
    });
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      skip();
    }
  }

  function onAgentClose() {
    if (updateDoneState()) hideFinishedSwarm();
    else skip();
  }

  function cycleSpeed() {
    setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1);
  }

  copyLogoToScan();
  setSpeed(speed);
  hud.style.display = "flex";
  progressTrack.style.display = "none";
  agentCountLabel.textContent = "";
  history.scrollRestoration = "manual";
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => {
    mousePresent = false;
  });
  window.addEventListener("blur", () => {
    mousePresent = false;
  });
  window.addEventListener("keydown", onKeydown);
  addScrollListeners();
  tourButton.addEventListener("click", toggleTour);
  speedButton.addEventListener("click", cycleSpeed);
  closeButton.addEventListener("click", onAgentClose);
  document.addEventListener("click", (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-sr-replay]")
    )
      replay();
  });

  if (document.readyState === "complete") collectAfterLoad();
  else window.addEventListener("load", collectAfterLoad, { once: true });

  function destroy() {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("wheel", stopTour);
    window.removeEventListener("touchstart", stopTour);
    window.removeEventListener("keydown", onTourKey);
    window.removeEventListener("keydown", onKeydown);
    window.removeEventListener("blur", clearNosPointer);
    try {
      root.remove();
    } catch (e) {}
    try {
      scan.remove();
    } catch (e) {}
    try {
      agentLayer.remove();
    } catch (e) {}
    try {
      hud.remove();
    } catch (e) {}
    try {
      injectedStyle.remove();
    } catch (e) {}
    document.documentElement.classList.remove("sr-lock");
    history.scrollRestoration = previousScrollRestoration;
    for (const layer of pageLayers) {
      try {
        restoreLayer(layer);
      } catch (e) {}
    }
  }

  window.SwarmRebuild = {
    replay,
    skip,
    setSpeed,
    tour: toggleTour,
    layers: pageLayers,
    destroy,
  };
  requestAnimationFrame(animate);
})();
