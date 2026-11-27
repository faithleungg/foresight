# Foresight Website: preview bundle

This branch is a **review build**: three versions of the site side by side, with a floating
**Dark / Hybrid / Light** switch (`switch.js`, not part of the site) that jumps to the same page and
scroll position in another version.

| Folder | Version | Built from branch |
| --- | --- | --- |
| `dark/` | All-dark | `dark` |
| `hybrid/` | Light paper and black bands | `Hybrid` |
| `light/` | All-light on the paper shader | `light` |

The root `index.html` opens `hybrid/`. Each folder is a complete static copy of that branch (plain
HTML/CSS/JS, no build step), so any static host works; on GitHub Pages pick this branch and `/ (root)`.

Edit the source branches, not these folders. This bundle is regenerated from them.
