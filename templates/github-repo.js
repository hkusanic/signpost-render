// GitHub-style repository card — dark theme.
//
// Usage:
//   /render/github-repo?name=signpost-render&description=Git-native OG image renderer&language=JavaScript&stars=42

export default function githubRepo({
  name = 'my-repo',
  description = '',
  language = '',
  stars = '',
  accent = '#58a6ff',
} = {}) {
  const langColors = {
    javascript: '#f1e05a',
    typescript: '#3178c6',
    python: '#3572a5',
    go: '#00add8',
    rust: '#dea584',
    java: '#b07219',
    ruby: '#701516',
  };
  const langColor = langColors[language?.toLowerCase()] || '#8b949e';

  return `
    <div style="
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 100%;
      height: 100%;
      padding: 72px 80px;
      background: #0d1117;
      font-family: Inter, sans-serif;
      color: #c9d1d9;
    ">
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px; color: #8b949e;">repo</span>
        </div>
        <div style="
          font-size: 56px;
          font-weight: 700;
          line-height: 1.1;
          color: ${accent};
        ">${escapeHtml(name)}</div>
        ${description ? `<div style="
          font-size: 28px;
          line-height: 1.4;
          color: #8b949e;
          max-width: 900px;
        ">${escapeHtml(description)}</div>` : ''}
      </div>

      <div style="display: flex; align-items: center; gap: 32px;">
        ${language ? `<div style="display: flex; align-items: center; gap: 8px;">
          <div style="
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: ${langColor};
          "></div>
          <span style="font-size: 20px;">${escapeHtml(language)}</span>
        </div>` : ''}
        ${stars ? `<div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 20px; color: #8b949e;">&#9733;</span>
          <span style="font-size: 20px;">${escapeHtml(stars)}</span>
        </div>` : ''}
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
