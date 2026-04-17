// Reference template — renders a "blog post" social card.
//
// Usage:
//   /render/blog-post-card?title=...&author=...&date=...&site=...

export default function blogPostCard({
  title = 'Untitled',
  author = 'Unknown',
  date = '',
  site = '',
  accent = '#1a1a1a',
} = {}) {
  return `
    <div style="
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      padding: 80px;
      background: #ffffff;
      font-family: Inter, sans-serif;
      color: ${accent};
    ">
      <div style="
        font-size: 64px;
        font-weight: 700;
        line-height: 1.1;
        letter-spacing: -0.02em;
      ">${escapeHtml(title)}</div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="font-size: 30px; color: #5c5c5c;">
          by ${escapeHtml(author)}${date ? ` \u00b7 ${escapeHtml(date)}` : ''}
        </div>
        ${
          site
            ? `<div style="font-size: 24px; color: #999;">${escapeHtml(site)}</div>`
            : ''
        }
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
