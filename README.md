# Foresight Website

Static marketing site for Foresight, the healthcare neolab building medical superintelligence. Plain HTML, CSS and JavaScript. There is no framework, no npm and no build step.

## Structure

```
index.html    Page markup, metadata, links to the stylesheet and script
styles.css    All styling
main.js       Figma-exported WebGPU grain shaders, shader host, rail and scroll-linked "You stay in control" interactions
assets/
  hero.jpg    Hero photograph (referenced from styles.css)
```

Fonts (EB Garamond, Geist, Geist Mono, Inter, JetBrains Mono) load from Google Fonts. The `Portrait` serif named in `styles.css` is not bundled, so the page falls back to EB Garamond.

## Run locally

Opening `index.html` directly mostly works, but serving over HTTP matches production. WebGPU (used for the grain panels) needs HTTPS or `localhost`.

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy

Any static host works. On Vercel, import the repository and leave the framework preset as "Other", with no build command and no output directory.

## Notes

- The grain panels use WebGPU, so they render only in browsers that support it.
- To finish the social metadata after deploying, add `og:url` and an absolute `og:image` to `index.html`.
