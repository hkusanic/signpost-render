// Documentation page card — for dev docs, API references, guides.
//
// Usage:
//   /render/docs-page?title=Getting Started&section=Quick Start&site=docs.example.com

export default function docsPage({
  title = 'Documentation',
  section = '',
  site = '',
  accent = '#2563eb',
} = {}) {
  return `
    <div style="
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      padding: 72px 80px;
      background: #ffffff;
      font-family: Inter, sans-serif;
      color: #1e293b;
      border-left: 8px solid ${accent};
    ">
      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${section ? `<span style="
          font-size: 22px;
          font-weight: 600;
          color: ${accent};
          text-transform: uppercase;
          letter-spacing: 0.05em;
        ">${escapeHtml(section)}</span>` : ''}
        <div style="
          font-size: 60px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
        ">${escapeHtml(title)}</div>
      </div>

      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="
          font-size: 20px;
          color: #94a3b8;
          font-family: 'SF Mono', Menlo, monospace;
        ">${site ? escapeHtml(site) : 'docs'}</span>
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
