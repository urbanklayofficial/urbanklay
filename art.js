// Brand artwork drawn in SVG: the print patterns and garment silhouettes used
// whenever a real photo or Printful mockup isn't available yet.
let uid = 0;

const PATTERNS = {
  hex: (id) => `
    <pattern id="${id}" width="34" height="58.9" patternUnits="userSpaceOnUse" patternTransform="scale(.9)">
      <rect width="34" height="58.9" fill="#0B0B0B"/>
      <path d="M17 0l17 9.8v19.6L17 39.3 0 29.4V9.8z M17 39.3v19.6 M0 9.8v-9.8 M34 9.8v-9.8" fill="none" stroke="#C9A227" stroke-width="1.6"/>
    </pattern>`,
  marble: (id) => `
    <filter id="${id}f" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency=".012 .028" numOctaves="4" seed="${(uid * 7) % 97}"/>
      <feDisplacementMap in="SourceGraphic" scale="90"/>
    </filter>
    <pattern id="${id}" width="400" height="500" patternUnits="userSpaceOnUse">
      <rect width="400" height="500" fill="#F1EAD2"/>
      <g filter="url(#${id}f)">
        <ellipse cx="90" cy="120" rx="120" ry="40" fill="#D19A2B" transform="rotate(-24 90 120)"/>
        <ellipse cx="300" cy="230" rx="140" ry="34" fill="#55595c" transform="rotate(18 300 230)"/>
        <ellipse cx="140" cy="360" rx="150" ry="30" fill="#D19A2B" opacity=".85" transform="rotate(-12 140 360)"/>
        <ellipse cx="320" cy="440" rx="110" ry="26" fill="#7A7A78" transform="rotate(30 320 440)"/>
        <ellipse cx="220" cy="70" rx="90" ry="16" fill="#7A7A78" opacity=".7"/>
      </g>
    </pattern>`,
  splash: (id) => {
    let dots = "";
    let s = 9301 + uid * 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 70; i++) {
      const c = i % 3 === 0 ? "#F3D23C" : i % 3 === 1 ? "#E85A9B" : "#F1EAD2";
      dots += `<circle cx="${(rnd() * 400).toFixed(1)}" cy="${(rnd() * 500).toFixed(1)}" r="${(rnd() ** 3 * 22 + 1.5).toFixed(1)}" fill="${c}"/>`;
    }
    return `<pattern id="${id}" width="400" height="500" patternUnits="userSpaceOnUse"><rect width="400" height="500" fill="#0B0B0B"/>${dots}</pattern>`;
  },
  rose: (id) => `
    <pattern id="${id}" width="56" height="56" patternUnits="userSpaceOnUse">
      <rect width="56" height="56" fill="#121110"/>
      <use href="#rose" x="10" y="10" width="20" height="20" color="#8E1B2B"/>
      <use href="#rose" x="38" y="38" width="14" height="14" color="#C9A227"/>
    </pattern>`,
  bone: (id) => `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#E9E1C8"/></pattern>`,
  noir: (id) => `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#161615"/></pattern>`,
  concrete: (id) => `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#6f6f6d"/></pattern>`
};

const SHAPES = {
  hoodie: {
    body: "M142 74C150 40 250 40 258 74L300 90C330 100 344 120 351 150L380 330 338 342 318 214 316 444H84L82 214 62 342 20 330 49 150C56 120 70 100 100 90Z",
    detail: `<ellipse cx="200" cy="92" rx="40" ry="26" fill="#000" opacity=".35"/>
      <path d="M128 336H272L286 402H114Z" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
      <path d="M86 426H314M190 112l-6 70M210 112l6 70" stroke="#000" stroke-opacity=".22" stroke-width="2" fill="none"/>`,
    chest: [128, 150]
  },
  crewneck: {
    body: "M158 66C176 92 224 92 242 66L300 86C330 98 344 120 351 150L380 330 338 342 318 214 316 444H84L82 214 62 342 20 330 49 150C56 120 70 98 100 86Z",
    detail: `<path d="M158 66C176 92 224 92 242 66" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="7"/>
      <path d="M86 426H314" stroke="#000" stroke-opacity=".22" stroke-width="2"/>`,
    chest: [130, 140]
  },
  tee: {
    body: "M152 64C172 90 228 90 248 64L318 86 372 150 330 184 306 164 306 448H94L94 164 70 184 28 150 82 86Z",
    detail: `<path d="M152 64C172 90 228 90 248 64" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="6"/>`,
    chest: [130, 132]
  },
  jogger: {
    body: "M120 44H280L302 254 294 462H230L206 168H194L170 462H106L98 254Z",
    detail: `<path d="M120 70H280M106 438H170M230 438H294" stroke="#000" stroke-opacity=".25" stroke-width="3"/>
      <path d="M150 70v40M250 70v40" stroke="#000" stroke-opacity=".2" stroke-width="2"/>`,
    chest: [126, 96]
  },
  slides: {
    body: "M70 90C70 50 160 50 160 90V420C160 460 70 460 70 420ZM240 70C240 30 330 30 330 70V400C330 440 240 440 240 400Z",
    detail: `<rect x="56" y="130" width="118" height="92" rx="20" fill="#0B0B0B" stroke="#C9A227" stroke-opacity=".5"/>
      <rect x="226" y="110" width="118" height="92" rx="20" fill="#0B0B0B" stroke="#C9A227" stroke-opacity=".5"/>
      <use href="#rose" x="100" y="160" width="30" height="30" color="#C9A227"/>
      <use href="#rose" x="270" y="140" width="30" height="30" color="#C9A227"/>`,
    chest: null
  }
};

export function categoryOf(name = "") {
  const n = name.toLowerCase();
  if (/slide|sandal/.test(n)) return "slides";
  if (/high ?top|low ?top|sneaker|runner|trainer|shoe|boot/.test(n)) return "shoes";
  if (/snapback|cap\b|hat\b|beanie|bucket/.test(n)) return "hat";
  if (/jogger|sweatpant|pant|short|legging/.test(n)) return "jogger";
  if (/hoodie|hooded/.test(n)) return "hoodie";
  if (/jacket|coat|windbreaker/.test(n)) return "jacket";
  if (/crew|sweatshirt|pullover/.test(n)) return "crewneck";
  if (/tee|t-shirt|shirt|tank|top/.test(n)) return "tee";
  return "hoodie";
}

export function garmentSVG(kind = "hoodie", pattern = "noir", { emblem = true } = {}) {
  const id = `uk${++uid}`;
  const shape = SHAPES[kind] || (kind === "jacket" ? SHAPES.crewneck : kind === "shoes" ? SHAPES.slides : SHAPES.hoodie);
  const pat = (PATTERNS[pattern] || PATTERNS.noir)(id);
  const light = pattern === "bone" || pattern === "marble";
  const chest = emblem && shape.chest && pattern !== "rose"
    ? `<use href="#rose" x="${shape.chest[0] + 100}" y="${shape.chest[1]}" width="34" height="34" color="${light ? "#8E1B2B" : "#C9A227"}"/>`
    : "";
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
    <defs>${pat}
      <radialGradient id="${id}bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${light ? "#2a2723" : "#23211d"}"/><stop offset="1" stop-color="#0e0e0d"/></radialGradient>
      <linearGradient id="${id}sh" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
    </defs>
    <rect width="400" height="500" fill="url(#${id}bg)"/>
    <ellipse cx="200" cy="470" rx="170" ry="16" fill="#000" opacity=".5"/>
    <g transform="translate(20 10) scale(.9)">
      <path d="${shape.body}" fill="url(#${id})" stroke="rgba(241,234,210,.18)" stroke-width="1.5"/>
      <path d="${shape.body}" fill="url(#${id}sh)"/>
      ${shape.detail}${chest}
    </g>
  </svg>`;
}

export function patternPanel(pattern = "hex", label = "") {
  const id = `uk${++uid}`;
  const pat = (PATTERNS[pattern] || PATTERNS.hex)(id);
  return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">
    <defs>${pat}<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset=".4" stop-color="#0B0B0B" stop-opacity="0"/><stop offset="1" stop-color="#0B0B0B" stop-opacity=".85"/></linearGradient></defs>
    <rect width="300" height="400" fill="url(#${id})"/>
    <rect width="300" height="400" fill="url(#${id}v)"/>
    ${pattern === "bone" ? `<use href="#rose" x="40" y="50" width="220" height="220" color="#8E1B2B" opacity=".55"/>` : ""}
    <use href="#rose" x="120" y="300" width="60" height="60" color="#C9A227" opacity=".9"/>
  </svg>`;
}
