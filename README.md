<p align="center">
  <strong>Signpost Render</strong><br>
  Git-native OG image renderer. Commit a template, get a social card API.
</p>

<p align="center">
  <a href="https://github.com/hkusanic/signpost-render/actions/workflows/ci.yml"><img src="https://github.com/hkusanic/signpost-render/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/hkusanic/signpost-render/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License"></a>
  <a href="https://hub.docker.com/r/hkusanic/signpost-render"><img src="https://img.shields.io/docker/pulls/hkusanic/signpost-render" alt="Docker pulls"></a>
  <a href="https://signpost.daystorm.institute"><img src="https://img.shields.io/badge/hosted-signpost.daystorm.institute-brightgreen" alt="Hosted version"></a>
</p>

---

Signpost renders OG images from templates you keep in your Git repo. No dashboard, no vendor lock-in. Built on [Satori](https://github.com/vercel/satori) (MIT) with an optional [Takumi](https://github.com/nicktomlin/takumi) Rust engine for higher throughput.

**Try it now** — this URL returns a real PNG:

![Example OG image rendered by Signpost](https://og.daystorm.institute/render/signpost-banner?title=OG%20images%20that%20live%20in%20your%20repo&subtitle=Commit%20a%20template%2C%20get%20a%20social%20card.%20%244%2Fmo%20or%20self-host.)

```
https://og.daystorm.institute/render/signpost-banner?title=Hello%20World&subtitle=Your%20first%20social%20card
```

## Quick start

### Docker (recommended)

```bash
docker run -p 8080:8080 hkusanic/signpost-render
curl http://localhost:8080/render/signpost-banner?title=Hello > card.png
open card.png
```

### Node.js

```bash
git clone https://github.com/hkusanic/signpost-render.git
cd signpost-render
npm ci
npm start
# http://localhost:8080/render/signpost-banner?title=Hello
```

## How it works

**1. Add a template** to `templates/` — a JS file that returns an HTML string:

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

**2. Request a render:**

```
GET /render/blog-post?title=Hello&author=John
```

Returns a PNG. First render ~500ms, cached renders ~1ms.

**3. Drop the URL in your `<head>`:**

```html
<meta property="og:image" content="https://your-host/render/blog-post?title=Hello&author=John">
```

That's it. Share the page on Twitter/Slack/LinkedIn and the card appears.

## Why Signpost?

| | Bannerbear / Placid | @vercel/og | DIY Satori | **Signpost** |
|---|---|---|---|---|
| Price | $19-49/mo | Free (Vercel only) | Your time | **$4/mo or free self-host** |
| Templates | Their dashboard | Code | Code | **Your repo** |
| Vendor lock-in | Yes | Vercel | No | **No** |
| Caching | Theirs | Edge | You build it | **Built in (L1+L2+stampede guard)** |

## Architecture

- **L1 cache**: in-memory LRU (microsecond hits)
- **L2 cache**: disk-backed by content-addressed SHA256 keys with 2-byte fanout
- **Stampede guard**: concurrent requests for the same cold key coalesce into one render
- **ETag / If-None-Match**: 304 responses for repeat crawlers
- **Two engines**: Satori (default, JS) or Takumi (Rust, ~1.45x faster cache-miss throughput)

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

## CLI

Preview renders locally before pushing:

```bash
node src/cli.js render templates/blog-post.js -p title=Hello -p author=John -o card.png
```

## Hosted version

Don't want to self-host? [signpost.daystorm.institute](https://signpost.daystorm.institute) — $4/month for 500 renders, $0.01 overage. Free tier: 50 renders/month, no card required.

## Contributing

PRs welcome. The codebase is small (~600 LOC across 5 files in `src/`). Run tests with `npm test`.

## License

[AGPL-3.0](LICENSE). Personal and company-internal use is unrestricted. The AGPL clause activates when you offer Signpost as a network service to third parties.
