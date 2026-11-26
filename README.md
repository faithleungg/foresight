# Foresight Website

Static marketing site for Foresight, the healthcare neolab building medical superintelligence. Plain HTML, CSS and JavaScript. There is no framework, no npm and no build step.

## Pages

| Page | File | What's on it |
| --- | --- | --- |
| Home | `index.html` | Hero placeholder, intro statement, "Two ways" cards linking to the two product pages, models diagram, "You stay in control" |
| Medical Superintelligence | `medical-superintelligence.html` | Photo hero, clinical evidence tabs, model training methods, models diagram, "Never finished" loop graphic |
| Care Management | `care-management.html` | Photo hero, the challenge, three programs, "We run the program" tiles, why partner, revenue call to action with estimate chart |
| Company | `company.html` | Photo hero, founder letter, vision |

The designs come from the Figma file "Web Revamp" (section "Wednesday", node 244:14233). Each page is a labelled frame in that section.

## Hybrid branch

This branch tests light paper bands alternating with black bands (Figma 258:16154). The paper is the animated "Foresight BG · Dappled" shader on one fixed canvas behind each page. Sections opt in with `tone-light` or `tone-dark`. The rail switches between light and dark ink as it passes over each band. All of the theme's CSS sits in the "HYBRID" block at the end of `styles.css`.

## Structure

```
index.html                       Home
medical-superintelligence.html   Medical Superintelligence
care-management.html             Care Management
company.html                     Company
styles.css                       All styling (shared rail, footer, and a block per page)
main.js                          Shared scripts: WebGPU grain shaders and shader host, rail state,
                                 "You stay in control" scroll interaction, models-diagram bead animation
msi.js                           Medical Superintelligence only: evidence tabs, loop graphic
assets/
  card-cm.jpg                    Corridor photo (Care Management card and hero)
  msi/                           Medical Superintelligence hero, tab icons, Mayo Clinic logo, diagram icon
  cm/                            Care Management photo, program and benefit icons, "We run the program" tiles
  company/                       Company hero and vision graphic
  icons/                         Model training icons
  graphics/                      Estimate chart
```

Fonts (EB Garamond, Geist, Geist Mono, Inter, JetBrains Mono) load from Google Fonts. The `Portrait` serif named in `styles.css` is not bundled, so the pages fall back to EB Garamond.

## Animations

- **Grain shaders:** every `canvas[data-shader]` is drawn by the WebGPU shader host in `main.js` (`emi` and `control` variants, the Figma "Foresight Grain Dunes" module). Canvases must be absolutely positioned inside their section. Used behind the models diagram, the "You stay in control" stack and every footer (60% opacity).
- **Models diagram:** beads flow from Foresight-1 through each card to the outcomes pill in mint, pause for a second, then flow back in white. Paths are measured from the page, so they follow the layout at any width.
- **Loop graphic** ("Never finished"): redraws to its own width; beads are mint and yellow.
- All motion is switched off for visitors who prefer reduced motion.

## Run locally

Opening the HTML files directly mostly works, but serving over HTTP matches production. WebGPU (used for the grain) needs HTTPS or `localhost`.

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy

Any static host works.

- **GitHub Pages:** Settings → Pages → Deploy from a branch, then pick the branch and `/ (root)`.
- **Vercel:** import the repository and leave the framework preset as "Other", with no build command and no output directory.

## Still to do

- Care Management: real phone number for "Call us" and a booking link for "Book a call" (both are placeholders).
- Medical Superintelligence: the Physicians and Medical Knowledge tab descriptions are filler copy.
- Care Management: the challenge copy repeats itself, and the Remote Patient Monitoring description is reused from the Hindsight Distillation method. Both are as in Figma.
- Home: the hero is a grey placeholder until its content is designed.
- Footer: "Join Us" and "Contact" aren't links yet.
- Social metadata: add `og:url` and an absolute `og:image` to each page after deploying.
- The grain renders only in browsers that support WebGPU.
- `assets/hero.jpg` is no longer used (the home hero is a placeholder).
