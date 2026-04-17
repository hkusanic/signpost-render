# Signpost Render

Git-native OG image renderer. Commit a JSX or HTML template to your repo, get a social card API.

Built on [Satori](https://github.com/vercel/satori) (MIT) with an optional [Takumi](https://github.com/nicktomlin/takumi) Rust engine for higher throughput.

## Quick start (Docker)

```bash
docker run -p 8080:8080 hkusanic/signpost-render
```

Then render an image:

```
curl http://localhost:8080/render/signpost-banner?title=Hello > card.png
```

## Quick start (Node)

```bash
git clone https://github.com/hkusanic/signpost-render.git
cd signpost-render
npm ci
npm start
```

## How it works

1. **Add a template** to `templates/` — a `.js` file that exports a default function returning an HTML string:

```js
// templates/blog-post.js
export default function ({ title, author }) {
  return `
    <div style="display:flex; flex-direction:column; padding:48px;">
      <h1 style="font-size:72px;">${title}</h1>
      <p style="font-size:32px; color:#777;">by ${author}</p>
    </div>
  `;
}
```

2. **Request a render:**

```
GET /render/blog-post?title=Hello&author=John
```

Returns a PNG. First render ~500ms, cached renders ~1ms.

3. **Use in your HTML:**

```html
<meta property="og:image" content="https://your-host/render/blog-post?title=Hello&author=John">
```

## Configuration

All via environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |
| `TEMPLATES_DIR` | `./templates` | Path to template directory |
| `CACHE_DIR` | `./.cache` | Disk cache directory |
| `FONTS_DIR` | `./vendor/fonts` | Font files directory |
| `CACHE_MAX_BYTES` | `536870912` (512 MiB) | Max disk cache size |
| `RENDER_TIMEOUT_MS` | `5000` | Per-render timeout |
| `RENDER_ENGINE` | `satori` | `satori` or `takumi` |
| `MEMORY_CACHE_ITEMS` | `200` | L1 in-memory LRU size |

## Architecture

- **L1 cache**: in-memory LRU (microsecond hits)
- **L2 cache**: disk-backed by content-addressed SHA256 keys with 2-byte fanout
- **Stampede guard**: concurrent requests for the same cold key coalesce into one render
- **ETag / If-None-Match**: 304 responses for repeat crawlers
- **Two engines**: Satori (default, JS) or Takumi (Rust, ~1.45x faster cache-miss throughput)

## CLI

```bash
node src/cli.js render templates/blog-post.js -p title=Hello -p author=John -o card.png
```

## Hosted version

Don't want to self-host? [Signpost](https://signpost.daystorm.institute) offers a hosted version starting at $4/month for 500 renders.

## License

AGPL-3.0 — see [LICENSE](LICENSE). Personal and company-internal use is unrestricted. The AGPL clause activates when you offer Signpost as a service to third parties.
