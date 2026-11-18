// 2D overlay drawn on a low-resolution canvas (so it matches the pixel look):
// cockpit canopy frame, glass HUD and the instrument panel, plus target brackets.

const INK = '#efe6d8';
const INK_DIM = 'rgba(239, 230, 216, 0.55)';
const PANEL = '#2b2731';
const PANEL_EDGE = '#3c3644';
const FACE = '#1d1a22';

export function drawTargets(ctx, W, H, markers) {
  ctx.lineWidth = 1;
  for (const m of markers) {
    const s = m.locked ? 7 : 5;
    ctx.strokeStyle = m.locked ? '#ffb15a' : INK_DIM;
    const x = Math.round(m.x), y = Math.round(m.y);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s + 2); ctx.lineTo(x - s, y - s); ctx.lineTo(x - s + 2, y - s);
    ctx.moveTo(x + s - 2, y - s); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y - s + 2);
    ctx.moveTo(x - s, y + s - 2); ctx.lineTo(x - s, y + s); ctx.lineTo(x - s + 2, y + s);
    ctx.moveTo(x + s - 2, y + s); ctx.lineTo(x + s, y + s); ctx.lineTo(x + s, y + s - 2);
    ctx.stroke();
    if (m.label) {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '6px monospace';
      ctx.fillText(m.label, x + s + 2, y + 2);
    }
  }
}

export function drawCockpit(ctx, W, H, d) {
  drawGlassHud(ctx, W, H, d);
  drawCanopy(ctx, W, H);
  drawPanel(ctx, W, H, d);
}

function drawCanopy(ctx, W, H) {
  ctx.fillStyle = '#25212b';
  const t = Math.max(3, W * 0.012);
  // side struts
  for (const side of [-1, 1]) {
    const bx = side < 0 ? W * 0.16 : W * 0.84;
    const tx = side < 0 ? W * 0.015 : W * 0.985;
    ctx.beginPath();
    ctx.moveTo(bx - t, H * 0.82);
    ctx.lineTo(tx - t, H * 0.06);
    ctx.lineTo(tx + t, H * 0.06);
    ctx.lineTo(bx + t, H * 0.82);
    ctx.fill();
  }
  // top bow
  ctx.strokeStyle = '#25212b';
  ctx.lineWidth = t * 1.4;
  ctx.beginPath();
  ctx.moveTo(W * 0.015, H * 0.07);
  ctx.quadraticCurveTo(W * 0.5, H * 0.0, W * 0.985, H * 0.07);
  ctx.stroke();
}

function drawPanel(ctx, W, H, d) {
  const top = H * 0.8;
  // glare shield with a curved top
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.moveTo(W * 0.14, H);
  ctx.lineTo(W * 0.17, top + 6);
  ctx.quadraticCurveTo(W * 0.5, top - 8, W * 0.83, top + 6);
  ctx.lineTo(W * 0.86, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // mode buttons on the shield
  ctx.font = '5px monospace';
  ['NAV', 'AA', 'A/G'].forEach((txt, i) => {
    const bx = W * 0.44 + i * 14;
    ctx.fillStyle = i === 1 ? '#5a5062' : '#3a3442';
    ctx.fillRect(bx, top - 2, 12, 6);
    ctx.fillStyle = INK;
    ctx.fillText(txt, bx + 1, top + 3);
  });

  const r = Math.max(9, Math.round(H * 0.066));
  const cy = Math.round(top + (H - top) / 2 - 1);
  let x = W * 0.2;

  // radar scope
  const rs = r * 2;
  ctx.fillStyle = '#3a2416';
  ctx.fillRect(x, cy - r, rs, rs);
  ctx.strokeStyle = '#6a4a2a';
  ctx.strokeRect(x + 0.5, cy - r + 0.5, rs - 1, rs - 1);
  const rcx = x + r, rcy = cy;
  ctx.strokeStyle = 'rgba(255, 170, 80, 0.45)';
  ctx.beginPath(); ctx.arc(rcx, rcy, r * 0.45, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(rcx, rcy, r * 0.9, 0, Math.PI * 2); ctx.stroke();
  const sweep = d.time * 2.2;
  ctx.strokeStyle = '#ffb05a';
  ctx.beginPath(); ctx.moveTo(rcx, rcy);
  ctx.lineTo(rcx + Math.cos(sweep) * r * 0.9, rcy + Math.sin(sweep) * r * 0.9); ctx.stroke();
  ctx.fillStyle = '#ffd08a';
  for (const e of d.radar) {
    const ex = rcx + e.x * r * 0.9, ey = rcy + e.y * r * 0.9;
    ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2);
  }
  x += rs + r * 0.6;

  // attitude indicator (bigger)
  const ar = r * 1.25;
  const acx = x + ar, acy = cy;
  ctx.save();
  ctx.beginPath(); ctx.arc(acx, acy, ar, 0, Math.PI * 2); ctx.clip();
  ctx.translate(acx, acy);
  ctx.rotate(-d.bank);
  const off = (d.pitch / (Math.PI / 2)) * ar * 1.6;
  ctx.fillStyle = '#d7b9a8'; ctx.fillRect(-ar * 2, -ar * 2 + off, ar * 4, ar * 2);
  ctx.fillStyle = '#7a4a34'; ctx.fillRect(-ar * 2, off, ar * 4, ar * 2);
  ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-ar, off); ctx.lineTo(ar, off); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#d7d0c8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(acx, acy, ar, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ffb05a';
  ctx.beginPath(); ctx.moveTo(acx - ar * 0.5, acy); ctx.lineTo(acx - ar * 0.15, acy);
  ctx.lineTo(acx, acy + 3); ctx.lineTo(acx + ar * 0.15, acy); ctx.lineTo(acx + ar * 0.5, acy); ctx.stroke();
  x += ar * 2 + r * 0.5;

  // round gauges
  const gauges = [
    { label: 'KTS', value: d.speedKt / 800, text: Math.round(d.speedKt) },
    { label: 'HDG', value: d.heading / 360, text: String(Math.round(d.heading)).padStart(3, '0'), compass: true },
    { label: 'ALT', value: (d.altFt % 10000) / 10000, text: Math.round(d.altFt) },
    { label: 'VS', value: 0.5 + Math.max(-0.5, Math.min(0.5, d.vs / 60)), text: Math.round(d.vs * 196.85 / 100) * 100 },
    { label: 'G', value: Math.min(1, d.g / 9), text: d.g.toFixed(1) },
    { label: 'RPM', value: 0.45 + d.throttle * 0.5, text: Math.round(70 + d.throttle * 30) },
  ];
  const gr = r * 0.85;
  const gap = Math.max(2, (W * 0.8 - x - gr * 2 * gauges.length - 14) / gauges.length);
  for (const g of gauges) {
    drawGauge(ctx, x + gr, cy - 1, gr, g);
    x += gr * 2 + gap;
  }

  // throttle bar
  const th = r * 1.8;
  ctx.fillStyle = FACE; ctx.fillRect(x, cy - th / 2, 7, th);
  ctx.strokeStyle = '#4a4452'; ctx.strokeRect(x + 0.5, cy - th / 2 + 0.5, 6, th - 1);
  const ty = cy + th / 2 - 3 - d.throttle * (th - 6);
  ctx.fillStyle = '#e9c27a'; ctx.fillRect(x + 1, Math.round(ty), 5, 2);
}

function drawGauge(ctx, cx, cy, r, g) {
  ctx.fillStyle = FACE;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a8290'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  // ticks
  ctx.strokeStyle = INK_DIM;
  const start = g.compass ? -Math.PI / 2 : Math.PI * 0.75;
  const span = g.compass ? Math.PI * 2 : Math.PI * 1.5;
  for (let i = 0; i <= 10; i++) {
    const a = start + (span * i) / 10;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75);
    ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  const a = start + span * Math.max(0, Math.min(1, g.value));
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(g.label, cx, cy + r * 0.55);
  ctx.fillText(String(g.text), cx, cy + r + 6);
  ctx.textAlign = 'left';
}

function drawGlassHud(ctx, W, H, d) {
  const cx = W / 2;
  const cy = H * 0.42;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 1;
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';

  // heading tape
  const tapeY = H * 0.13;
  const pxPerDeg = W * 0.012;
  ctx.beginPath(); ctx.moveTo(cx - W * 0.14, tapeY); ctx.lineTo(cx + W * 0.14, tapeY); ctx.stroke();
  for (let deg = Math.floor(d.heading / 5) * 5 - 15; deg <= d.heading + 15; deg += 5) {
    const x = cx + (deg - d.heading) * pxPerDeg;
    if (Math.abs(x - cx) > W * 0.14) continue;
    const major = ((deg % 10) + 10) % 10 === 0;
    ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, tapeY); ctx.lineTo(Math.round(x) + 0.5, tapeY + (major ? 4 : 2)); ctx.stroke();
    if (major) ctx.fillText(String(((deg / 10) % 36 + 36) % 36).padStart(2, '0'), x, tapeY - 3);
  }
  ctx.beginPath(); ctx.moveTo(cx, tapeY + 5); ctx.lineTo(cx - 2, tapeY + 8); ctx.lineTo(cx + 2, tapeY + 8); ctx.fill();

  // pitch ladder, rotated by bank
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-d.bank);
  const pxPerRad = H * 1.1;
  for (let deg = -60; deg <= 60; deg += 10) {
    const y = (d.pitch - (deg * Math.PI) / 180) * pxPerRad;
    if (Math.abs(y) > H * 0.3) continue;
    const w = deg === 0 ? W * 0.16 : W * 0.06;
    ctx.setLineDash(deg < 0 ? [2, 2] : []);
    ctx.beginPath();
    ctx.moveTo(-w, y); ctx.lineTo(-W * 0.03, y);
    ctx.moveTo(W * 0.03, y); ctx.lineTo(w, y);
    ctx.stroke();
    if (deg !== 0) {
      ctx.fillText(String(Math.abs(deg)), -w - 6, y + 2);
      ctx.fillText(String(Math.abs(deg)), w + 6, y + 2);
    }
  }
  ctx.setLineDash([]);
  ctx.restore();

  // flight path marker
  ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx - 3, cy); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy - 6); ctx.stroke();

  // speed and altitude boxes
  const boxW = 22, boxH = 9;
  const sx = cx - W * 0.2, ax = cx + W * 0.2;
  ctx.strokeRect(Math.round(sx - boxW / 2) + 0.5, Math.round(cy - boxH / 2) + 0.5, boxW, boxH);
  ctx.strokeRect(Math.round(ax - boxW / 2) + 0.5, Math.round(cy - boxH / 2) + 0.5, boxW, boxH);
  ctx.fillText(String(Math.round(d.speedKt)), sx, cy + 2);
  ctx.fillText(String(Math.round(d.altFt)), ax, cy + 2);
  ctx.fillText('KTS', sx, cy + 13);
  ctx.fillText('FT', ax, cy + 13);

  ctx.fillText(`G ${d.g.toFixed(1)}`, sx, cy + H * 0.13);
  ctx.fillText(`R ${String(Math.round(d.altFt)).padStart(4, '0')}`, ax, cy + H * 0.13);
  ctx.fillText(`MSL ${d.missiles}`, cx, cy + H * 0.16);
  ctx.textAlign = 'left';
}
