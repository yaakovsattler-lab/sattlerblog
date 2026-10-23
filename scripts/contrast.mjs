/* WCAG contrast, computed - never eyeballed. Usage: node scripts/contrast.mjs [#fg #bg ...] */
export function lum(hex) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function ratio(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
/** flatten a foreground at `alpha` over `bg` */
export function over(fg, bg, alpha) {
  const p = (h) => { const n = h.replace("#",""); const s = n.length===3?n.split("").map(c=>c+c).join(""):n;
    return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16)); };
  const [fr,fg2,fb]=p(fg), [br,bg2,bb]=p(bg);
  const mix=(f,b)=>Math.round(f*alpha+b*(1-alpha));
  return "#"+[mix(fr,br),mix(fg2,bg2),mix(fb,bb)].map(v=>v.toString(16).padStart(2,"0")).join("");
}
if (process.argv[2]) {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    console.log(`${args[i]} on ${args[i+1]}  ${ratio(args[i], args[i+1]).toFixed(2)}:1`);
  }
}
