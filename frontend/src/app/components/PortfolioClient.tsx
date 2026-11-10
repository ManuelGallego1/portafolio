"use client";

import React from "react";
import {
  T,
  md,
  resolveJobDate,
  USES,
  PLACES,
  SHOTS,
  SUMMARY,
  JOB_KEYS,
  PROJ_KEYS,
  KONAMI,
  SKILLS,
} from "./portfolioData";
import { drawBuddyFrame } from "./stickmanBuddy";
import {
  MoveEvent,
  GameSessionToken,
  LeaderboardEntry,
  SubmitScoreResponse,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
  placeFoodDeterministic,
  dirToCode,
  getPlayerToken,
  isValidUsername,
  savePlayerToken,
} from "./snakeAntiCheat";

interface PortfolioProps {
  accent?: string;
  photoStyle?: string;
  showBuddy?: boolean;
  customCursor?: boolean;
  showGrid?: boolean;
  showGlow?: boolean;
}

interface PortfolioState {
  lang: "es" | "en";
  mobile: boolean;
  wide: boolean;
  menuOpen: boolean;
  showTop: boolean;
  toast: string;
  sent: boolean;
  loading: boolean;
  loaderOut: boolean;
  skill: string | null;
  gameOpen: boolean;
  projIdx: number;
  projNoAnim?: boolean;
  hoverP?: string | null;
  quoteIdx: number;
  projPaused: boolean;
  quotePaused: boolean;
  pv: number;
  // Live config synced with backend
  cfgAccent: string;
  cfgPhotoStyle: string;
  cfgShowBuddy: boolean;
  cfgCustomCursor: boolean;
  cfgShowGrid: boolean;
  cfgShowGlow: boolean;
  // Snake Global Leaderboard & Anti-Cheat state
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  gameOver: boolean;
  gameOverScore: number;
  canSubmitScore: boolean;
  playerUsername: string;
  submittingScore: boolean;
  submitStatus: { ok?: boolean; msg: string } | null;
}

export default class PortfolioClient extends React.Component<
  PortfolioProps,
  PortfolioState
> {
  state: PortfolioState = {
    lang: "es",
    mobile: false,
    wide: true,
    menuOpen: false,
    showTop: false,
    toast: "",
    sent: false,
    loading: true,
    loaderOut: false,
    skill: null,
    gameOpen: false,
    projIdx: 0,
    projNoAnim: false,
    hoverP: null,
    quoteIdx: 0,
    projPaused: false,
    quotePaused: false,
    pv: 3,
    cfgAccent: this.props.accent ?? "Lima",
    cfgPhotoStyle: this.props.photoStyle ?? "ASCII",
    cfgShowBuddy: this.props.showBuddy ?? true,
    cfgCustomCursor: this.props.customCursor ?? true,
    cfgShowGrid: this.props.showGrid ?? true,
    cfgShowGlow: this.props.showGlow ?? false,
    leaderboard: [],
    leaderboardLoading: false,
    gameOver: false,
    gameOverScore: 0,
    canSubmitScore: false,
    playerUsername: "",
    submittingScore: false,
    submitStatus: null,
  };

  rootRef = React.createRef<HTMLDivElement>();
  contentRef = React.createRef<HTMLDivElement>();
  canvasRef = React.createRef<HTMLCanvasElement>();
  buddyRef = React.createRef<HTMLCanvasElement>();
  gameRef = React.createRef<HTMLCanvasElement>();

  _acc: string | null = null;
  _accT = 0;
  buddy: any = null;
  mxy: { x: number; y: number; t: number } | null = null;
  buddyClick: { x: number; y: number; t: number } | null = null;
  img: HTMLImageElement | null = null;
  imgReady = false;
  grid: any = null;
  crop: any = null;
  boundCanvas: HTMLCanvasElement | null = null;
  start: number | null = null;
  mouse = { x: 0, y: 0, on: false, r: 0 };
  raf = 0;
  io: IntersectionObserver | null = null;
  ioFired = false;
  revealFallback: any = null;
  cur: any = null;
  carT: any = null;
  quoteT: any = null;
  snapT: any = null;
  gameT: any = null;
  loadT: any = null;
  toastT: any = null;
  projTouched = 0;
  quoteTouched = 0;
  tx = 0;
  tiltEl: HTMLElement | null = null;
  kseq: string[] = [];
  logoTaps: number[] = [];
  gameCanvas: HTMLCanvasElement | null = null;
  game: any = null;
  activeSession: GameSessionToken | null = null;

  onResize: any;
  onResizePv: any;
  onScroll: any;
  onTiltLeave: any;
  onBuddyMove: any;
  onBuddyDown: any;
  onBuddyLeave: any;
  onDocMove: any;
  onDocLeave: any;

  accentNow(el: HTMLElement | null) {
    if (!el) return "#D4FF3A";
    const now = performance.now();
    if (!this._acc || now - this._accT > 500) {
      this._acc =
        getComputedStyle(el).getPropertyValue("--accent").trim() || "#D4FF3A";
      this._accT = now;
    }
    return this._acc;
  }

  drawBuddy(t: number) {
    drawBuddyFrame(this, t);
  }

  logoTap = () => {
    const now = Date.now();
    this.logoTaps = this.logoTaps.filter((t) => now - t < 2000).concat(now);
    if (this.logoTaps.length >= 5) {
      this.logoTaps = [];
      this.openGame();
    }
  };

  async fetchSiteConfig() {
    try {
      const res = await fetch("/api/config");
      if (!res.ok) return;
      const data = await res.json();
      this._acc = null;
      this.setState({
        cfgAccent: data.accent || "Lima",
        cfgPhotoStyle: data.photo_style || "ASCII",
        cfgShowBuddy: data.show_buddy ?? true,
        cfgCustomCursor: data.custom_cursor ?? true,
        cfgShowGrid: data.show_grid ?? true,
        cfgShowGlow: data.show_glow ?? false,
      });
    } catch {
      // Backend optional during static preview
    }
  }

  async fetchLeaderboard() {
    this.setState({ leaderboardLoading: true });
    try {
      const res = await fetch("/api/game/leaderboard?limit=25");
      if (res.ok) {
        const data = await res.json();
        this.setState({ leaderboard: data, leaderboardLoading: false });
      } else {
        this.setState({ leaderboardLoading: false });
      }
    } catch {
      this.setState({ leaderboardLoading: false });
    }
  }

  async requestNewGameSession(): Promise<GameSessionToken | null> {
    try {
      const res = await fetch("/api/game/start", { method: "POST" });
      if (!res.ok) return null;
      const tok: GameSessionToken = await res.json();
      this.activeSession = tok;
      return tok;
    } catch {
      this.activeSession = null;
      return null;
    }
  }

  openGame() {
    const savedUser =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("mg-snake-user")) ||
      "";
    this.setState({
      gameOpen: true,
      menuOpen: false,
      gameOver: false,
      canSubmitScore: false,
      gameOverScore: 0,
      playerUsername: savedUser,
      submitStatus: null,
    });
    this.game = null;
    this.fetchLeaderboard();
  }

  closeGame = () => {
    this.setState({
      gameOpen: false,
      gameOver: false,
      canSubmitScore: false,
      submitStatus: null,
    });
    clearInterval(this.gameT);
    this.game = null;
    this.gameCanvas = null;
  };

  async initGame(c: HTMLCanvasElement) {
    this.gameCanvas = c;
    const N = 20,
      best = +(localStorage.getItem("mg-snake-best") || 0);
    // Request a fresh cryptographically signed session from backend
    const tok = await this.requestNewGameSession();
    const initialSeed = tok ? tok.seed >>> 0 : (Math.random() * 0xffffffff) >>> 0;

    this.game = {
      N,
      snake: [
        { x: 9, y: 10 },
        { x: 8, y: 10 },
        { x: 7, y: 10 },
      ],
      dir: { x: 1, y: 0 },
      next: { x: 1, y: 0 },
      food: { x: 14, y: 10 },
      score: 0,
      best,
      over: false,
      started: false,
      tick: 0,
      seed: initialSeed,
      rngState: initialSeed,
      moves: [] as MoveEvent[],
      lastRecordedDir: "R",
    };

    if (!(c as any)._touchBound) {
      (c as any)._touchBound = true;
      let sx = 0,
        sy = 0;
      c.addEventListener(
        "touchstart",
        (e) => {
          const t = e.touches[0];
          sx = t.clientX;
          sy = t.clientY;
          if (this.game && this.game.over) this.resetGame();
        },
        { passive: true }
      );
      c.addEventListener("touchend", (e) => {
        const t = e.changedTouches[0],
          dx = t.clientX - sx,
          dy = t.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
        this.steer(
          Math.abs(dx) > Math.abs(dy)
            ? { x: Math.sign(dx), y: 0 }
            : { x: 0, y: Math.sign(dy) }
        );
      });
    }

    clearInterval(this.gameT);
    this.gameT = setInterval(() => this.stepGame(), 105);
  }

  async resetGame() {
    const best = this.game ? this.game.best : +(localStorage.getItem("mg-snake-best") || 0);
    this.setState({
      gameOver: false,
      canSubmitScore: false,
      gameOverScore: 0,
      submitStatus: null,
    });
    if (this.gameCanvas) {
      await this.initGame(this.gameCanvas);
      if (this.game) this.game.best = best;
    }
  }

  steer(d: { x: number; y: number }) {
    const g = this.game;
    if (!g || g.over) return;
    if (d.x === -g.dir.x && d.y === -g.dir.y) return;
    g.next = d;
    g.started = true;
  }

  placeFood() {
    const g = this.game;
    if (!g) return;
    const res = placeFoodDeterministic(g.rngState, g.snake, g.N);
    g.food = res.food;
    g.rngState = res.rngState;
  }

  stepGame() {
    const g = this.game;
    if (!g) return;
    if (g.started && !g.over) {
      const nextCode = dirToCode(g.next);
      // Record move at exact tick when direction changes or on tick 0
      if (g.tick === 0 || nextCode !== g.lastRecordedDir) {
        g.moves.push({ t: g.tick, d: nextCode });
        g.lastRecordedDir = nextCode;
      }
      g.dir = g.next;
      const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
      if (
        head.x < 0 ||
        head.y < 0 ||
        head.x >= g.N ||
        head.y >= g.N ||
        g.snake.some((s: any) => s.x === head.x && s.y === head.y)
      ) {
        g.over = true;
        g.totalTicks = g.tick + 1;
        if (g.score > g.best) {
          g.best = g.score;
          try {
            localStorage.setItem("mg-snake-best", String(g.best));
          } catch {}
        }
        this.setState({
          gameOver: true,
          gameOverScore: g.score,
          canSubmitScore: g.score > 0,
        });
        this.fetchLeaderboard();
      } else {
        g.snake.unshift(head);
        if (head.x === g.food.x && head.y === g.food.y) {
          g.score += 10;
          this.placeFood();
        } else {
          g.snake.pop();
        }
        g.tick += 1;
      }
    }
    this.drawGame();
  }

  submitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    const g = this.game;
    const tok = this.activeSession;
    const en = this.state.lang === "en";
    const username = this.state.playerUsername.trim();
    if (!g || !g.over || g.score <= 0 || !username) return;
    const fail = (msg: string) =>
      this.setState({ submittingScore: false, submitStatus: { ok: false, msg } });

    if (!isValidUsername(username)) {
      fail(
        en
          ? `Use ${USERNAME_MIN}-${USERNAME_MAX} letters or numbers (single . _ - allowed between them).`
          : `Usa ${USERNAME_MIN}-${USERNAME_MAX} letras o números (se permite . _ - entre ellos).`
      );
      return;
    }
    if (!tok) {
      fail(
        en
          ? "Offline session. Restart to connect to server."
          : "Sesión sin conexión. Reinicia para conectar al servidor."
      );
      return;
    }

    this.setState({ submittingScore: true, submitStatus: null });
    try {
      localStorage.setItem("mg-snake-user", username);
    } catch {}

    try {
      const res = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: tok.session_id,
          signature: tok.signature,
          username,
          claimed_score: g.score,
          total_ticks: g.totalTicks || g.tick + 1,
          moves: g.moves,
          player_token: getPlayerToken(username),
        }),
      });

      if (!res.ok) {
        const messages: Record<number, string> = en
          ? {
              409: "That name is already taken. Choose another one.",
              422: "That name is not allowed. Try another one.",
              429: "Too many attempts. Wait a moment.",
            }
          : {
              409: "Ese nombre ya está en uso. Elige otro.",
              422: "Ese nombre no está permitido. Prueba con otro.",
              429: "Demasiados intentos. Espera un momento.",
            };
        fail(
          messages[res.status] ??
            (en
              ? "The game could not be verified."
              : "La partida no pudo verificarse.")
        );
        return;
      }

      const data: SubmitScoreResponse = await res.json();
      if (data.player_token) savePlayerToken(username, data.player_token);
      const rankMsg = en
        ? data.improved
          ? `Verified & saved! Global rank #${data.rank}`
          : `Verified. Your best (${data.score} pts) is still rank #${data.rank}`
        : data.improved
        ? `¡Jugada verificada! Puesto mundial #${data.rank}`
        : `Verificada. Tu récord (${data.score} pts) sigue en el puesto #${data.rank}`;
      this.setState({
        submittingScore: false,
        canSubmitScore: false,
        submitStatus: { ok: true, msg: rankMsg },
      });
      this.fetchLeaderboard();
    } catch {
      this.setState({
        submittingScore: false,
        submitStatus: {
          ok: false,
          msg: en
            ? "Could not reach verification server"
            : "No se pudo conectar al servidor de verificación",
        },
      });
    }
  };

  drawGame() {
    const c = this.gameCanvas,
      g = this.game;
    if (!c || !g) return;
    const dpr = window.devicePixelRatio || 1,
      W = Math.round(c.clientWidth * dpr);
    if (!W) return;
    if (c.width !== W) {
      c.width = W;
      c.height = W;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const cs = W / g.N;
    const accent =
      getComputedStyle(c).getPropertyValue("--accent").trim() || "#D4FF3A";
    const en = this.state.lang === "en";
    ctx.fillStyle = "#09090B";
    ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = "#1F1F23";
    for (let x = 0; x < g.N; x++)
      for (let y = 0; y < g.N; y++)
        ctx.fillRect(
          x * cs + cs / 2 - dpr,
          y * cs + cs / 2 - dpr,
          2 * dpr,
          2 * dpr
        );
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 150);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#FAFAFA";
    ctx.shadowColor = "#FAFAFA";
    ctx.shadowBlur = 12 * dpr;
    ctx.fillRect(
      g.food.x * cs + cs * 0.22,
      g.food.y * cs + cs * 0.22,
      cs * 0.56,
      cs * 0.56
    );
    ctx.globalAlpha = 1;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 14 * dpr;
    g.snake.forEach((s: any, i: number) => {
      ctx.fillStyle = accent;
      ctx.globalAlpha = Math.max(0.35, 1 - i / (g.snake.length + 6));
      ctx.fillRect(
        s.x * cs + 1.5 * dpr,
        s.y * cs + 1.5 * dpr,
        cs - 3 * dpr,
        cs - 3 * dpr
      );
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.font = `500 ${13 * dpr}px 'Geist Mono', monospace`;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#A1A1AA";
    ctx.fillText(
      (en ? "score " : "puntos ") + g.score,
      12 * dpr,
      10 * dpr
    );
    ctx.textAlign = "right";
    ctx.fillText(
      (en ? "best " : "récord ") + g.best,
      W - 12 * dpr,
      10 * dpr
    );
    ctx.textAlign = "left";
    if (!g.started) {
      ctx.fillStyle = "rgba(9,9,11,0.7)";
      ctx.fillRect(0, 0, W, W);
      ctx.textAlign = "center";
      ctx.fillStyle = accent;
      ctx.font = `500 ${26 * dpr}px 'Geist', sans-serif`;
      ctx.fillText(">snake_", W / 2, W / 2 - 26 * dpr);
      ctx.font = `400 ${12 * dpr}px 'Geist Mono', monospace`;
      ctx.fillStyle = "#A1A1AA";
      ctx.fillText(
        en ? "press an arrow to start" : "presiona una flecha para empezar",
        W / 2,
        W / 2 + 14 * dpr
      );
      ctx.textAlign = "left";
    }
  }

  onKey = (e: KeyboardEvent) => {
    const k = (e.key || "").toLowerCase();
    const tag = ((e.target as HTMLElement) && (e.target as HTMLElement).tagName) || "";
    const inInput = tag === "INPUT" || tag === "TEXTAREA";

    if (this.state.gameOpen) {
      if (k === "escape") {
        this.closeGame();
        return;
      }
      if (inInput) return;
      const dirs: Record<string, { x: number; y: number }> = {
        arrowup: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        d: { x: 1, y: 0 },
      };
      if (dirs[k]) {
        e.preventDefault();
        this.steer(dirs[k]);
      } else if (k === " ") {
        e.preventDefault();
        if (this.game && this.game.over) this.resetGame();
      }
      return;
    }
    if (inInput) return;
    this.kseq = (this.kseq || []).concat(k).slice(-KONAMI.length);
    if (this.kseq.join() === KONAMI.join()) {
      this.kseq = [];
      this.openGame();
    }
  };

  onTiltMove = (e: PointerEvent) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const target = e.target as HTMLElement | null;
    const card =
      target && target.closest
        ? (target.closest("[data-tilt]") as HTMLElement | null)
        : null;
    if (this.tiltEl && this.tiltEl !== card) this.resetTilt();
    if (!card) return;
    this.tiltEl = card;
    const r = card.getBoundingClientRect(),
      px = (e.clientX - r.left) / r.width,
      py = (e.clientY - r.top) / r.height;
    card.style.transition =
      "border-color .2s, opacity .3s, box-shadow .3s, transform .12s ease-out";
    card.style.transform = `perspective(900px) rotateX(${
      (0.5 - py) * 4
    }deg) rotateY(${(px - 0.5) * 5}deg) translateY(-3px)`;
    card.style.setProperty("--gx", px * 100 + "%");
    card.style.setProperty("--gy", py * 100 + "%");
    card.style.setProperty("--go", "1");
  };

  resetTilt() {
    const c = this.tiltEl;
    if (!c) return;
    c.style.transition =
      "border-color .2s, opacity .3s, box-shadow .3s, transform .6s cubic-bezier(.2,.7,.2,1)";
    c.style.transform = "";
    c.style.setProperty("--go", "0");
    this.tiltEl = null;
  }

  copyEmail = () => {
    const email = "alejandrogallego030@gmail.com";
    const done = () => {
      this.setState({
        toast: T[this.state.lang === "en" ? "en" : "es"].ui.copied,
      });
      clearTimeout(this.toastT);
      this.toastT = setTimeout(() => this.setState({ toast: "" }), 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(email).then(done, done);
    else {
      const ta = document.createElement("textarea");
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      ta.remove();
      done();
    }
  };

  copyPhone = () => {
    const num = "+573105346818";
    const lang = this.state.lang === "en" ? "en" : "es";
    const done = () => {
      this.setState({ toast: T[lang].ui.phoneCopied });
      clearTimeout(this.toastT);
      this.toastT = setTimeout(() => this.setState({ toast: "" }), 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(num).then(done, done);
    else {
      const ta = document.createElement("textarea");
      ta.value = num;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      ta.remove();
      done();
    }
  };

  openWa = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const url = e.currentTarget.href;
    const lang = this.state.lang === "en" ? "en" : "es";
    let w: Window | null = null;
    try {
      w = window.open(url, "_blank", "noopener,noreferrer");
    } catch {}
    if (!w) {
      try {
        if (window.top) {
          window.top.location.href = url;
          return;
        }
      } catch {}
    }
    if (!w) {
      try {
        navigator.clipboard && navigator.clipboard.writeText("+573105346818");
      } catch {}
      this.setState({
        toast:
          lang === "en"
            ? "Number copied: +57 310 534 6818"
            : "Número copiado: +57 310 534 6818",
      });
      clearTimeout(this.toastT);
      this.toastT = setTimeout(() => this.setState({ toast: "" }), 2600);
    }
  };

  onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const name = String(f.get("name") || "");
    const email = String(f.get("email") || "");
    const message = String(f.get("message") || "");

    // Save message in backend database for Admin inbox
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
    } catch {}

    const subject = "Portafolio · " + name;
    const body = message + "\n\n— " + name + " (" + email + ")";
    window.location.href =
      "mailto:alejandrogallego030@gmail.com?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);
    this.setState({ sent: true });
    formEl.reset();
  };

  onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = this.rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
  };

  setLang(lang: "es" | "en") {
    try {
      localStorage.setItem("mg-lang", lang);
    } catch {}
    if (lang === this.state.lang) return;
    const c = this.contentRef.current;
    if (!c) {
      this.setState({ lang });
      return;
    }
    c.style.opacity = "0";
    c.style.filter = "blur(4px)";
    setTimeout(() => {
      this.setState({ lang, menuOpen: false }, () => {
        requestAnimationFrame(() => {
          c.style.opacity = "1";
          c.style.filter = "none";
        });
      });
    }, 220);
  }

  componentDidMount() {
    const savedLang =
      (typeof localStorage !== "undefined" &&
        (localStorage.getItem("mg-lang") as "es" | "en")) ||
      "es";
    const m = window.innerWidth < 760;
    const w = window.innerWidth >= 900;
    const pv = window.innerWidth < 760 ? 1 : window.innerWidth < 1060 ? 2 : 3;
    this.setState({ lang: savedLang, mobile: m, wide: w, pv });

    this.fetchSiteConfig();

    this.img = new Image();
    this.img.onload = () => {
      this.imgReady = true;
      this.grid = null;
    };
    this.img.src = "/assets/manuel.jpg";
    this.mouse = { x: 0, y: 0, on: false, r: 0 };
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      this.draw(t);
      this.tickCursor();
      this.drawBuddy(t);
    };
    this.raf = requestAnimationFrame(loop);
    this.setupReveal();
    this.setupCursor();
    this.syncGlobals();

    this.onResize = () => {
      const m = window.innerWidth < 760,
        w = window.innerWidth >= 900;
      if (m !== this.state.mobile || w !== this.state.wide)
        this.setState({
          mobile: m,
          wide: w,
          menuOpen: m && this.state.menuOpen,
        });
    };
    this.carT = setInterval(() => {
      const s = this.state;
      const busy =
        s.projPaused || s.hoverP || Date.now() - (this.projTouched || 0) < 9000;
      if (!busy && !document.hidden) this.stepProj(1);
    }, 5000);
    this.quoteT = setInterval(() => {
      const s = this.state,
        n = T.es.quotes.length;
      if (
        !s.quotePaused &&
        !document.hidden &&
        Date.now() - (this.quoteTouched || 0) > 10000
      )
        this.setState({ quoteIdx: (s.quoteIdx + 1) % n });
    }, 7500);
    this.onResizePv = () => {
      const pv =
        window.innerWidth < 760 ? 1 : window.innerWidth < 1060 ? 2 : 3;
      if (pv !== this.state.pv) this.setState({ pv });
    };
    window.addEventListener("resize", this.onResizePv);
    this.onScroll = () => {
      const s = window.scrollY > 700;
      if (s !== this.state.showTop) this.setState({ showTop: s });
    };
    window.addEventListener("resize", this.onResize);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("keydown", this.onKey);
    document.addEventListener("pointermove", this.onTiltMove);
    this.onTiltLeave = () => this.resetTilt();
    document.documentElement.addEventListener("mouseleave", this.onTiltLeave);
    this.onBuddyMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      this.mxy = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    this.onBuddyDown = (e: PointerEvent) => {
      this.buddyClick = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    this.onBuddyLeave = () => {
      this.mxy = null;
    };
    document.addEventListener("pointermove", this.onBuddyMove);
    document.addEventListener("pointerdown", this.onBuddyDown);
    document.documentElement.addEventListener("mouseleave", this.onBuddyLeave);

    if (this.state.loading) {
      const c = this.contentRef.current;
      if (c) {
        c.style.transition = "none";
        c.style.opacity = "0";
        c.style.transform = "translateY(16px) scale(0.99)";
        c.style.filter = "blur(8px)";
      }
      this.loadT = setTimeout(() => {
        this.setState({ loaderOut: true });
        if (c)
          setTimeout(() => {
            c.style.transition =
              "opacity 1.1s cubic-bezier(.2,.7,.2,1), transform 1.1s cubic-bezier(.2,.7,.2,1), filter 1.1s cubic-bezier(.2,.7,.2,1)";
            c.style.opacity = "1";
            c.style.transform = "none";
            c.style.filter = "none";
            setTimeout(() => {
              c.style.transition = "opacity .22s ease, filter .22s ease";
              c.style.transform = "";
            }, 1200);
          }, 250);
        this.loadT = setTimeout(() => this.setState({ loading: false }), 1000);
      }, 1400);
    }
  }

  componentDidUpdate() {
    const gc = this.gameRef.current;
    if (this.state.gameOpen && gc && gc !== this.gameCanvas) this.initGame(gc);
    this.setupReveal();
    this.syncGlobals();
    this.formatCounters();
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.raf);
    this.io && this.io.disconnect();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResizePv);
    clearInterval(this.carT);
    clearInterval(this.quoteT);
    clearTimeout(this.snapT);
    window.removeEventListener("keydown", this.onKey);
    document.removeEventListener("pointermove", this.onTiltMove);
    document.documentElement.removeEventListener(
      "mouseleave",
      this.onTiltLeave
    );
    document.removeEventListener("pointermove", this.onBuddyMove);
    document.removeEventListener("pointerdown", this.onBuddyDown);
    document.documentElement.removeEventListener(
      "mouseleave",
      this.onBuddyLeave
    );
    clearInterval(this.gameT);
    clearTimeout(this.loadT);
    clearTimeout(this.toastT);
    this.teardownCursor();
  }

  syncGlobals() {
    const root = this.rootRef.current;
    if (root)
      document.documentElement.style.setProperty(
        "--accent",
        getComputedStyle(root).getPropertyValue("--accent").trim()
      );
    const want = this.state.cfgCustomCursor ?? true;
    if (want && !this.cur) this.setupCursor();
    if (!want && this.cur) this.teardownCursor();
  }

  setupReveal() {
    const root = this.rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!this.io)
      this.io = new IntersectionObserver(
        (entries) => {
          this.ioFired = true;
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            const el = en.target as HTMLElement;
            el.style.opacity = "1";
            el.style.transform = "none";
            el.style.filter = "none";
            el.querySelectorAll("[data-count]").forEach((c) =>
              this.runCounter(c as HTMLElement)
            );
            this.io?.unobserve(el);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
    root.querySelectorAll("[data-reveal]").forEach((node) => {
      const el = node as HTMLElement;
      if (el.dataset.rv) return;
      el.dataset.rv = "1";
      if (reduce) {
        el.querySelectorAll("[data-count]").forEach((c) =>
          this.runCounter(c as HTMLElement, true)
        );
        return;
      }
      el.style.opacity = "0";
      el.style.transform = "translateY(28px)";
      el.style.filter = "blur(6px)";
      el.style.transition =
        "opacity .9s cubic-bezier(.2,.7,.2,1), transform .9s cubic-bezier(.2,.7,.2,1), filter .9s cubic-bezier(.2,.7,.2,1)";
      this.io?.observe(el);
    });
    clearTimeout(this.revealFallback);
    this.revealFallback = setTimeout(() => {
      if (this.ioFired) return;
      root.querySelectorAll("[data-reveal]").forEach((node) => {
        const el = node as HTMLElement;
        if (el.style.opacity === "0") {
          el.style.opacity = "1";
          el.style.transform = "none";
          el.style.filter = "none";
          el.querySelectorAll("[data-count]").forEach((c) =>
            this.runCounter(c as HTMLElement, true)
          );
        }
      });
    }, 3000);
  }

  fmt(n: number, el: HTMLElement) {
    return (
      n.toLocaleString(this.state.lang === "es" ? "es-CO" : "en-US") +
      (el.dataset.suffix || "")
    );
  }

  runCounter(el: HTMLElement, instant?: boolean) {
    if (el.dataset.done) return;
    const target = +(el.dataset.count || 0),
      dur = 1600,
      t0 = performance.now();
    if (instant) {
      el.dataset.done = "1";
      el.textContent = this.fmt(target, el);
      return;
    }
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur),
        e = 1 - Math.pow(1 - p, 4);
      el.textContent = this.fmt(Math.round(target * e), el);
      if (p < 1) requestAnimationFrame(step);
      else el.dataset.done = "1";
    };
    requestAnimationFrame(step);
  }

  formatCounters() {
    const root = this.rootRef.current;
    if (!root) return;
    root.querySelectorAll("[data-count][data-done]").forEach((node) => {
      const el = node as HTMLElement;
      el.textContent = this.fmt(+(el.dataset.count || 0), el);
    });
  }

  setupCursor() {
    if (
      !(this.state.cfgCustomCursor ?? true) ||
      !window.matchMedia("(pointer: fine)").matches ||
      this.cur
    )
      return;
    const mk = (css: string) => {
      const d = document.createElement("div");
      d.style.cssText = css;
      document.body.appendChild(d);
      return d;
    };
    const base =
      "position:fixed;left:0;top:0;pointer-events:none;z-index:9999;border-radius:50%;opacity:0;";
    const dot = mk(
      base +
        "width:5px;height:5px;margin:-2.5px 0 0 -2.5px;background:#FAFAFA;transition:opacity .2s, transform .05s linear;"
    );
    const ring = mk(
      base +
        "width:26px;height:26px;margin:-13px 0 0 -13px;border:1px solid rgba(250,250,250,0.35);transition:width .2s ease,height .2s ease,margin .2s ease,background .2s ease,border-color .2s ease,opacity .2s;"
    );
    this.cur = { dot, ring, x: -100, y: -100, rx: -100, ry: -100 };
    this.onDocMove = (e: MouseEvent) => {
      const c = this.cur;
      if (!c) return;
      c.x = e.clientX;
      c.y = e.clientY;
      const t = e.target as HTMLElement | null;
      const onCanvas = t && t.tagName === "CANVAS";
      const hot = !onCanvas && t && t.closest && t.closest("a,button");
      const txt = !hot && t && t.closest && t.closest("input,textarea");
      const s = hot ? 38 : 26;
      ring.style.width = ring.style.height = s + "px";
      ring.style.margin = -s / 2 + "px 0 0 " + -s / 2 + "px";
      ring.style.background = hot ? "rgba(250,250,250,0.06)" : "transparent";
      ring.style.borderColor = hot
        ? "rgba(250,250,250,0.55)"
        : "rgba(250,250,250,0.35)";
      const hide = onCanvas || txt;
      ring.style.opacity = hide ? "0" : "1";
      dot.style.opacity = hide ? "0" : hot ? "0" : "1";
      document.documentElement.toggleAttribute("data-text-cursor", !!txt);
    };
    this.onDocLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };
    document.addEventListener("mousemove", this.onDocMove);
    document.documentElement.addEventListener("mouseleave", this.onDocLeave);
    document.documentElement.setAttribute("data-neon-cursor", "");
  }

  teardownCursor() {
    if (!this.cur) return;
    this.cur.dot.remove();
    this.cur.ring.remove();
    this.cur = null;
    document.removeEventListener("mousemove", this.onDocMove);
    document.documentElement.removeEventListener("mouseleave", this.onDocLeave);
    document.documentElement.removeAttribute("data-neon-cursor");
  }

  tickCursor() {
    const c = this.cur;
    if (!c) return;
    c.rx += (c.x - c.rx) * 0.32;
    c.ry += (c.y - c.ry) * 0.32;
    c.dot.style.transform = `translate(${c.x}px, ${c.y}px)`;
    c.ring.style.transform = `translate(${c.rx}px, ${c.ry}px)`;
  }

  bindCanvas(c: HTMLCanvasElement) {
    this.boundCanvas = c;
    this.grid = null;
    this.start = null;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) / r.width;
      this.mouse.y = (e.clientY - r.top) / r.height;
      this.mouse.on = true;
    };
    c.addEventListener("pointermove", pos);
    c.addEventListener("pointerdown", pos);
    c.addEventListener("pointerleave", () => {
      this.mouse.on = false;
    });
  }

  buildGrid(c: HTMLCanvasElement, W: number, H: number) {
    const img = this.img;
    if (!img) return;
    const cols = W / (window.devicePixelRatio || 1) < 300 ? 48 : 60;
    const cw = W / cols,
      ch = cw * 1.55,
      rows = Math.floor(H / ch);
    const sw = img.naturalWidth,
      sh = Math.min(img.naturalHeight, (sw * H) / W);
    const sy = Math.min(img.naturalHeight - sh, img.naturalHeight * 0.2);
    this.crop = { sx: 0, sy, sw, sh };
    const o = document.createElement("canvas");
    o.width = cols;
    o.height = rows;
    const ox = o.getContext("2d");
    if (!ox) return;
    ox.drawImage(img, 0, sy, sw, sh, 0, 0, cols, rows);
    const px = ox.getImageData(0, 0, cols, rows).data,
      cells = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4,
          lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
        let d = Math.min(1, Math.max(0, (1 - lum - 0.12) / 0.72));
        d = Math.pow(d, 0.85);
        cells.push({ x, y, d, delay: Math.random() * 900 + y * 14 });
      }
    this.grid = { cols, rows, cw, ch: H / rows, cells };
  }

  draw(t: number) {
    const c = this.canvasRef.current;
    if (!c || !this.imgReady || !this.img) return;
    if (c !== this.boundCanvas) this.bindCanvas(c);
    const dpr = window.devicePixelRatio || 1,
      W = Math.round(c.clientWidth * dpr),
      H = Math.round(c.clientHeight * dpr);
    if (!W || !H) return;
    const vr = c.getBoundingClientRect();
    if (vr.bottom < 0 || vr.top > window.innerHeight) return;
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
      this.grid = null;
    }
    if (!this.grid) this.buildGrid(c, W, H);
    if (!this.grid) return;
    if (this.start == null) this.start = t;
    const g = this.grid,
      ctx = c.getContext("2d"),
      el = t - this.start;
    if (!ctx) return;
    const accent = this.accentNow(c);
    const ramp = " .·:-=+*#%@",
      noise = "01<>/{}[]=+*";
    const m = this.mouse,
      R = W * 0.2;
    m.r += ((m.on ? R : 0) - m.r) * 0.12;
    const mx = m.x * W,
      my = m.y * H;
    const scan = ((el / 28) % (g.rows + 30)) - 15;
    ctx.fillStyle = "#09090B";
    ctx.fillRect(0, 0, W, H);
    ctx.font = `500 ${g.ch * 0.92}px 'Geist Mono', monospace`;
    ctx.textBaseline = "top";
    ctx.fillStyle = accent;
    for (const cell of g.cells) {
      if (cell.d < 0.05) continue;
      const cx = cell.x * g.cw,
        cy = cell.y * g.ch;
      const dist = Math.hypot(cx + g.cw / 2 - mx, cy + g.ch / 2 - my);
      if (m.r > 2 && dist < m.r) continue;
      let ch: string,
        a = 0.28 + 0.72 * cell.d;
      if (el < cell.delay) {
        ch = noise[(Math.random() * noise.length) | 0];
        a *= 0.35;
      } else if (m.r > 2 && dist < m.r * 1.45) {
        ch =
          Math.random() < 0.5
            ? noise[(Math.random() * noise.length) | 0]
            : ramp[Math.round(cell.d * (ramp.length - 1))];
        a = 1;
      } else ch = ramp[Math.round(cell.d * (ramp.length - 1))];
      const sd = Math.abs(cell.y - scan);
      if (sd < 3) a = Math.min(1, a + (3 - sd) * 0.18);
      const fade = (g.rows - cell.y) / (g.rows * 0.2);
      if (fade < 1) a *= Math.max(0, fade);
      ctx.globalAlpha = a;
      ctx.fillText(ch, cx, cy);
    }
    ctx.globalAlpha = 1;
    if (m.r > 2) {
      const { sx, sy, sw, sh } = this.crop;
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, m.r, 0, Math.PI * 2);
      ctx.clip();
      ctx.filter = "grayscale(1) contrast(1.15)";
      ctx.drawImage(this.img, sx, sy, sw, sh, 0, 0, W, H);
      ctx.filter = "none";
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5 * dpr;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(mx, my, m.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  renderLoader() {
    const out = this.state.loaderOut;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "#09090B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 28,
          opacity: out ? 0 : 1,
          transition: "opacity .9s cubic-bezier(.4,0,.2,1)",
          pointerEvents: out ? "none" : "auto",
        }}
      >
        <div
          style={{
            transition:
              "transform .9s cubic-bezier(.4,0,.2,1), filter .9s cubic-bezier(.4,0,.2,1)",
            transform: out ? "scale(1.06)" : "none",
            filter: out ? "blur(6px)" : "none",
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            fontFamily: "'Geist Mono', monospace",
            fontWeight: 500,
            fontSize: 56,
            letterSpacing: "-0.04em",
            color: "#FAFAFA",
          }}
        >
          <span style={{ color: "var(--accent)" }}>&gt;</span>
          <span
            style={{
              display: "inline-block",
              overflow: "hidden",
              whiteSpace: "nowrap",
              width: "2ch",
              animation: "mgType .5s steps(2) .2s both",
            }}
          >
            mg
          </span>
          <span
            style={{
              width: 26,
              height: 6,
              background: "var(--accent)",
              boxShadow: "0 0 16px var(--accent)",
              animation: "blink .8s steps(1) infinite",
            }}
          />
        </div>
        <div
          style={{
            width: 140,
            height: 1,
            background: "#1F1F23",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "var(--accent)",
              transformOrigin: "left",
              animation: "mgBar 1.2s cubic-bezier(.6,0,.2,1) both",
            }}
          />
        </div>
      </div>
    );
  }

  stepProj(dir: number) {
    const n = PROJ_KEYS.length,
      i = this.state.projIdx;
    clearTimeout(this.snapT);
    if (dir > 0) {
      const ni = i >= n ? 1 : i + 1;
      if (i >= n) {
        this.setState({ projNoAnim: true, projIdx: 0 }, () =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              this.setState({ projNoAnim: false, projIdx: 1 })
            )
          )
        );
        return;
      }
      this.setState({ projNoAnim: false, projIdx: ni });
      if (ni === n)
        this.snapT = setTimeout(
          () =>
            this.setState({ projNoAnim: true, projIdx: 0 }, () =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                  this.setState({ projNoAnim: false })
                )
              )
            ),
          850
        );
    } else {
      if (i <= 0) {
        this.setState({ projNoAnim: true, projIdx: n }, () =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              this.setState({ projNoAnim: false, projIdx: n - 1 })
            )
          )
        );
        return;
      }
      this.setState({ projNoAnim: false, projIdx: i - 1 });
    }
  }

  render() {
    const palettes: Record<string, string> = {
      Lima: "#D4FF3A",
      Cian: "#3AF2FF",
      Magenta: "#FF4FD8",
      Naranja: "#FF8A3A",
    };
    const accent =
      palettes[this.state.cfgAccent] ?? this.state.cfgAccent ?? "#D4FF3A";
    const lang = this.state.lang === "en" ? "en" : "es";
    const L = T[lang];
    const sk = this.state.skill,
      used = sk ? USES[sk] || [] : null;
    const lit = (key: string) =>
      !used || used.length === 0 || used.includes(key);

    const aboutList = L.about.map(md);
    const jobsList = L.jobs.map((j: any, i: number) => ({
      ...j,
      date: resolveJobDate(j.date, lang),
      key: JOB_KEYS[i],
      op: lit(JOB_KEYS[i]) ? 1 : 0.3,
      path: j.path || [],
      hasPath: !!j.path,
      padBottom: i === L.jobs.length - 1 ? "0" : "44px",
      lineBg:
        i === L.jobs.length - 1
          ? "transparent"
          : "linear-gradient(#27272A, #1F1F23)",
      dotBg: j.current ? "var(--accent)" : "#09090B",
      dotBorder: j.current ? "var(--accent)" : "#52525B",
      dotShadow: j.current
        ? "0 0 0 4px color-mix(in oklch, var(--accent) 16%, transparent), 0 0 14px var(--accent)"
        : "none",
      bullets: j.bullets.map(md),
      dateColor: j.current ? "var(--accent)" : "#71717A",
    }));

    const baseProjects = L.projects.map((p: any, i: number) => {
      const key = PROJ_KEYS[i];
      const on = used && used.includes(key);
      const S = SHOTS[key] || { f: "", dur: 0 },
        hov = !!S.f && this.state.hoverP === key;
      return {
        ...p,
        key,
        baseKey: key,
        bullets: p.bullets.map(md),
        shot: S.f,
        target: p.target || "_blank",
        bulletsShort: [
          md((SUMMARY[lang] && SUMMARY[lang][key]) || p.bullets[0]),
        ],
        stackShort: p.stack.slice(0, 4),
        hasMore: p.stack.length > 4,
        more: "+" + (p.stack.length - 4),
        moreTitle: p.stack.slice(4).join(", "),
        extOp: p.soon ? 0 : 1,
        disabled: p.soon ? true : false,
        hov,
        dur: S.dur,
        dot: hov ? "var(--accent)" : "#27272A",
        fade: hov ? 0 : 1,
        op: lit(key) ? 1 : 0.3,
        bc: on ? "var(--accent)" : "#1F1F23",
        glow: on
          ? "0 0 40px color-mix(in oklch, var(--accent) 18%, transparent)"
          : "none",
      };
    });
    const projectsList = baseProjects.concat(
      baseProjects.map((p: any) => ({ ...p, key: p.key + "-c" }))
    );

    const skillsList = L.skillNames.map((name: string, i: number) => {
      const ids =
        i < 4 ? SKILLS[i] : i === 4 ? T.es.skillAi : T.es.skillExtra;
      const labels =
        i < 4
          ? lang === "en"
            ? ids.map((s: string) =>
                s === "Microservicios" ? "Microservices" : s
              )
            : ids
          : i === 4
          ? L.skillAi
          : L.skillExtra;
      return {
        name,
        hasDesc: i === 4,
        desc: i === 4 ? L.skillAiDesc : "",
        items: ids.map((id: string, k: number) => {
          const on = sk === id;
          return {
            id,
            label: labels[k],
            bg: on ? "var(--accent)" : "#16161A",
            fg: on ? "#09090B" : "#D4D4D8",
            bd: on ? "var(--accent)" : "transparent",
            onClick: () =>
              this.setState((s) => ({ skill: s.skill === id ? null : id })),
          };
        }),
      };
    });

    const pv = this.state.pv,
      nProj = PROJ_KEYS.length,
      pi = this.state.projIdx,
      gap = 16;
    const cardBasis = `calc((100% - ${(pv - 1) * gap}px) / ${pv})`;
    const trackT = `translateX(calc(-${pi} * ((100% - ${
      (pv - 1) * gap
    }px) / ${pv} + ${gap}px)))`;
    const trackTr = this.state.projNoAnim
      ? "none"
      : "transform .8s cubic-bezier(.65,0,.25,1)";
    const goP = (i: number) => {
      this.projTouched = Date.now();
      clearTimeout(this.snapT);
      this.setState({ projNoAnim: false, projIdx: i });
    };

    const qn = L.quotes.length,
      qi = this.state.quoteIdx % qn;
    const goQ = (i: number) => {
      this.quoteTouched = Date.now();
      this.setState({ quoteIdx: (i + qn) % qn });
    };
    const quotesList = L.quotes.map((q: any, i: number) => {
      const on = i === qi;
      const parts = q.by.split(" · ");
      const name = parts[0];
      const len = q.text.length;
      return {
        ...q,
        name,
        role: parts.slice(1).join(" · "),
        initials: name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase(),
        fs:
          len < 160
            ? "clamp(22px, 2.6vw, 30px)"
            : len < 300
            ? "clamp(20px, 2.1vw, 25px)"
            : "clamp(18px, 1.8vw, 21px)",
        hidden: !on,
        op: on ? 1 : 0,
        tf: on ? "none" : i < qi ? "translateX(-24px)" : "translateX(24px)",
        blur: on ? "none" : "blur(4px)",
        pe: (on ? "auto" : "none") as React.CSSProperties["pointerEvents"],
      };
    });

    const skLabel = sk
      ? lang === "en"
        ? ({ Microservicios: "Microservices" } as Record<string, string>)[sk] ||
          (T.es.skillAi.indexOf(sk) > -1
            ? T.en.skillAi[T.es.skillAi.indexOf(sk)]
            : T.es.skillExtra.indexOf(sk) > -1
            ? T.en.skillExtra[T.es.skillExtra.indexOf(sk)]
            : sk)
        : sk
      : "";
    const skUses = used ? used.map((k) => PLACES[k]).filter(Boolean) : [];
    const skNone = !!used && used.length === 0;

    const mobileLinks = [
      { href: "#sobre", n: "01", label: L.nav.about },
      { href: "#experiencia", n: "02", label: L.nav.exp },
      { href: "#proyectos", n: "03", label: L.nav.projects },
      { href: "#habilidades", n: "04", label: "stack" },
      { href: "#contacto", n: "07", label: L.nav.contact },
    ];

    const waUrl =
      "https://wa.me/573105346818?text=" +
      encodeURIComponent(
        lang === "en"
          ? "Hi Manuel, I saw your portfolio and would like to talk."
          : "Hola Manuel, vi tu portafolio y me gustaría hablar contigo."
      );

    const isAscii = (this.state.cfgPhotoStyle ?? "ASCII") === "ASCII";
    const isDuo = this.state.cfgPhotoStyle === "Duotono";
    const showGrid = this.state.cfgShowGrid ?? true;
    const showGlow = this.state.cfgShowGlow ?? false;
    const labelPos = this.state.wide ? "sticky" : "static";
    const labelTop = this.state.wide ? "150px" : "auto";

    return (
      <div
        ref={this.rootRef}
        onMouseMove={this.onMove}
        style={
          {
            "--accent": accent,
            "--mx": "50%",
            "--my": "20%",
            position: "relative",
            minHeight: "100vh",
            background: "#09090B",
            color: "#A1A1AA",
            fontFamily: "'Geist', system-ui, sans-serif",
            fontSize: 16,
            lineHeight: 1.65,
            overflow: "clip",
          } as React.CSSProperties
        }
      >
        {showGlow && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(520px circle at var(--mx) var(--my), color-mix(in oklch, var(--accent) 6%, transparent), transparent 60%)",
            }}
          />
        )}
        {showGrid && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "linear-gradient(#ffffff08 1px, transparent 1px), linear-gradient(90deg, #ffffff08 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage:
                "linear-gradient(to bottom, #000 0, #000 360px, transparent 860px)",
              WebkitMaskImage:
                "linear-gradient(to bottom, #000 0, #000 360px, transparent 860px)",
            }}
          />
        )}

        {/* Sticky Navbar */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "rgba(9,9,11,0.72)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderBottom: "1px solid #18181B",
          }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: "0 auto",
              padding: "16px 28px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px 24px",
              fontFamily: "'Geist Mono', monospace",
              fontSize: 13,
            }}
          >
            <a
              href="#top"
              aria-label="Inicio"
              onClick={this.logoTap}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                color: "#FAFAFA",
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <span style={{ color: "var(--accent)" }}>&gt;</span>
              <span>manuel.gallego</span>
              <span
                style={{
                  width: 8,
                  height: 2,
                  background: "var(--accent)",
                  boxShadow: "0 0 8px var(--accent)",
                  animation: "blink 1s steps(1) infinite",
                }}
              />
            </a>
            <button
              onClick={() => this.setState((s) => ({ menuOpen: !s.menuOpen }))}
              aria-label="Menú"
              style={{
                display: this.state.mobile ? "flex" : "none",
                width: 44,
                height: 44,
                border: "1px solid #27272A",
                borderRadius: 12,
                background: "transparent",
                color: "#FAFAFA",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 5,
                padding: 0,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 1.5,
                  background: this.state.menuOpen ? "var(--accent)" : "#FAFAFA",
                  transition: "transform .25s",
                  transform: this.state.menuOpen
                    ? "translateY(3.25px) rotate(45deg)"
                    : "none",
                }}
              />
              <span
                style={{
                  width: 18,
                  height: 1.5,
                  background: this.state.menuOpen ? "var(--accent)" : "#FAFAFA",
                  transition: "transform .25s",
                  transform: this.state.menuOpen
                    ? "translateY(-3.25px) rotate(-45deg)"
                    : "none",
                }}
              />
            </button>
            <div
              style={{
                display: this.state.mobile ? "none" : "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px 22px",
              }}
            >
              <a href="#sobre" style={{ color: "#A1A1AA" }}>
                {L.nav.about}
              </a>
              <a href="#experiencia" style={{ color: "#A1A1AA" }}>
                {L.nav.exp}
              </a>
              <a href="#proyectos" style={{ color: "#A1A1AA" }}>
                {L.nav.projects}
              </a>
              <a href="#habilidades" style={{ color: "#A1A1AA" }}>
                stack
              </a>
              <a href="#contacto" style={{ color: "#A1A1AA" }}>
                {L.nav.contact}
              </a>
              <a
                href="/assets/CV-Manuel-Gallego.pdf"
                download="CV-Manuel-Gallego.pdf"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--accent)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ flex: "none" }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" x2="12" y1="15" y2="3"></line>
                </svg>
                CV
              </a>
              <div
                style={{
                  display: "flex",
                  padding: 3,
                  border: "1px solid #27272A",
                  borderRadius: 999,
                  gap: 2,
                }}
              >
                <button
                  onClick={() => this.setLang("es")}
                  style={{
                    border: 0,
                    padding: "3px 10px",
                    borderRadius: 999,
                    font: "inherit",
                    fontSize: 12,
                    background: lang === "es" ? "var(--accent)" : "transparent",
                    color: lang === "es" ? "#09090B" : "#A1A1AA",
                  }}
                >
                  ES
                </button>
                <button
                  onClick={() => this.setLang("en")}
                  style={{
                    border: 0,
                    padding: "3px 10px",
                    borderRadius: 999,
                    font: "inherit",
                    fontSize: 12,
                    background: lang === "en" ? "var(--accent)" : "transparent",
                    color: lang === "en" ? "#09090B" : "#A1A1AA",
                  }}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Fullscreen Menu */}
        {this.state.mobile && this.state.menuOpen && (
          <div
            style={{
              position: "fixed",
              inset: "77px 0 0 0",
              zIndex: 19,
              background: "rgba(9,9,11,0.97)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            {mobileLinks.map((ml) => (
              <a
                key={ml.href}
                href={ml.href}
                onClick={() => this.setState({ menuOpen: false })}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  padding: "14px 0",
                  borderBottom: "1px solid #1F1F23",
                  color: "#FAFAFA",
                  fontFamily: "'Geist', sans-serif",
                  fontSize: 30,
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12,
                    color: "var(--accent)",
                  }}
                >
                  {ml.n}
                </span>
                {ml.label}
              </a>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 24,
              }}
            >
              <a
                href="/assets/CV-Manuel-Gallego.pdf"
                download="CV-Manuel-Gallego.pdf"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 44,
                  padding: "0 20px",
                  borderRadius: 999,
                  background: "var(--accent)",
                  color: "#09090B",
                  fontFamily: "'Geist', sans-serif",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ flex: "none" }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" x2="12" y1="15" y2="3"></line>
                </svg>
                {L.hero.cv}
              </a>
              <div
                style={{
                  display: "flex",
                  padding: 3,
                  border: "1px solid #27272A",
                  borderRadius: 999,
                  gap: 2,
                }}
              >
                <button
                  onClick={() => this.setLang("es")}
                  style={{
                    border: 0,
                    padding: "8px 14px",
                    borderRadius: 999,
                    font: "inherit",
                    fontSize: 12,
                    background: lang === "es" ? "var(--accent)" : "transparent",
                    color: lang === "es" ? "#09090B" : "#A1A1AA",
                  }}
                >
                  ES
                </button>
                <button
                  onClick={() => this.setLang("en")}
                  style={{
                    border: 0,
                    padding: "8px 14px",
                    borderRadius: 999,
                    font: "inherit",
                    fontSize: 12,
                    background: lang === "en" ? "var(--accent)" : "transparent",
                    color: lang === "en" ? "#09090B" : "#A1A1AA",
                  }}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Container */}
        <div
          ref={this.contentRef}
          style={{
            position: "relative",
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 28px",
            transition: "opacity .22s ease, filter .22s ease",
          }}
        >
          {/* HERO */}
          <header
            id="top"
            data-screen-label="Hero"
            data-reveal="1"
            style={{
              padding: "96px 0 120px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 40,
            }}
          >
            <div
              style={{
                flex: "1 1 400px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 36,
              }}
            >
              <div
                data-plat="00"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 13,
                  color: "#D4D4D8",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    animation: "pulse 2s infinite",
                    flex: "none",
                  }}
                />
                <span>{L.hero.status}</span>
                <span
                  title="Colombia"
                  aria-label="Colombia"
                  style={{
                    display: "inline-block",
                    width: 18,
                    height: 12,
                    borderRadius: 2,
                    background:
                      "linear-gradient(#FCD116 0 50%, #003893 50% 75%, #CE1126 75% 100%)",
                    boxShadow: "0 0 0 1px #27272A",
                    flex: "none",
                  }}
                />
              </div>
              <h1
                style={{
                  margin: 0,
                  color: "#FAFAFA",
                  fontWeight: 500,
                  fontSize: "clamp(34px, 7vw, 84px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.045em",
                }}
              >
                <span style={{ whiteSpace: "nowrap" }}>Manuel Alejandro</span>
                <br />
                <span style={{ whiteSpace: "nowrap" }}>
                  Gallego Alarcón
                  <span style={{ color: "var(--accent)" }}>.</span>
                </span>
              </h1>
              <div
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "#D4D4D8",
                  textWrap: "pretty" as any,
                }}
              >
                <span style={{ color: "var(--accent)", marginRight: 10 }}>
                  &gt;
                </span>
                Full-Stack Developer · Java / Spring Boot · Next.js / React ·
                AWS · IA
                <span
                  style={{
                    display: "inline-block",
                    verticalAlign: "-3px",
                    marginLeft: 10,
                    width: 9,
                    height: 18,
                    background: "var(--accent)",
                    animation: "blink 1s steps(1) infinite",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <a
                  href="#proyectos"
                  className="mg-hero-cta"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 46,
                    padding: "0 22px",
                    borderRadius: 999,
                    background: "var(--accent)",
                    color: "#09090B",
                    fontWeight: 500,
                    fontSize: 15,
                    boxShadow:
                      "0 0 32px color-mix(in oklch, var(--accent) 35%, transparent)",
                  }}
                >
                  {L.hero.cta}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flex: "none" }}
                  >
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </a>
                <a
                  href="/assets/CV-Manuel-Gallego.pdf"
                  download="CV-Manuel-Gallego.pdf"
                  className="mg-hero-cv"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 46,
                    padding: "0 22px",
                    borderRadius: 999,
                    border: "1px solid #27272A",
                    color: "#FAFAFA",
                    fontSize: 15,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flex: "none" }}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" x2="12" y1="15" y2="3"></line>
                  </svg>
                  {L.hero.cv}
                </a>
                <button
                  onClick={this.copyEmail}
                  title={L.ui.copy}
                  className="mg-border-hover"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 46,
                    padding: "0 22px",
                    borderRadius: 999,
                    border: "1px solid #27272A",
                    background: "transparent",
                    color: "#FAFAFA",
                    font: "inherit",
                    fontSize: 15,
                    maxWidth: "100%",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    alejandrogallego030@gmail.com
                  </span>
                  <span
                    style={{ display: "inline-flex", color: "var(--accent)" }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ flex: "none" }}
                    >
                      <rect
                        width="14"
                        height="14"
                        x="8"
                        y="8"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            <div
              className="mg-border-hover"
              style={{
                flex: "0 1 290px",
                minWidth: 200,
                position: "relative",
                aspectRatio: "4/5",
                borderRadius: 20,
                overflow: "hidden",
                border: "1px solid #27272A",
                background: "#09090B",
                boxShadow:
                  "0 0 80px color-mix(in oklch, var(--accent) 18%, transparent)",
              }}
            >
              {isAscii && (
                <>
                  <canvas
                    ref={this.canvasRef}
                    aria-label="Retrato de Manuel en ASCII"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      display: "block",
                      touchAction: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      right: 12,
                      bottom: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 12,
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "#09090B",
                        border: "1px solid #27272A",
                        color: "#FAFAFA",
                      }}
                    >
                      manuel.txt
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "#09090B",
                        border: "1px solid var(--accent)",
                        color: "var(--accent)",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ flex: "none" }}
                      >
                        <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"></path>
                      </svg>
                      {L.hero.hint}
                    </span>
                  </div>
                </>
              )}
              {isDuo && (
                <>
                  <img
                    src="/assets/manuel.jpg"
                    alt="Manuel Alejandro Gallego Alarcón"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "50% 45%",
                      filter: "grayscale(1) contrast(1.25) brightness(0.9)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "var(--accent)",
                      mixBlendMode: "multiply",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to bottom, transparent 55%, #09090B 100%)",
                    }}
                  />
                </>
              )}
            </div>
          </header>

          {/* 01 / SOBRE MÍ */}
          <section
            id="sobre"
            data-screen-label="Sobre mí"
            data-reveal="1"
            style={{
              scrollMarginTop: 72,
              display: "flex",
              flexWrap: "wrap",
              gap: "24px 48px",
              padding: "72px 0",
              borderTop: "1px solid #1F1F23",
            }}
          >
            <div
              data-plat="01"
              style={{
                flex: "0 0 200px",
                position: labelPos,
                top: labelTop,
                alignSelf: "flex-start",
                fontFamily: "'Geist Mono', monospace",
                fontSize: 13,
                color: "#71717A",
              }}
            >
              <span style={{ color: "var(--accent)" }}>01</span> / {L.sec.about}
            </div>
            <div
              style={{
                flex: "1 1 520px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                fontSize: 19,
                lineHeight: 1.6,
                textWrap: "pretty" as any,
              }}
            >
              {aboutList.map((p: any[], pi: number) => (
                <p key={pi} style={{ margin: 0 }}>
                  {p.map((s: any, si: number) => (
                    <span key={si} style={{ color: s.c }}>
                      {s.t}
                    </span>
                  ))}
                </p>
              ))}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "24px 32px",
                  marginTop: 20,
                  paddingTop: 28,
                  borderTop: "1px dashed #27272A",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    data-count="3"
                    data-suffix="+"
                    style={{
                      color: "#FAFAFA",
                      fontSize: 40,
                      fontWeight: 500,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                      minHeight: 44,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "#71717A",
                      textWrap: "balance" as any,
                    }}
                  >
                    {L.stats.a}
                  </span>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    data-count="50000"
                    data-suffix="+"
                    style={{
                      color: "#FAFAFA",
                      fontSize: 40,
                      fontWeight: 500,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                      minHeight: 44,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "#71717A",
                      textWrap: "balance" as any,
                    }}
                  >
                    {L.stats.b}
                  </span>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    data-count="3"
                    style={{
                      color: "#FAFAFA",
                      fontSize: 40,
                      fontWeight: 500,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                      minHeight: 44,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "#71717A",
                      textWrap: "balance" as any,
                    }}
                  >
                    {L.stats.c}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 02 / EXPERIENCIA */}
          <section
            id="experiencia"
            data-screen-label="Experiencia"
            data-reveal="1"
            style={{
              scrollMarginTop: 72,
              display: "flex",
              flexWrap: "wrap",
              gap: "24px 48px",
              padding: "72px 0",
              borderTop: "1px solid #1F1F23",
            }}
          >
            <div
              data-plat="02"
              style={{
                flex: "0 0 200px",
                position: labelPos,
                top: labelTop,
                alignSelf: "flex-start",
                fontFamily: "'Geist Mono', monospace",
                fontSize: 13,
                color: "#71717A",
              }}
            >
              <span style={{ color: "var(--accent)" }}>02</span> / {L.sec.exp}
            </div>
            <div
              style={{
                flex: "1 1 520px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {jobsList.map((j: any) => (
                <article
                  key={j.key}
                  id={`j-${j.key}`}
                  style={{
                    scrollMarginTop: 110,
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: `0 0 ${j.padBottom} 36px`,
                    opacity: j.op,
                    transition: "opacity .3s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 5,
                      top: 14,
                      bottom: -14,
                      width: 1,
                      background: j.lineBg,
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 8,
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: j.dotBg,
                      border: `1px solid ${j.dotBorder}`,
                      boxShadow: j.dotShadow,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: "8px 24px",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        color: "#FAFAFA",
                        fontSize: 22,
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {j.role}
                    </h3>
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: 12,
                        color: j.dateColor,
                      }}
                    >
                      {j.date}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "#D4D4D8" }}>
                    {j.company}
                  </div>
                  {j.hasPath && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: 12,
                      }}
                    >
                      {j.path.map((ps: string, psi: number) => (
                        <span
                          key={psi}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            border: "1px solid #27272A",
                            borderRadius: 999,
                            color: "#A1A1AA",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              color: "var(--accent)",
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                              style={{ flex: "none" }}
                            >
                              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                              <polyline points="16 7 22 7 22 13"></polyline>
                            </svg>
                          </span>
                          {ps}
                        </span>
                      ))}
                    </div>
                  )}
                  <ul
                    style={{
                      margin: "4px 0 0",
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      fontSize: 15,
                      textWrap: "pretty" as any,
                    }}
                  >
                    {j.bullets.map((b: any[], bi: number) => (
                      <li key={bi} style={{ display: "flex", gap: 10 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            marginTop: 5,
                            color: "var(--accent)",
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            style={{ flex: "none" }}
                          >
                            <path d="m9 18 6-6-6-6"></path>
                          </svg>
                        </span>
                        <span>
                          {b.map((s: any, si: number) => (
                            <span key={si} style={{ color: s.c }}>
                              {s.t}
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          {/* 03 / PROYECTOS */}
          <section
            id="proyectos"
            data-screen-label="Proyectos"
            data-reveal="1"
            style={{
              scrollMarginTop: 72,
              display: "flex",
              flexDirection: "column",
              gap: 40,
              padding: "72px 0",
              borderTop: "1px solid #1F1F23",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "24px 48px",
                alignItems: "baseline",
              }}
            >
              <div
                data-plat="03"
                style={{
                  flex: "0 0 200px",
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 13,
                  color: "#71717A",
                }}
              >
                <span style={{ color: "var(--accent)" }}>03</span> /{" "}
                {L.sec.projects}
              </div>
              <h2
                style={{
                  flex: "1 1 520px",
                  margin: 0,
                  color: "#FAFAFA",
                  fontSize: "clamp(32px, 4.4vw, 52px)",
                  fontWeight: 500,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.05,
                }}
              >
                {L.projectsTitle}
              </h2>
            </div>

            <div
              onMouseEnter={() => this.setState({ projPaused: true })}
              onMouseLeave={() => this.setState({ projPaused: false })}
              onTouchStart={(e) => {
                this.tx = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                const dx = e.changedTouches[0].clientX - (this.tx || 0);
                if (Math.abs(dx) > 40) {
                  this.projTouched = Date.now();
                  this.stepProj(dx < 0 ? 1 : -1);
                }
              }}
              style={{
                margin: "-14px -10px",
                padding: "14px 10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "stretch",
                  transform: trackT,
                  transition: trackTr,
                }}
              >
                {projectsList.map((pr: any) => (
                  <a
                    key={pr.key}
                    id={`p-${pr.key}`}
                    data-tilt="1"
                    href={pr.url}
                    target={pr.target}
                    rel={pr.target === "_blank" ? "noopener noreferrer" : undefined}
                    onClick={pr.soon ? (e) => e.preventDefault() : undefined}
                    aria-disabled={pr.disabled}
                    onMouseEnter={() => this.setState({ hoverP: pr.baseKey })}
                    onMouseLeave={() =>
                      this.setState((s) =>
                        s.hoverP === pr.baseKey ? { hoverP: null } : null
                      )
                    }
                    onFocus={() => this.setState({ hoverP: pr.baseKey })}
                    onBlur={() =>
                      this.setState((s) =>
                        s.hoverP === pr.baseKey ? { hoverP: null } : null
                      )
                    }
                    className="mg-proj-card"
                    style={{
                      flex: `0 0 ${cardBasis}`,
                      minWidth: 0,
                      scrollMarginTop: 110,
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      padding: 20,
                      border: `1px solid ${pr.bc}`,
                      borderRadius: 16,
                      background: "#0E0E11",
                      color: "#A1A1AA",
                      opacity: pr.op,
                      boxShadow: pr.glow,
                      transition:
                        "border-color .2s, opacity .3s, box-shadow .3s, transform .5s cubic-bezier(.2,.7,.2,1)",
                      willChange: "transform",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        opacity: "var(--go, 0)" as any,
                        transition: "opacity .3s",
                        background:
                          "radial-gradient(420px circle at var(--gx, 50%) var(--gy, 0%), color-mix(in oklch, var(--accent) 14%, transparent), transparent 55%)",
                      }}
                    />
                    <div
                      style={{
                        margin: "-20px -20px 2px",
                        display: "flex",
                        flexDirection: "column",
                        borderBottom: "1px solid #1F1F23",
                        background: "#09090B",
                        borderRadius: "16px 16px 0 0",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "10px 14px",
                          borderBottom: "1px solid #1F1F23",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#27272A",
                          }}
                        />
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#27272A",
                          }}
                        />
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: pr.dot,
                            transition: "background .3s",
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            marginLeft: 8,
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: "#16161A",
                            color: "#A1A1AA",
                            fontFamily: "'Geist Mono', monospace",
                            fontSize: 11,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {pr.host}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            color: "#71717A",
                            opacity: pr.extOp,
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            style={{ flex: "none" }}
                          >
                            <path d="M7 7h10v10"></path>
                            <path d="M7 17 17 7"></path>
                          </svg>
                        </span>
                      </div>
                      <div
                        style={{
                          position: "relative",
                          height: 140,
                          overflow: "hidden",
                          background: "#fff",
                        }}
                      >
                        {pr.soon ? (
                          <div
                            style={{
                              height: 140,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 10,
                              background: "#09090B",
                              backgroundImage:
                                "linear-gradient(#ffffff0a 1px, transparent 1px), linear-gradient(90deg, #ffffff0a 1px, transparent 1px)",
                              backgroundSize: "24px 24px",
                              fontFamily: "'Geist Mono', monospace",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 28,
                                fontWeight: 500,
                                color: "#FAFAFA",
                                letterSpacing: "-0.03em",
                              }}
                            >
                              <span style={{ color: "var(--accent)" }}>
                                &gt;
                              </span>
                              arca
                              <span
                                style={{
                                  display: "inline-block",
                                  width: 14,
                                  height: 3,
                                  marginLeft: 4,
                                  background: "var(--accent)",
                                  boxShadow: "0 0 10px var(--accent)",
                                  animation: "blink 1s steps(1) infinite",
                                }}
                              />
                            </div>
                            <div style={{ fontSize: 12, color: "#71717A" }}>
                              CRM
                            </div>
                          </div>
                        ) : (
                          <img
                            src={pr.shot}
                            alt={`Vista previa de ${pr.name}`}
                            decoding="async"
                            style={{
                              display: "block",
                              width: "100%",
                              height: "auto",
                              transform: pr.hov
                                ? "translateY(calc(-100% + 140px))"
                                : "translateY(0)",
                              transition: `transform ${
                                pr.hov ? pr.dur + "s" : ".9s"
                              } cubic-bezier(.45,.05,.35,1)`,
                            }}
                          />
                        )}
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: 44,
                            background:
                              "linear-gradient(transparent, rgba(9,9,11,0.35))",
                            pointerEvents: "none",
                            opacity: pr.fade,
                            transition: "opacity .3s",
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          minWidth: 0,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            color: "#FAFAFA",
                            fontSize: 22,
                            fontWeight: 500,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.2,
                          }}
                        >
                          {pr.name}
                        </h3>
                        <span style={{ fontSize: 14, color: "#D4D4D8" }}>
                          {pr.sub}
                        </span>
                      </div>
                      <span
                        style={{
                          flex: "none",
                          marginTop: 2,
                          padding: "3px 10px",
                          border: "1px solid #27272A",
                          borderRadius: 999,
                          fontFamily: "'Geist Mono', monospace",
                          fontSize: 12,
                          color: "var(--accent)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pr.tag}
                      </span>
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: "#B4B4BC",
                        textWrap: "pretty" as any,
                      }}
                    >
                      {pr.bulletsShort.map((b: any[], bi: number) => (
                        <li key={bi}>
                          {b.map((s: any, si: number) => (
                            <span key={si} style={{ color: s.c }}>
                              {s.t}
                            </span>
                          ))}
                        </li>
                      ))}
                    </ul>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: 12,
                        color: "#D4D4D8",
                      }}
                    >
                      {pr.stackShort.map((st: string, sti: number) => (
                        <span
                          key={sti}
                          style={{
                            padding: "3px 10px",
                            border: "1px solid #27272A",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {st}
                        </span>
                      ))}
                      {pr.hasMore && (
                        <span
                          title={pr.moreTitle}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: "#16161A",
                            color: "#A1A1AA",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pr.more}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {Array.from({ length: nProj }, (_, i) => {
                  const on = i === pi % nProj;
                  return (
                    <button
                      key={i}
                      onClick={() => goP(i)}
                      aria-label={(lang === "en" ? "Go to " : "Ir a ") + (i + 1)}
                      style={{
                        width: on ? 22 : 6,
                        height: 6,
                        border: 0,
                        padding: 0,
                        borderRadius: 999,
                        background: on ? "var(--accent)" : "#3F3F46",
                        transition: "width .35s, background .35s",
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    this.projTouched = Date.now();
                    this.stepProj(-1);
                  }}
                  aria-label="Anterior"
                  className="mg-circle-btn"
                  style={{
                    width: 40,
                    height: 40,
                    border: "1px solid #27272A",
                    borderRadius: "50%",
                    background: "transparent",
                    color: "#FAFAFA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flex: "none" }}
                  >
                    <path d="m12 19-7-7 7-7"></path>
                    <path d="M19 12H5"></path>
                  </svg>
                </button>
                <button
                  onClick={() => {
                    this.projTouched = Date.now();
                    this.stepProj(1);
                  }}
                  aria-label="Siguiente"
                  className="mg-circle-btn"
                  style={{
                    width: 40,
                    height: 40,
                    border: "1px solid #27272A",
                    borderRadius: "50%",
                    background: "transparent",
                    color: "#FAFAFA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flex: "none" }}
                  >
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </button>
              </div>
            </div>
          </section>

          {/* 04 / STACK */}
          <section
            id="habilidades"
            data-screen-label="Habilidades"
            data-reveal="1"
            style={{
              scrollMarginTop: 72,
              display: "flex",
              flexWrap: "wrap",
              gap: "24px 48px",
              padding: "72px 0",
              borderTop: "1px solid #1F1F23",
            }}
          >
            <div
              data-plat="04"
              style={{
                flex: "0 0 200px",
                position: labelPos,
                top: labelTop,
                alignSelf: "flex-start",
                fontFamily: "'Geist Mono', monospace",
                fontSize: 13,
                color: "#71717A",
              }}
            >
              <span style={{ color: "var(--accent)" }}>04</span> / stack
            </div>
            <div
              style={{
                flex: "1 1 520px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  position: "sticky",
                  top: 84,
                  zIndex: 3,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "10px 14px",
                  padding: "14px 16px",
                  marginBottom: 8,
                  border: `1px solid ${sk ? "var(--accent)" : "#27272A"}`,
                  borderRadius: 14,
                  background: "rgba(14,14,17,0.92)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 12,
                  transition: "border-color .2s",
                }}
              >
                {!sk ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#A1A1AA",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        color: "var(--accent)",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ flex: "none" }}
                      >
                        <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"></path>
                      </svg>
                    </span>
                    {L.ui.skHint}
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: "#FAFAFA",
                      }}
                    >
                      {skLabel}
                      <span
                        style={{
                          display: "inline-flex",
                          color: "var(--accent)",
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          style={{ flex: "none" }}
                        >
                          <path d="M5 12h14"></path>
                          <path d="m12 5 7 7-7 7"></path>
                        </svg>
                      </span>
                    </span>
                    {skUses.map((u, ui) => (
                      <a
                        key={ui}
                        href={u.href}
                        className="mg-use-pill"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "var(--accent)",
                          color: "#09090B",
                        }}
                      >
                        {u.name}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          style={{ flex: "none" }}
                        >
                          <path d="M12 5v14"></path>
                          <path d="m19 12-7 7-7-7"></path>
                        </svg>
                      </a>
                    ))}
                    {skNone && (
                      <span style={{ color: "#A1A1AA" }}>{L.ui.skAll}</span>
                    )}
                    <button
                      onClick={() => this.setState({ skill: null })}
                      className="mg-clear-btn"
                      style={{
                        marginLeft: "auto",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        border: 0,
                        background: "transparent",
                        color: "#71717A",
                        font: "inherit",
                        fontSize: 12,
                        padding: "4px 0",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ flex: "none" }}
                      >
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                      </svg>
                      {L.ui.skClear}
                    </button>
                  </>
                )}
              </div>
              {skillsList.map((g: any, gi: number) => (
                <div
                  key={gi}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px 32px",
                    padding: "20px 0",
                    borderBottom: "1px solid #1F1F23",
                  }}
                >
                  <div
                    style={{
                      flex: "0 0 160px",
                      color: "#FAFAFA",
                      fontSize: 16,
                      fontWeight: 500,
                    }}
                  >
                    {g.name}
                  </div>
                  <div
                    style={{
                      flex: "1 1 300px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {g.hasDesc && (
                      <p
                        style={{
                          flex: "1 1 100%",
                          margin: "0 0 6px",
                          fontSize: 14,
                          lineHeight: 1.6,
                          textWrap: "pretty" as any,
                        }}
                      >
                        {g.desc}
                      </p>
                    )}
                    {g.items.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={s.onClick}
                        className="mg-border-hover"
                        style={{
                          padding: "5px 12px",
                          border: `1px solid ${s.bd}`,
                          borderRadius: 999,
                          background: s.bg,
                          color: s.fg,
                          fontFamily: "'Geist Mono', monospace",
                          fontSize: 12,
                          transition:
                            "background .2s, color .2s, border-color .2s",
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 05 / EDUCACIÓN */}
          <section
            id="educacion"
            data-screen-label="Educación"
            data-reveal="1"
            style={{
              scrollMarginTop: 72,
              display: "flex",
              flexWrap: "wrap",
              gap: "24px 48px",
              padding: "72px 0",
              borderTop: "1px solid #1F1F23",
            }}
          >
            <div
              data-plat="05"
              style={{
                flex: "0 0 200px",
                position: labelPos,
                top: labelTop,
                alignSelf: "flex-start",
                fontFamily: "'Geist Mono', monospace",
                fontSize: 13,
                color: "#71717A",
              }}
            >
              <span style={{ color: "var(--accent)" }}>05</span> / {L.sec.edu}
            </div>
            <div
              style={{
                flex: "1 1 520px",
                minWidth: 0,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                gap: "28px 40px",
              }}
            >
              {L.edu.map((e: any, ei: number) => (
                <div
                  key={ei}
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <span
                    style={{
                      color: "#FAFAFA",
                      fontSize: 16,
                      fontWeight: 500,
                    }}
                  >
                    {e.title}{" "}
                    <span
                      style={{
                        color: "var(--accent)",
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: 12,
                        fontWeight: 400,
                      }}
                    >
                      {e.note}
                    </span>
                  </span>
                  <span style={{ fontSize: 14 }}>{e.place}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 06 / RECOMENDACIÓN */}
          <section
            data-screen-label="Recomendación"
            data-reveal="1"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "24px 48px",
              padding: "72px 0",
              borderTop: "1px solid #1F1F23",
            }}
          >
            <div
              data-plat="06"
              style={{
                flex: "0 0 200px",
                position: labelPos,
                top: labelTop,
                alignSelf: "flex-start",
                fontFamily: "'Geist Mono', monospace",
                fontSize: 13,
                color: "#71717A",
              }}
            >
              <span style={{ color: "var(--accent)" }}>06</span> / {L.sec.rec}
            </div>
            <div
              onMouseEnter={() => this.setState({ quotePaused: true })}
              onMouseLeave={() => this.setState({ quotePaused: false })}
              style={{
                flex: "1 1 520px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 28,
              }}
            >
              <div style={{ display: "grid" }}>
                {quotesList.map((q: any, i: number) => (
                  <figure
                    key={i}
                    aria-hidden={q.hidden}
                    style={{
                      gridArea: "1 / 1",
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 28,
                      minHeight: "100%",
                      opacity: q.op,
                      transform: q.tf,
                      filter: q.blur,
                      pointerEvents: q.pe,
                      transition:
                        "opacity .7s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .7s ease",
                    }}
                  >
                    <blockquote
                      style={{
                        margin: 0,
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        color: "#FAFAFA",
                        fontSize: q.fs,
                        fontWeight: 400,
                        lineHeight: 1.55,
                        letterSpacing: "-0.02em",
                        whiteSpace: "pre-line",
                        textWrap: "pretty" as any,
                      }}
                    >
                      <span>
                        <span style={{ color: "var(--accent)" }}>“</span>
                        {q.text}
                        <span style={{ color: "var(--accent)" }}>”</span>
                      </span>
                    </blockquote>
                    <figcaption
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        paddingTop: 20,
                        borderTop: "1px solid #1F1F23",
                      }}
                    >
                      <span
                        style={{
                          flex: "none",
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          border: "1px solid #27272A",
                          background: "#0E0E11",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "'Geist Mono', monospace",
                          fontSize: 12,
                          color: "var(--accent)",
                        }}
                      >
                        {q.initials}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            color: "#FAFAFA",
                            fontSize: 15,
                            fontWeight: 500,
                          }}
                        >
                          {q.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "'Geist Mono', monospace",
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: "#A1A1AA",
                          }}
                        >
                          {q.role}
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {L.quotes.map((_: any, i: number) => {
                    const on = i === qi;
                    return (
                      <button
                        key={i}
                        onClick={() => goQ(i)}
                        aria-label={
                          (lang === "en"
                            ? "Recommendation "
                            : "Recomendación ") +
                          (i + 1)
                        }
                        style={{
                          width: on ? 22 : 6,
                          height: 6,
                          border: 0,
                          padding: 0,
                          borderRadius: 999,
                          background: on ? "var(--accent)" : "#3F3F46",
                          transition: "width .35s, background .35s",
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => goQ(qi - 1)}
                    aria-label="Anterior"
                    className="mg-circle-btn"
                    style={{
                      width: 40,
                      height: 40,
                      border: "1px solid #27272A",
                      borderRadius: "50%",
                      background: "transparent",
                      color: "#FAFAFA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ flex: "none" }}
                    >
                      <path d="m12 19-7-7 7-7"></path>
                      <path d="M19 12H5"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => goQ(qi + 1)}
                    aria-label="Siguiente"
                    className="mg-circle-btn"
                    style={{
                      width: 40,
                      height: 40,
                      border: "1px solid #27272A",
                      borderRadius: "50%",
                      background: "transparent",
                      color: "#FAFAFA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ flex: "none" }}
                    >
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 07 / CONTACTO (FOOTER) */}
          <footer
            id="contacto"
            data-screen-label="Contacto"
            data-reveal="1"
            style={{
              scrollMarginTop: 72,
              display: "flex",
              flexDirection: "column",
              gap: 40,
              padding: "96px 0 48px",
              borderTop: "1px solid #1F1F23",
            }}
          >
            <div
              data-plat="07"
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 13,
                color: "#71717A",
              }}
            >
              <span style={{ color: "var(--accent)" }}>07</span> /{" "}
              {L.sec.contact}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "48px 64px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  flex: "1 1 380px",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 32,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: "#FAFAFA",
                    fontSize: "clamp(40px, 6vw, 80px)",
                    fontWeight: 500,
                    letterSpacing: "-0.045em",
                    lineHeight: 1,
                  }}
                >
                  {L.contactTitle}
                  <span style={{ color: "var(--accent)" }}>_</span>
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "12px 16px",
                  }}
                >
                  <a
                    href="mailto:alejandrogallego030@gmail.com"
                    className="mg-mailto"
                    style={{
                      color: "var(--accent)",
                      fontSize: "clamp(18px, 2.4vw, 28px)",
                      letterSpacing: "-0.01em",
                      borderBottom: "1px solid var(--accent)",
                      paddingBottom: 4,
                    }}
                  >
                    alejandrogallego030@gmail.com
                  </a>
                  <button
                    onClick={this.copyEmail}
                    className="mg-circle-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 999,
                      border: "1px solid #27272A",
                      background: "transparent",
                      color: "#D4D4D8",
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: 12,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ flex: "none" }}
                    >
                      <rect
                        width="14"
                        height="14"
                        x="8"
                        y="8"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                    </svg>
                    {L.ui.copy}
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: "14px 24px",
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 13,
                    color: "#D4D4D8",
                  }}
                >
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={this.openWa}
                    className="mg-accent-hover"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#D4D4D8",
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", color: "var(--accent)" }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ flex: "none" }}
                      >
                        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>
                      </svg>
                    </span>
                    WhatsApp
                  </a>
                  <button
                    onClick={this.copyPhone}
                    title={L.ui.copyPhone}
                    className="mg-accent-hover"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: 0,
                      border: 0,
                      background: "transparent",
                      color: "#D4D4D8",
                      font: "inherit",
                      fontSize: 13,
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", color: "var(--accent)" }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ flex: "none" }}
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                    </span>
                    +57 310 534 6818
                    <span style={{ display: "inline-flex", color: "#71717A" }}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ flex: "none" }}
                      >
                        <rect
                          width="14"
                          height="14"
                          x="8"
                          y="8"
                          rx="2"
                          ry="2"
                        ></rect>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                      </svg>
                    </span>
                  </button>
                  <a
                    href="https://github.com/ManuelGallego1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mg-accent-hover"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#D4D4D8",
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", color: "var(--accent)" }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ flex: "none" }}
                      >
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                        <path d="M9 18c-4.51 2-5-2-7-2"></path>
                      </svg>
                    </span>
                    GitHub
                  </a>
                  <a
                    href="https://linkedin.com/in/manuel-alejandro-gallego-alarcon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mg-accent-hover"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#D4D4D8",
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", color: "var(--accent)" }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ flex: "none" }}
                      >
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                        <rect width="4" height="12" x="2" y="9"></rect>
                        <circle cx="4" cy="4" r="2"></circle>
                      </svg>
                    </span>
                    LinkedIn
                  </a>
                  <a
                    href="/assets/CV-Manuel-Gallego.pdf"
                    download="CV-Manuel-Gallego.pdf"
                    className="mg-accent-hover"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#D4D4D8",
                    }}
                  >
                    <span
                      style={{ display: "inline-flex", color: "var(--accent)" }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ flex: "none" }}
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" x2="12" y1="15" y2="3"></line>
                      </svg>
                    </span>
                    {L.hero.cv}
                  </a>
                </div>
              </div>

              <form
                onSubmit={this.onSubmit}
                style={{
                  flex: "1 1 400px",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  padding: 28,
                  border: "1px solid #1F1F23",
                  borderRadius: 20,
                  background: "#0E0E11",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12,
                    color: "#71717A",
                  }}
                >
                  <span style={{ color: "var(--accent)" }}>&gt;</span>{" "}
                  {L.ui.formTitle}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
                    gap: 14,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      fontSize: 14,
                      color: "#D4D4D8",
                    }}
                  >
                    {L.ui.name}
                    <input
                      name="name"
                      required
                      autoComplete="name"
                      className="mg-input"
                      style={{
                        padding: "13px 14px",
                        borderRadius: 12,
                        border: "1px solid #27272A",
                        background: "#09090B",
                        color: "#FAFAFA",
                        font: "inherit",
                        fontSize: 15,
                        outline: "none",
                      }}
                    />
                  </label>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      fontSize: 14,
                      color: "#D4D4D8",
                    }}
                  >
                    {L.ui.email}
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="mg-input"
                      style={{
                        padding: "13px 14px",
                        borderRadius: 12,
                        border: "1px solid #27272A",
                        background: "#09090B",
                        color: "#FAFAFA",
                        font: "inherit",
                        fontSize: 15,
                        outline: "none",
                      }}
                    />
                  </label>
                </div>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 14,
                    color: "#D4D4D8",
                  }}
                >
                  {L.ui.msg}
                  <textarea
                    name="message"
                    required
                    rows={5}
                    placeholder={L.ui.msgPh}
                    className="mg-input"
                    style={{
                      padding: "13px 14px",
                      borderRadius: 12,
                      border: "1px solid #27272A",
                      background: "#09090B",
                      color: "#FAFAFA",
                      font: "inherit",
                      fontSize: 15,
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                </label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 14, color: "var(--accent)" }}>
                    {this.state.sent ? L.ui.sent : ""}
                  </span>
                  <button
                    type="submit"
                    className="mg-submit-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      height: 46,
                      padding: "0 22px",
                      border: 0,
                      borderRadius: 999,
                      background: "var(--accent)",
                      color: "#09090B",
                      font: "inherit",
                      fontSize: 15,
                      fontWeight: 500,
                      boxShadow:
                        "0 0 28px color-mix(in oklch, var(--accent) 30%, transparent)",
                    }}
                  >
                    {L.ui.send}
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ flex: "none" }}
                    >
                      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
                      <path d="m21.854 2.147-10.94 10.939"></path>
                    </svg>
                  </button>
                </div>
              </form>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px 24px",
                paddingTop: 32,
                borderTop: "1px solid #1F1F23",
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                color: "#71717A",
              }}
            >
              <span>© 2026 Manuel Alejandro Gallego Alarcón</span>
              <span
                title="psst"
                onClick={() => this.openGame()}
                style={{
                  color: "#3F3F46",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                }}
              >
                ↑↑↓↓←→←→BA
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Manizales, Colombia{" "}
                <span
                  title="Colombia"
                  aria-label="Colombia"
                  style={{
                    display: "inline-block",
                    width: 18,
                    height: 12,
                    borderRadius: 2,
                    background:
                      "linear-gradient(#FCD116 0 50%, #003893 50% 75%, #CE1126 75% 100%)",
                    boxShadow: "0 0 0 1px #27272A",
                    flex: "none",
                  }}
                />
              </span>
            </div>
          </footer>
        </div>

        {/* STICKMAN BUDDY CANVAS */}
        <canvas
          ref={this.buddyRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: 15,
          }}
        />

        {/* BACK TO TOP */}
        {this.state.showTop && (
          <a
            href="#top"
            aria-label={L.ui.top}
            title={L.ui.top}
            className="mg-top-btn"
            style={{
              position: "fixed",
              right: 24,
              bottom: 24,
              zIndex: 18,
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "1px solid #27272A",
              background: "rgba(9,9,11,0.8)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flex: "none" }}
            >
              <path d="m5 12 7-7 7 7"></path>
              <path d="M12 19V5"></path>
            </svg>
          </a>
        )}

        {/* TOAST */}
        {this.state.toast && (
          <div
            role="status"
            style={{
              position: "fixed",
              left: "50%",
              bottom: 28,
              zIndex: 30,
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderRadius: 999,
              background: "#FAFAFA",
              color: "#09090B",
              fontFamily: "'Geist Mono', monospace",
              fontSize: 13,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              animation: "mgToast .25s ease-out",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flex: "none" }}
            >
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            {this.state.toast}
          </div>
        )}

        {/* EASTER EGG: SNAKE.EXE + ANTI-CHEAT WORLD LEADERBOARD */}
        {this.state.gameOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              background: "rgba(9,9,11,0.94)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                width: "min(440px, 100%)",
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--accent)",
                borderRadius: 16,
                background: "#0E0E11",
                overflow: "hidden",
                boxShadow:
                  "0 0 80px color-mix(in oklch, var(--accent) 25%, transparent)",
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              {/* Window Top Bar with compact #1 World Record */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid #1F1F23",
                  fontSize: 12,
                  color: "#A1A1AA",
                  gap: 8,
                }}
              >
                <span style={{ flex: "none" }}>
                  <span style={{ color: "var(--accent)" }}>&gt;</span> snake.exe
                </span>

                {this.state.leaderboard.length > 0 && (
                  <span
                    title={
                      lang === "en" ? "World #1 Record" : "Récord Mundial #1"
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "2px 9px",
                      borderRadius: 999,
                      border: "1px solid #27272A",
                      background: "#09090B",
                      fontSize: 11,
                      minWidth: 0,
                      maxWidth: 195,
                    }}
                  >
                    <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                      #1
                    </span>
                    <span
                      style={{
                        color: "#FAFAFA",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {this.state.leaderboard[0].username}
                    </span>
                    <span style={{ color: "var(--accent)", flex: "none" }}>
                      {this.state.leaderboard[0].score}
                    </span>
                  </span>
                )}

                <button
                  onClick={this.closeGame}
                  className="mg-border-hover"
                  style={{
                    flex: "none",
                    border: "1px solid #27272A",
                    borderRadius: 8,
                    background: "transparent",
                    color: "#FAFAFA",
                    font: "inherit",
                    fontSize: 12,
                    padding: "4px 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  esc
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flex: "none" }}
                  >
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </button>
              </div>

              {/* 1:1 Game Canvas + End-of-Game Leaderboard Overlay */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1/1",
                }}
              >
                <canvas
                  ref={this.gameRef}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    touchAction: "none",
                  }}
                />

                {this.state.gameOver && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(9,9,11,0.88)",
                      backdropFilter: "blur(6px)",
                      WebkitBackdropFilter: "blur(6px)",
                      display: "flex",
                      flexDirection: "column",
                      padding: 16,
                      gap: 10,
                    }}
                  >
                    {/* Game Over Header + Restart */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Geist', sans-serif",
                            fontSize: 22,
                            fontWeight: 500,
                            color: "#FAFAFA",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          game over
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--accent)",
                            fontWeight: 500,
                          }}
                        >
                          {this.state.gameOverScore} pts
                        </span>
                      </div>
                      <button
                        onClick={() => this.resetGame()}
                        className="mg-border-hover"
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          border: "1px solid #27272A",
                          background: "#09090B",
                          color: "#FAFAFA",
                          font: "inherit",
                          fontSize: 11,
                        }}
                      >
                        ↻ {lang === "en" ? "restart" : "reiniciar"}
                      </button>
                    </div>

                    {/* Save Score Form (when score > 0) */}
                    {this.state.canSubmitScore && (
                      <form
                        onSubmit={this.submitScore}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <input
                          type="text"
                          value={this.state.playerUsername}
                          onChange={(e) =>
                            this.setState({ playerUsername: e.target.value })
                          }
                          placeholder={
                            lang === "en" ? "your username" : "tu username"
                          }
                          aria-label={
                            lang === "en" ? "Leaderboard name" : "Nombre para el ranking"
                          }
                          minLength={USERNAME_MIN}
                          maxLength={USERNAME_MAX}
                          pattern={USERNAME_PATTERN}
                          title={
                            lang === "en"
                              ? "Letters or numbers, optionally joined by . _ -"
                              : "Letras o números, opcionalmente unidos por . _ -"
                          }
                          autoComplete="nickname"
                          spellCheck={false}
                          required
                          className="mg-input"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #27272A",
                            background: "#09090B",
                            color: "#FAFAFA",
                            font: "inherit",
                            fontSize: 12,
                            outline: "none",
                          }}
                        />
                        <button
                          type="submit"
                          disabled={this.state.submittingScore}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: 0,
                            background: "var(--accent)",
                            color: "#09090B",
                            font: "inherit",
                            fontSize: 12,
                            fontWeight: 500,
                            flex: "none",
                          }}
                        >
                          {this.state.submittingScore
                            ? "..."
                            : lang === "en"
                            ? "save"
                            : "guardar"}
                        </button>
                      </form>
                    )}

                    {this.state.submitStatus && (
                      <div
                        style={{
                          fontSize: 11,
                          color: this.state.submitStatus.ok
                            ? "var(--accent)"
                            : "#FF5F57",
                        }}
                      >
                        {this.state.submitStatus.msg}
                      </div>
                    )}

                    {/* Full World Leaderboard (shown only at Game Over) */}
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid #1F1F23",
                        borderRadius: 10,
                        background: "rgba(14,14,17,0.92)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 10px",
                          borderBottom: "1px solid #1F1F23",
                          fontSize: 11,
                          color: "#A1A1AA",
                        }}
                      >
                        <span>
                          <span style={{ color: "var(--accent)" }}>#</span>{" "}
                          {lang === "en"
                            ? "world_leaderboard"
                            : "clasificación_mundial"}
                        </span>
                        <span style={{ fontSize: 10, color: "#71717A" }}>
                          anti-cheat ✓
                        </span>
                      </div>

                      <div
                        style={{
                          flex: 1,
                          overflowY: "auto",
                          padding: "6px 8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {this.state.leaderboardLoading ? (
                          <div
                            style={{
                              padding: 16,
                              textAlign: "center",
                              fontSize: 11,
                              color: "#71717A",
                            }}
                          >
                            {lang === "en" ? "loading..." : "cargando..."}
                          </div>
                        ) : this.state.leaderboard.length === 0 ? (
                          <div
                            style={{
                              padding: 16,
                              textAlign: "center",
                              fontSize: 11,
                              color: "#71717A",
                            }}
                          >
                            {lang === "en"
                              ? "No records yet. Be #1!"
                              : "Sin récords aún. ¡Sé el #1!"}
                          </div>
                        ) : (
                          this.state.leaderboard.map((row) => (
                            <div
                              key={row.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                padding: "5px 8px",
                                borderRadius: 6,
                                background:
                                  row.rank === 1 ? "#12140D" : "transparent",
                                border:
                                  row.rank === 1
                                    ? "1px solid color-mix(in oklch, var(--accent) 45%, transparent)"
                                    : "1px solid transparent",
                                fontSize: 11,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  minWidth: 0,
                                }}
                              >
                                <span
                                  style={{
                                    width: 20,
                                    color:
                                      row.rank <= 3
                                        ? "var(--accent)"
                                        : "#71717A",
                                    fontWeight: 500,
                                  }}
                                >
                                  #{row.rank}
                                </span>
                                <span
                                  style={{
                                    color: "#FAFAFA",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {row.username}
                                </span>
                              </div>
                              <span
                                style={{
                                  color: "var(--accent)",
                                  fontWeight: 500,
                                  flex: "none",
                                }}
                              >
                                {row.score}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 11,
                        color: "#71717A",
                      }}
                    >
                      {lang === "en"
                        ? "space / tap to play again"
                        : "espacio / toca para jugar de nuevo"}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid #1F1F23",
                  fontSize: 12,
                  color: "#A1A1AA",
                  textWrap: "pretty" as any,
                }}
              >
                {L.ui.gameHint}
              </div>
            </div>
          </div>
        )}

        {this.state.loading ? this.renderLoader() : null}
      </div>
    );
  }
}

