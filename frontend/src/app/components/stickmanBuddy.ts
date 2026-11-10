export function drawFig(ctx: CanvasRenderingContext2D, o: any) {
  const { air, crouch, walk, phase, g, t, eye } = o;
  const n = g ? g.name : "",
    lt = g ? g.lt : 0;
  const env = g ? Math.min(1, g.p * 6, (1 - g.p) * 6) : 0;
  const breath = !air ? Math.sin(t / 520) * 0.7 : 0;
  const lift = n === "stretch" ? 1.5 * env : 0;
  const s = Math.sin(phase),
    wa = walk ? 0.75 : 0;
  const bob = walk ? Math.abs(Math.cos(phase)) * 1.4 : 0;
  const hip = { x: 0, y: -12.5 - lift - bob + crouch * 3 };
  const lean = walk ? 0.12 : 0;
  const sh = {
    x: Math.sin(lean) * 11,
    y:
      hip.y -
      Math.cos(lean) * 11 +
      breath -
      (n === "shrug" ? 1.5 * env : 0),
  };
  const look = n === "look" ? (g.p < 0.5 ? -1.8 : 1.8) * env : 0;
  const tilt = n === "shrug" ? 0.8 * env : 0;
  const hd = { x: sh.x + look + tilt + Math.sin(lean) * 5, y: sh.y - 6.5 };
  const seg = (
    p: { x: number; y: number },
    a: number,
    b: number,
    l1: number,
    l2: number
  ) => {
    const k = { x: p.x + Math.sin(a) * l1, y: p.y + Math.cos(a) * l1 };
    const f = {
      x: k.x + Math.sin(a + b) * l2,
      y: k.y + Math.cos(a + b) * l2,
    };
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(k.x, k.y);
    ctx.lineTo(f.x, f.y);
  };
  const L = 6.5 + lift / 2;
  ctx.beginPath();
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(sh.x, sh.y);
  if (air) {
    seg(hip, 0.9, -1.6, 6.5, 6.5);
    seg(hip, 0.25, -1.1, 6.5, 6.5);
  } else if (crouch) {
    seg(hip, 0.7 * crouch, -1.3 * crouch, L, L);
    seg(hip, 0.4 * crouch, -1.1 * crouch, L, L);
  } else if (walk) {
    seg(hip, s * wa, -Math.max(0, -s) * wa * 1.3, L, L);
    seg(hip, -s * wa, -Math.max(0, s) * wa * 1.3, L, L);
  } else if (n === "tap") {
    const k = Math.max(0, Math.sin(lt / 85)) * env;
    seg(hip, 0.16 + k * 0.25, -k * 0.5, L, L);
    seg(hip, -0.14, 0, L, L);
  } else {
    seg(hip, 0.14, 0, L, L);
    seg(hip, -0.14, 0, L, L);
  }
  if (air) {
    seg(sh, 2.5, 0.3, 5, 5);
    seg(sh, -2.3, -0.3, 5, 5);
  } else if (crouch) {
    seg(sh, -0.9 * crouch, 0.4, 5, 5);
    seg(sh, -0.7 * crouch, 0.4, 5, 5);
  } else if (walk) {
    seg(sh, -s * wa * 1.1, wa, 5, 5);
    seg(sh, s * wa * 1.1, wa, 5, 5);
  } else if (n === "wave") {
    seg(
      sh,
      0.18 + (2.45 - 0.18) * env + Math.sin(lt / 110) * 0.4 * env,
      -0.5 * env,
      5,
      5
    );
    seg(sh, -0.18, -0.1, 5, 5);
  } else if (n === "stretch") {
    seg(sh, 0.18 + 2.75 * env, 0.1, 5, 5);
    seg(sh, -0.18 - 2.75 * env, -0.1, 5, 5);
  } else if (n === "shrug") {
    seg(sh, 0.18 + 0.7 * env, 1.7 * env, 5, 5);
    seg(sh, -0.18 - 0.7 * env, -1.7 * env, 5, 5);
  } else if (n === "hop") {
    const a = Math.abs(Math.sin(lt / 130)) * env;
    seg(sh, 0.3 + 2.2 * a, 0.2, 5, 5);
    seg(sh, -0.3 - 2.2 * a, -0.2, 5, 5);
  } else {
    seg(sh, 0.18, 0.1, 5, 5);
    seg(sh, -0.18, -0.1, 5, 5);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hd.x, hd.y, 4.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (t % 3800 >= 120)
    ctx.fillRect(
      hd.x + 1.4 + look * 0.3 + eye.x,
      hd.y - 1.2 + eye.y,
      1.6,
      1.6
    );
}

export function drawFront(ctx: CanvasRenderingContext2D, o: any) {
  const { g, t, eye, air, crouch } = o;
  const n = g ? g.name : "",
    lt = g ? g.lt : 0;
  const env = g ? Math.min(1, g.p * 6, (1 - g.p) * 6) : 0;
  const breath = air ? 0 : Math.sin(t / 520) * 0.7;
  const lift = n === "stretch" ? 1.5 * env : 0;
  const hip = { x: 0, y: -12.5 - lift + crouch * 3 };
  const sh = {
    x: 0,
    y: hip.y - 11 + breath - (n === "shrug" ? 1.5 * env : 0),
  };
  const look = n === "look" ? (g.p < 0.5 ? -1.6 : 1.6) * env : 0;
  const tilt =
    n === "shrug"
      ? 0.9 * env
      : n === "think"
      ? 1.1 * env
      : n === "point"
      ? 0.7 * env
      : 0;
  const hd = { x: look * 0.6 + tilt, y: sh.y - 6.5 };
  const seg = (
    p: { x: number; y: number },
    a: number,
    b: number,
    l1: number,
    l2: number
  ) => {
    const k = { x: p.x + Math.sin(a) * l1, y: p.y + Math.cos(a) * l1 };
    const f = {
      x: k.x + Math.sin(a + b) * l2,
      y: k.y + Math.cos(a + b) * l2,
    };
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(k.x, k.y);
    ctx.lineTo(f.x, f.y);
  };
  const L = 6.5 + lift / 2;
  ctx.beginPath();
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(sh.x, sh.y);
  if (air) {
    seg(hip, 0.55, -1.1, 6, 6);
    seg(hip, -0.55, 1.1, 6, 6);
  } else if (crouch) {
    seg(hip, 0.6 * crouch + 0.25, -1.0 * crouch, L, L);
    seg(hip, -0.6 * crouch - 0.25, 1.0 * crouch, L, L);
  } else if (n === "tap") {
    const k = Math.max(0, Math.sin(lt / 85)) * env;
    seg(hip, 0.26 + k * 0.3, -0.12 - k * 0.6, L, L);
    seg(hip, -0.26, 0.12, L, L);
  } else if (n === "hop") {
    seg(hip, 0.32, -0.2, L, L);
    seg(hip, -0.32, 0.2, L, L);
  } else if (n === "dance") {
    const k = Math.sin(lt / 160) * env;
    seg(hip, 0.3 + Math.max(0, k) * 0.4, -Math.max(0, k) * 0.9, L, L);
    seg(hip, -0.3 - Math.max(0, -k) * 0.4, Math.max(0, -k) * 0.9, L, L);
  } else if (n === "handstand") {
    const k = Math.sin(lt / 170) * 0.18;
    seg(hip, 0.5 + k, -0.2, L, L);
    seg(hip, -0.5 + k, 0.2, L, L);
  } else if (n === "cartwheel") {
    seg(hip, 0.75, 0, 6.5, 6.5);
    seg(hip, -0.75, 0, 6.5, 6.5);
  } else {
    seg(hip, 0.26, -0.12, L, L);
    seg(hip, -0.26, 0.12, L, L);
  }
  if (air) {
    seg(sh, 2.6, 0.25, 5, 5);
    seg(sh, -2.6, -0.25, 5, 5);
  } else if (crouch) {
    seg(sh, 0.9 * crouch, 0.5, 5, 5);
    seg(sh, -0.9 * crouch, -0.5, 5, 5);
  } else if (n === "wave" || n === "frontwave") {
    seg(
      sh,
      0.4 + 2.05 * env + Math.sin(lt / 105) * 0.45 * env,
      -0.4 * env,
      5,
      5
    );
    seg(
      sh,
      n === "frontwave" ? -0.9 : -0.35,
      n === "frontwave" ? 1.9 : 0.15,
      5,
      5
    );
  } else if (n === "front") {
    seg(sh, 0.35 + 0.55 * env, -1.9 * env, 5, 5);
    seg(sh, -0.35 - 0.55 * env, 1.9 * env, 5, 5);
  } else if (n === "point") {
    seg(sh, 0.35 + 1.25 * env + Math.sin(lt / 140) * 0.06 * env, 0, 5, 5);
    seg(sh, -0.35 - 0.55 * env, 1.9 * env, 5, 5);
  } else if (n === "type") {
    const j = Math.sin(lt / 55) * 0.18 * env;
    seg(sh, 0.35 + 0.45 * env, -1.5 * env + j, 5, 5);
    seg(sh, -0.35 - 0.45 * env, 1.5 * env + j, 5, 5);
  } else if (n === "think") {
    seg(sh, 0.35 + 0.3 * env, 2.3 * env, 5, 5);
    seg(sh, -0.35 - 0.2 * env, 1.5 * env, 5, 5);
  } else if (n === "clap") {
    const k = (Math.sin(lt / 80) * 0.5 + 0.5) * 0.45;
    seg(sh, 0.35 + 0.4 * env, -(1.3 + k) * env, 5, 5);
    seg(sh, -0.35 - 0.4 * env, (1.3 + k) * env, 5, 5);
  } else if (n === "stretch") {
    seg(sh, 0.35 + 2.6 * env, 0.1, 5, 5);
    seg(sh, -0.35 - 2.6 * env, -0.1, 5, 5);
  } else if (n === "shrug") {
    seg(sh, 0.35 + 0.9 * env, 1.5 * env, 5, 5);
    seg(sh, -0.35 - 0.9 * env, -1.5 * env, 5, 5);
  } else if (n === "hop") {
    const a = Math.abs(Math.sin(lt / 130)) * env;
    seg(sh, 0.4 + 2.2 * a, 0.2, 5, 5);
    seg(sh, -0.4 - 2.2 * a, -0.2, 5, 5);
  } else if (n === "dance") {
    const k = Math.sin(lt / 160) * env;
    seg(sh, 0.4 + Math.max(0, k) * 2.2, 0.3, 5, 5);
    seg(sh, -0.4 - Math.max(0, -k) * 2.2, -0.3, 5, 5);
  } else if (n === "handstand") {
    seg(sh, 2.78, 0, 5, 5);
    seg(sh, -2.78, 0, 5, 5);
  } else if (n === "cartwheel") {
    seg(sh, 2.35, 0, 5, 5);
    seg(sh, -2.35, 0, 5, 5);
  } else {
    seg(sh, 0.35, -0.1, 5, 5);
    seg(sh, -0.35, 0.1, 5, 5);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hd.x, hd.y, 4.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const ex = hd.x + eye.x + look * 0.5 + (n === "point" ? 1 * env : 0),
    ey =
      hd.y -
      1.2 +
      eye.y +
      (n === "think" ? -0.8 * env : n === "type" ? 0.8 * env : 0);
  if (t % 3800 >= 120) {
    ctx.fillRect(ex - 2.5, ey - 0.6, 1.5, 1.5);
    ctx.fillRect(ex + 1, ey - 0.6, 1.5, 1.5);
  } else {
    ctx.fillRect(ex - 2.6, ey + 0.2, 1.8, 0.8);
    ctx.fillRect(ex + 0.9, ey + 0.2, 1.8, 0.8);
  }
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (air || n === "hop" || n === "stretch" || n === "cartwheel")
    ctx.arc(ex, hd.y + 1.4, 1.3, 0, Math.PI * 2);
  else ctx.arc(ex, hd.y + 0.6, 1.9, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
}

export function drawBuddyFrame(host: any, t: number) {
  const c = host.buddyRef.current;
  if (!c) return;
  const dpr = window.devicePixelRatio || 1,
    W = window.innerWidth,
    H = window.innerHeight;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const on =
    (host.state.cfgShowBuddy ?? true) &&
    W >= 760 &&
    !host.state.loading &&
    !host.state.gameOpen &&
    !host.state.menuOpen;
  const root = host.rootRef.current;
  if (!on || !root) return;
  const plats = root.querySelectorAll("[data-plat]");
  if (!plats.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const en = host.state.lang === "en";
  const B =
    host.buddy ||
    (host.buddy = {
      x: null,
      y: 0,
      face: 1,
      target: -1,
      jump: null,
      land: -1e9,
      lastT: t,
      dust: [],
      gest: null,
      gestEnd: 0,
      lastG: "",
      offX: 0,
      offT: 0,
      alert: -1e9,
      hopT: -1e9,
      flipT: -1e9,
      phase: 0,
      bubble: null,
      greet: true,
    });
  const dt = Math.min(3, Math.max(0.2, (t - B.lastT) / 16.67));
  B.lastT = t;
  const minY = -90,
    maxY = H + 80;
  let idx = 0;
  const rects: DOMRect[] = [];
  plats.forEach((p: Element, k: number) => {
    const r = p.getBoundingClientRect();
    rects.push(r);
    if (r.top < H * 0.58) idx = k;
  });
  if (idx === 0 && window.scrollY > 6 && plats.length > 1) idx = 1;
  const r = rects[idx];
  const gy = Math.max(minY, Math.min(maxY, r.top - 1));
  const clamped = Math.abs(gy - (r.top - 1)) > 1;
  const home = r.left + 26;
  if (B.x == null) {
    B.x = home;
    B.y = gy;
    B.target = idx;
  }
  if (idx !== B.target) {
    if (reduce) {
      B.offX = B.offT = 0;
    } else {
      B.jump = {
        x0: B.x,
        y0: B.y,
        t0: t + 110,
        dur: 600,
        flip: idx > B.target ? 1 : -1,
      };
      B.gest = null;
      B.bubble = null;
    }
    B.target = idx;
  }
  const pick = (a: any[]) => a[(Math.random() * a.length) | 0];
  const say = (text: string, dur?: number, force?: boolean) => {
    if (!force && t - (B.lastSay || -1e9) < 14000) return;
    B.lastSay = t;
    B.bubble = { text, t0: t, dur: dur || 1800 };
  };
  let x = home + B.offX,
    y = gy,
    air = false,
    crouch = 0,
    spin = 0,
    walk = false,
    hopY = 0;
  if (B.jump) {
    const J = B.jump;
    if (t < J.t0) {
      x = J.x0;
      y = J.y0;
      crouch = Math.min(1, (t - (J.t0 - 110)) / 80);
    } else {
      const p = Math.min(1, (t - J.t0) / J.dur),
        e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const arc = 38 + Math.min(120, Math.abs(gy - J.y0) * 0.18);
      x = J.x0 + (home - J.x0) * e;
      y = J.y0 + (gy - J.y0) * e - arc * 4 * p * (1 - p);
      air = true;
      if (Math.abs(gy - J.y0) > 160) spin = J.flip * Math.PI * 2 * e;
      if (p >= 1) {
        B.jump = null;
        air = false;
        spin = 0;
        y = gy;
        x = home;
        B.land = t;
        B.offX = B.offT = 0;
        B.greet = true;
        B.gestEnd = t - 2600;
        for (let k = 0; k < 8; k++)
          B.dust.push({
            x: home,
            y: gy,
            vx: (Math.random() - 0.5) * 2.6,
            vy: -Math.random() * 1.7,
            life: 1,
          });
      }
    }
  }
  const M = host.mxy && t - host.mxy.t < 5000 ? host.mxy : null;
  let eye = { x: 0, y: 0 },
    eyeF = { x: 0, y: 0 },
    looking = false;
  const acro = !!(
    B.gest && ["backflip", "cartwheel", "handstand"].includes(B.gest.name)
  );
  if (!B.jump && !reduce) {
    const bx = home + B.offX,
      by = gy - 16;
    const ck = host.buddyClick;
    host.buddyClick = null;
    if (ck && !acro && Math.hypot(ck.x - bx, ck.y - by) < 30) {
      B.flipT = t;
      B.gest = null;
      say(
        pick(
          en
            ? ["hey!", "haha", "again!", "wheee"]
            : ["¡ey!", "jaja", "¡otra vez!", "wiii"]
        ),
        1300,
        true
      );
    }
    const d = M ? Math.hypot(M.x - bx, M.y - by) : 1e9;
    if (!acro && d < 46 && t > B.alert + 650 && t > B.flipT + 700) {
      const dir = bx - M.x >= 0 ? 1 : -1;
      let nt = B.offT + dir * 38;
      if (nt > 112 || nt < -14) nt = B.offT - dir * 52;
      B.offT = Math.max(-14, Math.min(112, nt));
      B.alert = t;
      B.hopT = t;
      B.gest = null;
      B.bubble = { text: "!", t0: t, dur: 650 };
    }
    if (!acro && M && d < 180) {
      looking = true;
      B.face = M.x >= bx ? 1 : -1;
      const vx = M.x - bx,
        vy = M.y - (by - 10),
        L = Math.hypot(vx, vy) || 1;
      eye = { x: Math.abs(vx / L) * 1.1, y: (vy / L) * 1.1 };
      eyeF = { x: (vx / L) * 1.3, y: (vy / L) * 1.1 };
    }
    if ((!M || d > 230) && t - B.alert > 3200 && B.offT !== 0) B.offT = 0;
    const diff = B.offT - B.offX;
    if (Math.abs(diff) > 0.4) {
      const fast = t - B.alert < 450;
      B.offX +=
        Math.sign(diff) * Math.min(Math.abs(diff), (fast ? 4.6 : 1.3) * dt);
      walk = true;
      B.phase += (fast ? 0.36 : 0.18) * dt;
      if (!looking) B.face = Math.sign(diff);
    }
    x = home + B.offX;
    const hp = (t - B.hopT) / 320;
    if (hp < 1) hopY = -Math.sin(hp * Math.PI) * 9;
    const fp = (t - B.flipT) / 700;
    if (fp < 1) {
      const e = 1 - Math.pow(1 - fp, 3);
      spin = -B.face * Math.PI * 2 * e;
      hopY = -Math.sin(fp * Math.PI) * 20;
    }
  }
  B.x = x;
  B.y = y;
  const atEnd =
    idx === plats.length - 1 &&
    window.scrollY + H >= document.documentElement.scrollHeight - 8;
  const busy = air || B.jump || walk || looking || spin || reduce;
  if (busy && !acro) {
    if (B.gest && B.gest.name !== "wave") B.gest = null;
  } else if (atEnd) {
    if (!B.gest || B.gest.name !== "frontwave") {
      B.gest = { name: "frontwave", t0: t, dur: 1e9 };
      say(en ? "let's talk ↓" : "hablemos ↓", 2600);
    }
  } else if (B.gest && t > B.gest.t0 + B.gest.dur) {
    if (B.gest.name === "cartwheel") {
      B.offX = B.offT = Math.max(-14, Math.min(112, B.offX + B.cw * 34));
      B.alert = t;
      B.land = t;
      for (let k = 0; k < 6; k++)
        B.dust.push({
          x: home + B.offX,
          y: gy,
          vx: (Math.random() - 0.5) * 2.2,
          vy: -Math.random() * 1.4,
          life: 1,
        });
    }
    B.gestEnd = t;
    B.lastG = B.gest.name;
    B.gest = null;
  } else if (!B.gest && t > B.gestEnd + 2600) {
    const pool = [
      "wave",
      "look",
      "stretch",
      "tap",
      "shrug",
      "hop",
      "front",
      "frontwave",
      "dance",
      "backflip",
      "cartwheel",
      "handstand",
      "think",
      "clap",
      "point",
    ].filter((n) => n !== B.lastG);
    const LAND = [
      "frontwave",
      "point",
      "type",
      "point",
      "dance",
      "think",
      "clap",
      "frontwave",
    ];
    const LANDSAY = en
      ? [
          "hi!",
          "that's me →",
          "> working…",
          "try them ↓",
          "click the stack",
          "always learning",
          "bravo!",
          "let's talk ↓",
        ]
      : [
          "¡hola!",
          "ese soy yo →",
          "> trabajando…",
          "pruébalos ↓",
          "clic en el stack",
          "siempre aprendiendo",
          "¡bravo!",
          "hablemos ↓",
        ];
    const li = Math.min(idx, LAND.length - 1);
    let name = B.greet ? LAND[li] : pick(pool);
    const secret =
      !B.greet &&
      ((t > 20000 && !B.saidSecret) || (t > 20000 && Math.random() < 0.08));
    const greeting = B.greet;
    B.greet = false;
    if (secret) name = "front";
    const DUR: Record<string, number> = {
      point: 2200,
      type: 2400,
      think: 2400,
      clap: 1800,
      look: 2200,
      tap: 1800,
      front: 2400,
      frontwave: 2400,
      dance: 2200,
      backflip: 900,
      cartwheel: 1100,
      handstand: 2400,
    };
    B.gest = { name, t0: t, dur: secret ? 3400 : DUR[name] || 1500 };
    if (name === "cartwheel") B.cw = B.offX + 34 > 112 ? -1 : 1;
    const SEC = en
      ? [
          null,
          null,
          "that's me ↑",
          "check my journey",
          "try them ↗",
          "click the stack",
          "always learning",
          "nice words, right?",
          "let's talk ↓",
        ]
      : [
          null,
          null,
          "ese soy yo ↑",
          "mira mi camino",
          "pruébalos ↗",
          "haz clic en el stack",
          "siempre aprendiendo",
          "bonitas palabras",
          "hablemos ↓",
        ];
    const GEN = en
      ? [
          "hi",
          "let's talk?",
          "keep scrolling ↓",
          "> compiling…",
          "check the projects",
          "coffee & code",
          "anything is possible",
          "hello, recruiter",
          "zero bugs (I think)",
          "200 OK",
          "deploy successful ✓",
          'git commit -m "hi"',
          "npm run dev",
          "compiled first try",
          "seen my CV?",
          "clean code only",
          "still here",
          "smooth scroll, huh?",
          "Spring Boot > coffee",
          "refactoring…",
          "it works on my machine",
        ]
      : [
          "hola",
          "¿hablamos?",
          "sigue bajando ↓",
          "> compilando…",
          "mira los proyectos",
          "café y código",
          "todo es posible",
          "hola, reclutador",
          "cero bugs (creo)",
          "200 OK",
          "deploy exitoso ✓",
          'git commit -m "hola"',
          "npm run dev",
          "compiló a la primera",
          "¿ya viste mi CV?",
          "código limpio",
          "aquí sigo",
          "qué buen scroll",
          "Spring Boot > café",
          "refactorizando…",
          "en mi máquina funciona",
        ];
    const ACRO = en
      ? ["ta-da!", "nailed it", "olé!", "easy"]
      : ["¡tarán!", "clavado", "¡olé!", "fácil"];
    if (greeting) {
      if (t - (B.lastGreet || -1e9) > 8000) {
        B.lastGreet = t;
        say(LANDSAY[li], 1900, t - (B.lastSay || -1e9) > 6000);
      }
    } else if (secret) {
      B.saidSecret = true;
      B.lastSay = -1e9;
      say(
        pick(
          en
            ? ["psst… ↑↑↓↓←→←→BA", "psst… tap the logo 5 times"]
            : ["psst… ↑↑↓↓←→←→BA", "psst… toca el logo 5 veces"]
        ),
        3400
      );
    } else if (["backflip", "cartwheel", "handstand"].includes(name)) {
      if (Math.random() < 0.35 && t - (B.lastSay || -1e9) > 14000) {
        B.lastSay = t + DUR[name];
        setTimeout(() => {
          if (host.buddy && !host.buddy.jump) {
            host.buddy.bubble = {
              text: pick(ACRO),
              t0: performance.now(),
              dur: 1300,
            };
          }
        }, DUR[name] - 100);
      }
    } else if (Math.random() < (name.startsWith("front") ? 0.4 : 0.15)) {
      const sp = SEC[Math.min(idx + 1, SEC.length - 1)];
      say(sp && Math.random() < 0.4 ? sp : pick(GEN), 2200);
    }
  }
  const g =
    B.gest && !air
      ? {
          name: B.gest.name,
          p: Math.min(1, (t - B.gest.t0) / B.gest.dur),
          lt: t - B.gest.t0,
        }
      : null;
  if (!B.jump) x = home + B.offX;
  let rot = 0,
    pivot = -14;
  if (g) {
    const e3 = (p: number) =>
      p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    if (g.name === "backflip") {
      spin = -B.face * Math.PI * 2 * e3(g.p);
      hopY = -Math.sin(g.p * Math.PI) * 24;
    }
    if (g.name === "cartwheel") {
      const p = g.p,
        e = p * p * (3 - 2 * p);
      rot = B.cw * Math.PI * 2 * e;
      x += B.cw * 34 * e;
      pivot = -17;
      hopY = -Math.pow(Math.abs(Math.sin(e * Math.PI)), 0.6) * 9;
    }
    if (g.name === "handstand") {
      const p = g.p,
        up = p < 0.25,
        down = p > 0.75;
      const k = up ? e3(p / 0.25) : down ? e3((p - 0.75) / 0.25) : 0;
      rot = up ? Math.PI * k : down ? Math.PI + Math.PI * k : Math.PI;
      pivot = -17;
      hopY =
        up || down
          ? -Math.sin(k * Math.PI) * 14
          : -Math.sin(((p - 0.25) / 0.5) * Math.PI * 3) * 0.8;
    }
  }
  const front = !walk && !spin;
  const accent = host.accentNow(root);
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (clamped && !air) {
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(home - 14, y + 1.5);
    ctx.lineTo(home + 14 + Math.max(0, B.offX), y + 1.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  B.dust = B.dust.filter((d: any) => (d.life -= 0.04 * dt) > 0);
  B.dust.forEach((d: any) => {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vy += 0.08 * dt;
    ctx.globalAlpha = d.life * 0.8;
    ctx.fillRect(d.x - 1, d.y - 1, 2, 2);
  });
  ctx.globalAlpha = 1;
  const sq = Math.max(0, 1 - (t - B.land) / 200) + crouch * 0.6;
  if (g && g.name === "hop")
    hopY = -Math.abs(Math.sin(g.lt / 130)) * 6 * (1 - g.p);
  if (g && g.name === "dance") hopY = -Math.abs(Math.sin(g.lt / 160)) * 2.5;
  ctx.save();
  ctx.translate(x, y + hopY);
  if (sq > 0 && !rot) ctx.scale(1 + sq * 0.2, 1 - sq * 0.2);
  if (air && !spin) ctx.scale(0.94, 1.06);
  if (spin) {
    ctx.translate(0, -14);
    ctx.rotate(spin);
    ctx.translate(0, 14);
  }
  if (rot) {
    ctx.translate(0, pivot);
    ctx.rotate(rot);
    ctx.translate(0, -pivot);
  }
  if (!front) ctx.scale(B.face, 1);
  ctx.shadowColor = accent;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  if (front) drawFront(ctx, { g, t, eye: eyeF, air, crouch });
  else drawFig(ctx, { air, crouch, walk, phase: B.phase, g, t, eye });
  ctx.restore();
  const bb = B.bubble;
  if (bb && t < bb.t0 + bb.dur && !air) {
    const a = Math.min(1, (t - bb.t0) / 140, (bb.t0 + bb.dur - t) / 220);
    ctx.font = "500 11px 'Geist Mono', monospace";
    const w = Math.ceil(ctx.measureText(bb.text).width) + 16,
      bh = 22;
    const bx = Math.max(8, x - 6),
      byy = y + hopY - 62 - (1 - a) * 4;
    ctx.globalAlpha = a;
    ctx.fillStyle = "#09090B";
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, byy, w, bh, 11);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 2, byy + bh);
    ctx.lineTo(x + 2, byy + bh + 6);
    ctx.lineTo(x + 9, byy + bh);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(x + 2.5, byy + bh - 1.5, 6, 2);
    ctx.fillStyle = bb.text === "!" ? accent : "#FAFAFA";
    ctx.textBaseline = "middle";
    ctx.fillText(bb.text, bx + 8, byy + bh / 2 + 0.5);
    ctx.globalAlpha = 1;
  }
}

