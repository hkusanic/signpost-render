// Signpost's own OG banner. The landing page itself uses this — the page
// you ship eats its own dog food, which is a fair test of whether the
// product holds up under real use.
//
// Usage:
//   /render/signpost-banner?title=...&subtitle=...
//
// Render dimensions default to 1200×630 (the OG-image standard).

export default function signpostBanner({
  title = 'Signpost',
  subtitle = 'OG images that live in your repo, not in some other company\u2019s dashboard.',
  accent = '#2a5bd7',
} = {}) {
  return `
    <div style="
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      padding: 60px 72px;
      background: linear-gradient(135deg, #fafaf7 0%, #f1f1ec 100%);
      font-family: Inter, sans-serif;
      color: #1a1a1a;
    ">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          background: ${accent};
          border-radius: 12px;
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
        ">S</div>
        <span style="font-size: 28px; font-weight: 700;">Signpost</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div style="
          font-size: 76px;
          font-weight: 700;
          line-height: 1.05;
          letter-spacing: -0.02em;
          color: #1a1a1a;
        ">${escapeHtml(title)}</div>
        <div style="
          font-size: 32px;
          line-height: 1.35;
          color: #5c5c5c;
          max-width: 920px;
        ">${escapeHtml(subtitle)}</div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 22px; color: #5c5c5c;">$4 / month \u00b7 self-host AGPL</span>
        <span style="
          padding: 10px 20px;
          border-radius: 6px;
          background: ${accent};
          color: #ffffff;
          font-size: 22px;
          font-weight: 600;
        ">signpost.daystorm.institute</span>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
