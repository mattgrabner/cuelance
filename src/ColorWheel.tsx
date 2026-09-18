import React, { useState } from 'react';

export function hsvToHex(h: number, s: number, v: number) {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
}
function fromHex(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : d / max, v: max };
}
export function ColorWheel({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const [hsv, setHsv] = useState(() => fromHex(color));
  const update = (next: typeof hsv) => { setHsv(next); onChange(hsvToHex(next.h, next.s, next.v)); };
  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
    const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
    update({ ...hsv, h: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360, s: Math.min(1, Math.hypot(x, y)) });
  };
  return <>
    <div className="hue-wheel" role="slider" tabIndex={0} aria-label="Accent color wheel" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsv.h)} aria-valuetext={`Hue ${Math.round(hsv.h)} degrees, saturation ${Math.round(hsv.s * 100)} percent`} aria-describedby="wheel-instructions"
      onPointerDown={(event) => { if (event.button !== 0) return; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); pick(event); }}
      onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event); }}
      onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onKeyDown={(event) => {
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 2;
        update({ ...hsv, h: (hsv.h + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0) + 360) % 360,
          s: event.key === 'Home' ? 0 : event.key === 'End' ? 1 : Math.max(0, Math.min(1, hsv.s + (event.key === 'ArrowUp' ? .025 : event.key === 'ArrowDown' ? -.025 : 0))) });
      }}>
      <div className="wheel-dim" style={{ opacity: 1 - hsv.v }} />
      <span className="wheel-thumb" style={{ left: `${50 + Math.cos(hsv.h * Math.PI / 180) * hsv.s * 50}%`, top: `${50 + Math.sin(hsv.h * Math.PI / 180) * hsv.s * 50}%`, background: color }} />
    </div>
    <label className="brightness-control">Brightness<input type="range" min="0" max="100" value={Math.round(hsv.v * 100)} onChange={(event) => update({ ...hsv, v: Number(event.target.value) / 100 })} style={{ background: `linear-gradient(to right, #000, ${hsvToHex(hsv.h,hsv.s,1)})` }} /></label>
    <div className="wheel-value"><span style={{ background: color }} /><output>{color.toUpperCase()}</output></div>
    <span id="wheel-instructions" className="sr-only">Drag to choose hue and saturation. Left and right arrows change hue; up and down change saturation.</span>
  </>;
}
