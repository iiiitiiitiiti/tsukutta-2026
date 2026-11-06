// 得点板の WINNER 画面の紙吹雪。本物は canvas-confetti を5回撃ち、0.8秒後にもう一度撃つ。
// ページを軽く保つためライブラリは入れず、同じ飛び方（打ち上げて揺れながら落ちる）を小さく書き直した

interface Fire {
  ratio: number;
  spread: number;
  startVelocity?: number;
  decay?: number;
  scalar?: number;
  colors: string[];
}

// 本物の launchConfetti と同じ5発
const FIRES: Fire[] = [
  { ratio: 0.25, spread: 26, startVelocity: 55, colors: ['#FFD700', '#FFA500', '#FF6B35'] },
  { ratio: 0.2, spread: 60, colors: ['#FFD700', '#FFFFFF', '#FFC0CB'] },
  { ratio: 0.35, spread: 100, decay: 0.91, scalar: 0.8, colors: ['#FFD700', '#C0C0C0', '#00BFFF'] },
  { ratio: 0.1, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['#FFD700', '#FF69B4'] },
  { ratio: 0.1, spread: 120, startVelocity: 45, colors: ['#FFD700', '#ADFF2F'] },
];

interface Piece {
  x: number;
  y: number;
  angle: number;
  velocity: number;
  decay: number;
  gravity: number;
  wobble: number;
  wobbleSpeed: number;
  tilt: number;
  scalar: number;
  color: string;
  tick: number;
}

const TICKS = 200;

export function launchConfetti(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  // 本物は画面いっぱいで撃つ。枠が小さいときは勢いと重さを縮めて、枠の中で舞うようにする
  const k = Math.min(1, Math.max(0.45, h / 800));
  const pieces: Piece[] = [];
  const shoot = () => {
    for (const f of FIRES) {
      const count = Math.floor(200 * f.ratio);
      const v0 = (f.startVelocity ?? 45) * k;
      const spread = (f.spread * Math.PI) / 180;
      for (let i = 0; i < count; i += 1) {
        pieces.push({
          x: w / 2,
          y: h * 0.6,
          angle: -Math.PI / 2 + (0.5 * spread - Math.random() * spread),
          velocity: v0 * 0.5 + Math.random() * v0,
          decay: f.decay ?? 0.9,
          gravity: 3 * k,
          wobble: Math.random() * 10,
          wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
          tilt: (Math.random() * 0.5 + 0.25) * Math.PI,
          scalar: f.scalar ?? 1,
          color: f.colors[i % f.colors.length],
          tick: 0,
        });
      }
    }
  };

  let frame = 0;
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (let i = pieces.length - 1; i >= 0; i -= 1) {
      const p = pieces[i];
      p.x += Math.cos(p.angle) * p.velocity;
      p.y += Math.sin(p.angle) * p.velocity + p.gravity;
      p.velocity *= p.decay;
      p.wobble += p.wobbleSpeed;
      p.tilt += 0.1;
      p.tick += 1;
      const wx = p.x + 10 * p.scalar * Math.cos(p.wobble);
      const wy = p.y + 10 * p.scalar * Math.sin(p.wobble);
      const r = Math.random() + 2;
      const x1 = p.x + r * Math.cos(p.tilt);
      const y1 = p.y + r * Math.sin(p.tilt);
      const x2 = wx + r * Math.cos(p.tilt);
      const y2 = wy + r * Math.sin(p.tilt);
      ctx.globalAlpha = 1 - p.tick / TICKS;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(wx, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x1, wy);
      ctx.closePath();
      ctx.fill();
      if (p.tick >= TICKS) pieces.splice(i, 1);
    }
    frame = pieces.length > 0 ? requestAnimationFrame(draw) : 0;
  };

  const start = () => {
    shoot();
    if (!frame) frame = requestAnimationFrame(draw);
  };
  start();
  const again = window.setTimeout(start, 800);

  return () => {
    window.clearTimeout(again);
    cancelAnimationFrame(frame);
    frame = 0;
    pieces.length = 0;
    ctx.clearRect(0, 0, w, h);
  };
}
