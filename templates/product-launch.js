// Product launch / announcement card.
//
// Usage:
//   /render/product-launch?name=Acme&tagline=Ship faster&version=v2.0&accent=%23ff6b35

export default function productLaunch({
  name = 'Product',
  tagline = '',
  version = '',
  accent = '#ff6b35',
} = {}) {
  return `
    <div style="
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      padding: 80px;
      background: linear-gradient(135deg, ${accent}15 0%, ${accent}05 100%);
      font-family: Inter, sans-serif;
      color: #1a1a1a;
      text-align: center;
    ">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 24px;">
        ${version ? `<span style="
          padding: 8px 20px;
          border-radius: 20px;
          background: ${accent};
          color: #ffffff;
          font-size: 20px;
          font-weight: 600;
        ">${escapeHtml(version)}</span>` : ''}

        <div style="
          font-size: 80px;
          font-weight: 800;
          line-height: 1.0;
          letter-spacing: -0.03em;
        ">${escapeHtml(name)}</div>

        ${tagline ? `<div style="
          font-size: 32px;
          line-height: 1.3;
          color: #5c5c5c;
          max-width: 800px;
        ">${escapeHtml(tagline)}</div>` : ''}
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
