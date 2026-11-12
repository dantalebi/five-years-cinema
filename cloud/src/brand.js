// TVC15's logo, drawn as shapes so it looks the same everywhere (the app, the icons, the share image) and needs no font.
// The wordmark: TVC in the ink colour, 15 in channel green, the C and the 5 rounded like the corners of a TV screen.
// The mark: a TV screen showing the test card's colour bars, tuned to channel 15 (the number in the corner, as a TV
// shows it when you change channel).
const FX_BRAND = (() => {
  const BARS = ['#C9CFCB', '#E8C547', '#3FC1D0', '#4BE37E', '#D978C4', '#EF6B5A', '#7D90F2'];
  const OSD = '#4BE37E', GLASS = '#121D1B', BEZEL = '#0A1211';
  // letters on a 100-unit cap height, 22-unit strokes
  const T = '<path d="M0 0h112v22H0z"/><path d="M45 0h22v100H45z"/>';
  const V = '<path d="M124 0h24l36 74 36-74h24l-48 100h-24z"/>';
  const C = '<path fill="none" stroke-width="22" d="M368 11h-71a30 30 0 0 0-30 30v18a30 30 0 0 0 30 30h71"/>';
  const ONE = '<path d="M404 0h22v100h-22V27l-18 11-9-17z"/>';
  const FIVE = '<path fill="none" stroke-width="22" stroke-linejoin="miter" d="M541 11h-90v39h56a19.5 19.5 0 0 1 0 39h-67"/>';
  // the wordmark, `h` pixels tall (the width follows: 5.41 × h)
  function word(o) {
    o = o || {};
    const ink = o.ink || 'currentColor', on = o.on || OSD, h = o.h || 20;
    return `<svg class="${o.cls || 'fx-word'}" viewBox="0 0 541 100" width="${Math.round(h * 5.41)}" height="${h}" role="img" aria-label="TVC15" focusable="false">` +
      `<g fill="${ink}" stroke="${ink}" stroke-width="0">${T}${V}</g><g stroke="${ink}">${C}</g>` +
      `<g fill="${on}">${ONE}</g><g stroke="${on}">${FIVE}</g></svg>`;
  }
  // "15" alone, for the mark's corner (the digits from the wordmark, moved to the origin)
  const digits = (w = 0) => `<g transform="translate(-377 0)"><path stroke-width="${w}" stroke-linejoin="round" d="${ONE.match(/d="([^"]+)"/)[1]}"/><path fill="none" stroke-width="${22 + w}" stroke-linejoin="${w ? 'round' : 'miter'}" d="${FIVE.match(/d="([^"]+)"/)[1]}"/></g>`;
  // the screen: a 120 × 96 box. `osd`: draw the 15 (left out on the smallest icons, where it would be a smudge)
  function screen(o) {
    o = o || {};
    const bars = BARS.map((c, i) => `<rect x="${12 + i * 13.714}" y="12" width="13.8" height="48" fill="${c}"/>`).join('');
    const low = [['#7D90F2', 2], [GLASS, 1], ['#D978C4', 2], [GLASS, 1], ['#3FC1D0', 2], [GLASS, 1], ['#C9CFCB', 1]];
    let x = 12; const tot = low.reduce((a, l) => a + l[1], 0);
    const lows = low.map(([c, w]) => { const r = `<rect x="${x}" y="60" width="${96 * w / tot + .2}" height="7" fill="${c}"/>`; x += 96 * w / tot; return r; }).join('');
    const pluge = `<rect x="12" y="67" width="20" height="17" fill="#1E2C70"/><rect x="32" y="67" width="20" height="17" fill="#EEF3EF"/><rect x="52" y="67" width="20" height="17" fill="#3B2470"/><rect x="72" y="67" width="36" height="17" fill="${GLASS}"/>`;
    const osd = o.osd === false ? '' : `<g transform="translate(71 18) scale(.205)"><g stroke="${BEZEL}" fill="${BEZEL}">${digits(20)}</g><g fill="${OSD}" stroke="${OSD}">${digits()}</g></g>`;
    return `<defs><clipPath id="fxscr${o.id || ''}"><rect x="12" y="12" width="96" height="72" rx="17" ry="20"/></clipPath></defs>` +
      `<rect x="2" y="2" width="116" height="92" rx="27" ry="31" fill="${BEZEL}"/><rect x="2" y="2" width="116" height="92" rx="27" ry="31" fill="none" stroke="#2B3D3A" stroke-width="3"/>` +
      `<g clip-path="url(#fxscr${o.id || ''})"><rect x="12" y="12" width="96" height="72" fill="${GLASS}"/>${bars}${lows}${pluge}</g>${osd}`;
  }
  function mark(o) {
    o = o || {};
    const h = o.h || 24;
    return `<svg class="${o.cls || 'fx-mark'}" viewBox="0 0 120 96" width="${Math.round(h * 1.25)}" height="${h}" aria-hidden="true" focusable="false">${screen(o)}</svg>`;
  }
  return {word, mark, screen, BARS, OSD, GLASS, BEZEL};
})();
if (typeof module !== 'undefined') module.exports = FX_BRAND;
