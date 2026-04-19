// Changelog / release announcement card.
//
// Usage:
//   /render/changelog-entry?version=v2.1.0&title=Dark mode support&date=2026-04-22&tag=feature

export default function changelogEntry({
  version = 'v1.0.0',
  title = 'What\'s new',
  date = '',
  tag = '',
  accent = '#10b981',
} = {}) {
  const tagColors = {
    feature: '#10b981',
    fix: '#f59e0b',
    breaking: '#ef4444',
    security: '#8b5cf6',
  };
  const tagColor = tagColors[tag?.toLowerCase()] || accent;

  return `
    <div style="
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      padding: 72px 80px;
      background: #0f172a;
      font-family: Inter, sans-serif;
      color: #f1f5f9;
    ">
      <div style="display: flex; align-items: center; gap: 16px;">
        <span style="
          font-size: 32px;
          font-weight: 700;
          font-family: 'SF Mono', Menlo, monospace;
          color: ${tagColor};
        ">${escapeHtml(version)}</span>
        ${tag ? `<span style="
          padding: 6px 14px;
          border-radius: 20px;
          background: ${tagColor}22;
          color: ${tagColor};
          font-size: 18px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        ">${escapeHtml(tag)}</span>` : ''}
      </div>

      <div style="
        font-size: 64px;
        font-weight: 700;
        line-height: 1.1;
        letter-spacing: -0.02em;
      ">${escapeHtml(title)}</div>

      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 22px; color: #94a3b8;">${date ? escapeHtml(date) : ''}</span>
        <span style="font-size: 22px; color: #64748b;">Changelog</span>
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
