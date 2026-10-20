// Generates the app icon, Android adaptive icon layers, notification icon,
// splash image and favicon from one drawing (icon option C: map pin + ₹).
// Run with `npm run icons`. The ₹ is drawn as lines, not text, so the
// result doesn't depend on installed fonts.

const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const TEAL = '#0F766E';
const WHITE = '#FFFFFF';
const OUT = path.join(__dirname, '..', 'assets');

// The pin and the ₹ in a 108 × 108 box, centred on (54, 54).
const PIN = 'M54 18c-15.5 0-28 12.3-28 27.5C26 66 54 90 54 90s28-24 28-44.5C82 30.3 69.5 18 54 18z';

// ₹ inside the pin's circle (centre 54, 45; radius 15).
function rupee(color) {
  return `<g fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M47 37.5h14"/>
    <path d="M47 42.5h14"/>
    <path d="M47 37.5h4.5a5 5 0 0 1 0 10H47"/>
    <path d="M50 47.5l9 7.5"/>
  </g>`;
}

// `scale` shrinks the drawing around the centre (Android's adaptive icon
// keeps the middle 66% safe, so the foreground is drawn smaller).
function glyph({ pinColor, holeColor, rupeeColor, scale = 1 }) {
  const t = `translate(54 54) scale(${scale}) translate(-54 -54)`;
  return `<g transform="${t}">
    <path d="${PIN}" fill="${pinColor}"/>
    <circle cx="54" cy="45" r="15" fill="${holeColor}"/>
    ${rupee(rupeeColor)}
  </g>`;
}

function svg(body, { background } = {}) {
  const bg = background ? `<rect width="108" height="108" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${bg}${body}</svg>`;
}

// For the monochrome and notification icons the ₹ is cut out of a white pin.
function cutoutGlyph(scale) {
  const t = `translate(54 54) scale(${scale}) translate(-54 -54)`;
  return `<defs><mask id="m">
      <rect width="108" height="108" fill="white"/>
      <circle cx="54" cy="45" r="15" fill="black"/>
    </mask></defs>
    <g transform="${t}">
      <path d="${PIN}" fill="${WHITE}" mask="url(#m)"/>
      ${rupee(WHITE)}
    </g>`;
}

const FILES = {
  // Full icon (iOS, Expo tools, store-style previews).
  'icon.png': [
    svg(glyph({ pinColor: WHITE, holeColor: TEAL, rupeeColor: WHITE }), { background: TEAL }),
    1024,
  ],
  // Android adaptive icon: teal background + glyph in the safe zone.
  'android-icon-background.png': [svg('', { background: TEAL }), 1024],
  'android-icon-foreground.png': [
    svg(glyph({ pinColor: WHITE, holeColor: TEAL, rupeeColor: WHITE, scale: 0.7 })),
    1024,
  ],
  // Themed (monochrome) icon: Android tints it, so only the shape matters.
  'android-icon-monochrome.png': [svg(cutoutGlyph(0.7)), 1024],
  // Status-bar notification icon: white shape on transparent.
  'notification-icon.png': [svg(cutoutGlyph(1)), 96],
  // Splash: the glyph alone; the splash background is teal.
  'splash-icon.png': [svg(glyph({ pinColor: WHITE, holeColor: TEAL, rupeeColor: WHITE })), 512],
  'favicon.png': [
    svg(glyph({ pinColor: WHITE, holeColor: TEAL, rupeeColor: WHITE }), { background: TEAL }),
    48,
  ],
};

// The join-link web page (Firebase Hosting) uses the same icons.
const WEB = path.join(__dirname, '..', 'firebase', 'hosting');
const WEB_FILES = { 'icon.png': [FILES['icon.png'][0], 192], 'favicon.png': FILES['favicon.png'] };

function render(dir, files) {
  for (const [name, [source, size]] of Object.entries(files)) {
    const png = new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
    fs.writeFileSync(path.join(dir, name), png);
    const where = path.relative(path.join(__dirname, '..'), dir).replaceAll('\\', '/');
    console.log(`${where}/${name} (${size}×${size})`);
  }
}

render(OUT, FILES);
render(WEB, WEB_FILES);
