# Foresight Website: variant preview

This branch is a **review build**: four versions of the site side by side, with a floating
**Hybrid 1 / Hybrid 2 / Beige / Teal** switch (`switch.js`, not part of the site) that jumps to the same page
and scroll position in another version.

| Folder | Version | Built from branch |
| --- | --- | --- |
| `hybrid-1/` | Hybrid: light paper and black bands, glyph fields | `hybrid-1` |
| `hybrid-2/` | Hybrid with a different light/dark split | `hybrid-2` |
| `beige/` | Hybrid with sand accents and grain | `beige` |
| `teal/` | Hybrid with light-teal accents | `teal` |

The root `index.html` opens `hybrid-1/`. Each folder is a complete static copy of its branch (plain HTML/CSS/JS,
no build step). The live site is still `main`; this branch only feeds a preview deployment.
