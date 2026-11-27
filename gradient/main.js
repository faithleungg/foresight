// Figma shader module "Foresight Grain Dunes" (v3) as authored on the emi panel (node 213:34808).
// setup/render are verbatim from Figma; only the ES `export` keywords are replaced by a global.
// Property metadata (defineProperties) is a Figma-editor no-op and is omitted.
window.FS_SHADERS = window.FS_SHADERS || {};
window.FS_SHADERS.emi = (function () {
function setup(device, frame) {
    var wgsl = `diagnostic(off,derivative_uniformity);
struct U {
  a: vec4f,
  b: vec4f,
  c: vec4f,
  ink: vec4f,
  bg: vec4f,
  acc: vec4f,
  wv: vec4f,
};
@group(0) @binding(0) var<uniform> u: U;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}

fn pcg2(v: vec2u) -> vec2u {
  var w = v * 1664525u + vec2u(1013904223u);
  w.x = w.x + w.y * 1664525u;
  w.y = w.y + w.x * 1664525u;
  w = w ^ (w >> vec2u(16u));
  w.x = w.x + w.y * 1664525u;
  w.y = w.y + w.x * 1664525u;
  w = w ^ (w >> vec2u(16u));
  return w;
}
fn hashU(id: vec2f, salt: u32) -> f32 {
  let ip = vec2i(floor(id)) + vec2i(1048576, 1048576);
  let h = pcg2(vec2u(u32(ip.x) + salt * 7919u, u32(ip.y) ^ (salt * 104729u)));
  return f32(h.x) * (1.0 / 4294967295.0);
}

fn ridge(v: f32) -> f32 { return 1.0 - sqrt(v * v + 0.03); }

fn dunesH(x: f32, z: f32) -> f32 {
  let s1 = sin(x * 0.45 + z * 0.35 + 0.5 * sin(z * 0.3));
  let s2 = sin(x * 0.9 - z * 0.6 + 2.0);
  return -1.3 + 0.7 * ridge(s1) + 0.35 * ridge(s2);
}

fn rawH(x: f32, z: f32) -> f32 {
  let comp = u.a.w;
  if (comp < 0.5) {
    return dunesH(x, z);
  } else if (comp < 1.5) {
    let z0 = 2.2 - 0.12 * x * x;
    let dz = z - z0;
    let prof = select(exp(-dz * dz * 0.7), exp(-dz * dz * 3.0), dz > 0.0);
    return -1.2 + 1.6 * prof + 0.02 * sin(z * 8.0 + x * 0.6);
  } else if (comp < 2.5) {
    return -1.0 + 0.07 * sin(z * 7.0 + 0.9 * sin(x * 0.8)) + 0.2 * sin(x * 0.35 + z * 0.2);
  } else if (comp < 3.5) {
    let dz = z - 2.5 - 0.3 * sin(0.4 * x);
    let prof = select(exp(-dz * dz * 0.35), exp(-dz * dz * 1.6), dz > 0.0);
    return -1.2 + 1.9 * prof * (0.85 + 0.15 * sin(0.5 * x));
  } else if (comp < 4.5) {
    return -1.2 + 0.45 * (dunesH(x, z) + 1.3);
  }
  let r = length(vec2f(x, z - 1.0));
  return -1.0 + 0.9 * exp(-r * r * 0.5) + 0.06 * sin(r * 7.0) * exp(-0.12 * r) * smoothstep(0.6, 1.4, r);
}

fn hgt(x: f32, z: f32) -> f32 {
  let amp = u.wv.x;
  let sc = max(u.wv.y, 0.1);
  let base = -1.2;
  let h = rawH(x / sc, (z - 1.0) / sc + 1.0);
  return base + (h - base) * amp * sc;
}

fn peakPos(comp: f32) -> vec3f {
  if (comp > 0.5 && comp < 1.5) { return vec3f(0.0, 0.47, 2.2); }
  if (comp > 3.5 && comp < 4.5) { return vec3f(0.0, 0.27, 1.0); }
  if (comp > 4.5) { return vec3f(0.0, -0.03, 1.0); }
  return vec3f(0.0, 100.0, 0.0);
}

fn objects(p: vec3f) -> f32 {
  var d: f32 = 100000.0;
  if (u.a.w > 3.5 && u.a.w < 4.5) { d = length(p - vec3f(0.0, -1.1, 1.0)) - 1.3; }
  if (u.bg.w > 0.5) { d = min(d, length(p - peakPos(u.a.w)) - 0.07); }
  return d;
}

fn scene(p: vec3f) -> f32 {
  let k = 0.28 / max(u.wv.x, 1.0);
  return min((p.y - hgt(p.x, p.z)) * k, objects(p));
}

fn march(ro: vec3f, rd: vec3f) -> f32 {
  var t: f32 = 0.0;
  for (var i: i32 = 0; i < 360; i = i + 1) {
    let d = scene(ro + rd * t);
    if (d < 0.0005 * (1.0 + t)) { return t; }
    t = t + d;
    if (t > 45.0) { break; }
  }
  return -1.0;
}

fn calcNormal(p: vec3f) -> vec3f {
  let e = vec2f(0.002, 0.0);
  return normalize(vec3f(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)));
}

fn softShadow(ro: vec3f, rd: vec3f) -> f32 {
  var res: f32 = 1.0;
  var t: f32 = 0.04;
  for (var i: i32 = 0; i < 64; i = i + 1) {
    let h = scene(ro + rd * t);
    res = min(res, 10.0 * h / t);
    t = t + clamp(h, 0.02, 0.35);
    if (res < 0.001 || t > 14.0) { break; }
  }
  return clamp(res, 0.0, 1.0);
}

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = u.a.xy;
  let rs = max(u.a.z, 0.0001);
  let uv = (pos.xy - 0.5 * res) / res.y * vec2f(1.0, -1.0);
  let zoom = u.c.w;
  let shift = u.ink.w;
  let camH = u.acc.w;
  let ro = vec3f(-shift * 3.0, camH, -7.0);
  let ta = vec3f(-shift * 3.0, -0.9, 2.0);
  let fw = normalize(ta - ro);
  let rt = normalize(cross(vec3f(0.0, 1.0, 0.0), fw));
  let up = cross(fw, rt);
  let rd = normalize(uv.x * rt + uv.y * up + fw * (2.0 * zoom));
  let la = u.b.z;
  let lh = u.b.w;
  let L = normalize(vec3f(cos(la) * cos(lh), sin(lh), sin(la) * cos(lh)));

  var lum: f32 = 0.0;
  var accent: f32 = 0.0;
  let t = march(ro, rd);
  if (t > 0.0) {
    let p = ro + rd * t;
    if (u.bg.w > 0.5 && length(p - peakPos(u.a.w)) < 0.075) { accent = 1.0; }
    let n = calcNormal(p);
    let dif = max(dot(n, L), 0.0);
    let sh = softShadow(p + n * 0.02, L);
    let rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * max(dot(n, L) + 0.3, 0.0);
    let spec = pow(max(dot(reflect(-L, n), -rd), 0.0), 8.0);
    lum = dif * sh * 0.95 + rim * 0.15 + spec * 0.12 * sh + 0.008;
    lum = lum * exp(-0.07 * max(t - 7.0, 0.0));
  } else {
    lum = 0.07 * exp(-2.5 * length(uv - vec2f(L.x, L.y) * 0.7));
  }
  lum = clamp(lum, 0.0, 1.0);
  let vig = 1.0 - u.c.z * smoothstep(0.35, 1.2, length(uv));
  lum = lum * vig;
  let tgt = pow(lum, u.b.y);

  let q = pos.xy / rs;
  let g = max(u.b.x, 0.3);
  let seedU = u32(max(u.c.y, 0.0));
  var cov: f32 = 0.0;
  for (var k: i32 = 0; k < 2; k = k + 1) {
    let fine = k == 1;
    let cell = g * select(1.0, 0.62, fine);
    let gp = q / cell;
    let id = floor(gp);
    let f = fract(gp);
    let base = seedU * 16u + u32(k) * 8u;
    let o = vec2f(hashU(id, base + 1u), hashU(id, base + 2u)) * 0.6 + 0.2;
    let r = 0.28 + 0.12 * hashU(id, base + 3u);
    let d = length(f - o);
    let aa = 0.7 / max(cell * rs, 0.5);
    let dotm = 1.0 - smoothstep(r - aa, r + aa, d);
    let thresh = select(tgt, max(tgt * 1.4 - 0.25, 0.0), fine);
    let on = step(hashU(id, base + 4u), thresh);
    cov = max(cov, dotm * on);
  }
  let solidTone = smoothstep(0.93, 1.0, tgt);
  let v = clamp(max(cov, solidTone) + u.c.x * tgt, 0.0, 1.0);
  var col = mix(u.bg.rgb, u.ink.rgb, v);
  col = mix(col, u.acc.rgb, accent);
  return vec4f(col, 1.0);
}
`;
    frame.state.module = device.createShaderModule({ code: wgsl });
    frame.state.pipeline = null;
    frame.state.pipelineFormat = null;
    frame.state.quad = device.createBuffer({
        size: 6 * 4 * 4,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(frame.state.quad.getMappedRange()).set([
        -1, -1, 0, 1,
        1, -1, 1, 1,
        -1, 1, 0, 0,
        -1, 1, 0, 0,
        1, -1, 1, 1,
        1, 1, 1, 0,
    ]);
    frame.state.quad.unmap();
    frame.state.uniforms = device.createBuffer({
        size: 112,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
}
function render(device, frame) {
    var params = frame.params || {};
    function num(v, fallback) {
        var n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }
    function ch(color, c, fallback) {
        if (!color)
            return fallback;
        return num(color[c], fallback);
    }
    var ink = params.ink;
    var bg = params.background;
    var acc = params.accent;
    var accentOn = params.showAccent === true ? 1 : 0;
    var deg = Math.PI / 180;
    device.queue.writeBuffer(frame.state.uniforms, 0, new Float32Array([
        frame.output.width, frame.output.height, num(frame.renderScale, 1), num(params.composition, 0),
        num(params.grain, 1.6), num(params.contrast, 1.3), num(params.lightAngle, 160) * deg, num(params.lightHeight, 14) * deg,
        num(params.tone, 0.04), num(params.seed, 7), num(params.vignette, 0.55), num(params.zoom, 1),
        ch(ink, 'r', 1), ch(ink, 'g', 1), ch(ink, 'b', 1), num(params.subjectX, 0),
        ch(bg, 'r', 0), ch(bg, 'g', 0), ch(bg, 'b', 0), accentOn,
        ch(acc, 'r', 0.55), ch(acc, 'g', 0.95), ch(acc, 'b', 0.72), num(params.cameraHeight, 1),
        num(params.waveHeight, 1), num(params.waveScale, 1), 0, 0,
    ]));
    var outputFormat = frame.output.format;
    if (frame.state.pipeline == null || frame.state.pipelineFormat !== outputFormat) {
        frame.state.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: frame.state.module,
                entryPoint: 'vs_main',
                buffers: [{
                        arrayStride: 16,
                        attributes: [
                            { shaderLocation: 0, format: 'float32x2', offset: 0 },
                            { shaderLocation: 1, format: 'float32x2', offset: 8 },
                        ],
                    }],
            },
            fragment: {
                module: frame.state.module,
                entryPoint: 'fs_main',
                targets: [{ format: outputFormat }],
            },
            primitive: { topology: 'triangle-list' },
        });
        frame.state.pipelineFormat = outputFormat;
    }
    var encoder = device.createCommandEncoder();
    var pass = encoder.beginRenderPass({
        colorAttachments: [{
                view: frame.output.createView(),
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                storeOp: 'store',
            }],
    });
    pass.setPipeline(frame.state.pipeline);
    var bindGroup = device.createBindGroup({
        layout: frame.state.pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: frame.state.uniforms } }],
    });
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, frame.state.quad);
    pass.draw(6);
    pass.end();
    device.queue.submit([encoder.finish()]);
}
var manifest = {
  "isAnimated": false,
  "name": "Foresight Grain Dunes",
  "renderScaleAware": true,
  "usesMouse": false,
  "version": 3
};
return { setup: setup, render: render, manifest: manifest };
})();

// Figma shader module "Foresight Grain Dunes" (v3, 14 compositions) as authored on the
// "You stay in control" panel (node 213:35001). setup/render are verbatim from Figma; only the
// ES `export` keywords are replaced by a global. Property metadata (Figma-editor no-op) is omitted.
window.FS_SHADERS = window.FS_SHADERS || {};
window.FS_SHADERS.control = (function () {
function setup(device, frame) {
    var wgsl = `diagnostic(off,derivative_uniformity);
struct U {
  a: vec4f,
  b: vec4f,
  c: vec4f,
  ink: vec4f,
  bg: vec4f,
  acc: vec4f,
  wv: vec4f,
};
@group(0) @binding(0) var<uniform> u: U;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}

fn pcg2(v: vec2u) -> vec2u {
  var w = v * 1664525u + vec2u(1013904223u);
  w.x = w.x + w.y * 1664525u;
  w.y = w.y + w.x * 1664525u;
  w = w ^ (w >> vec2u(16u));
  w.x = w.x + w.y * 1664525u;
  w.y = w.y + w.x * 1664525u;
  w = w ^ (w >> vec2u(16u));
  return w;
}
fn hashU(id: vec2f, salt: u32) -> f32 {
  let ip = vec2i(floor(id)) + vec2i(1048576, 1048576);
  let h = pcg2(vec2u(u32(ip.x) + salt * 7919u, u32(ip.y) ^ (salt * 104729u)));
  return f32(h.x) * (1.0 / 4294967295.0);
}

fn hashF(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}
fn vnoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let w = f * f * (3.0 - 2.0 * f);
  let a = hashF(i);
  let b = hashF(i + vec2f(1.0, 0.0));
  let c = hashF(i + vec2f(0.0, 1.0));
  let d = hashF(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

fn ridge(v: f32) -> f32 {
  let c = mix(0.03, 1.6, clamp(u.wv.z, 0.0, 1.0));
  let top = sqrt(1.0 + c);
  let lo = sqrt(c);
  return 0.83 * (top - sqrt(v * v + c)) / (top - lo);
}

fn dunesH(x: f32, z: f32) -> f32 {
  let s1 = sin(x * 0.45 + z * 0.35 + 0.5 * sin(z * 0.3));
  let s2 = sin(x * 0.9 - z * 0.6 + 2.0);
  return -1.3 + 0.7 * ridge(s1) + 0.35 * ridge(s2);
}

fn asymProf(s: f32, lw: f32) -> f32 {
  return smoothstep(0.0, 1.0 - lw, s) * (1.0 - smoothstep(1.0 - lw, 1.0, s));
}

fn rip(x: f32, z: f32, f: f32, w: f32) -> f32 {
  let warp = w * (vnoise(vec2f(x * 0.35, z * 0.35)) * 2.0 - 1.0) + 0.5 * w * (vnoise(vec2f(x * 0.9 + 7.0, z * 0.9)) - 0.5);
  let ph = f * (z * 0.95 + x * 0.3) + warp;
  return asymProf(fract(ph), 0.24);
}

fn asymPhase(x: f32, z: f32) -> f32 {
  return 0.32 * z + 0.18 * x + 0.9 * vnoise(vec2f(x * 0.18, z * 0.12));
}
fn asymDune(x: f32, z: f32) -> f32 {
  let s = fract(asymPhase(x, z));
  let lw = mix(0.12, 0.38, clamp(u.wv.z, 0.0, 1.0));
  let hv = 0.7 + 0.5 * vnoise(vec2f(x * 0.15 + 3.0, z * 0.1));
  return asymProf(s, lw) * hv;
}

fn rdist(x: f32, z: f32, cx: f32, cz: f32, sxL: f32, sxR: f32, wob: f32) -> f32 {
  let dx = x - cx;
  let sx = select(sxR, sxL, dx < 0.0);
  return length(vec2f(dx * sx, z - cz)) + wob * (vnoise(vec2f(x * 0.4 + 11.0, z * 0.4)) - 0.5);
}
fn rings(r: f32, f: f32, amp: f32) -> f32 {
  return amp * asymProf(fract(r * f), 0.3) * exp(-0.1 * r) * smoothstep(0.5, 1.3, r);
}

fn rawH(x: f32, z: f32) -> f32 {
  let comp = u.a.w;
  if (comp < 0.5) {
    return dunesH(x, z);
  } else if (comp < 1.5) {
    let z0 = 2.2 - 0.12 * x * x;
    let dz = z - z0;
    let prof = select(exp(-dz * dz * 0.7), exp(-dz * dz * 3.0), dz > 0.0);
    return -1.2 + 1.6 * prof + 0.02 * sin(z * 8.0 + x * 0.6);
  } else if (comp < 2.5) {
    return -1.0 + 0.07 * sin(z * 7.0 + 0.9 * sin(x * 0.8)) + 0.2 * sin(x * 0.35 + z * 0.2);
  } else if (comp < 3.5) {
    let dz = z - 2.5 - 0.3 * sin(0.4 * x);
    let prof = select(exp(-dz * dz * 0.35), exp(-dz * dz * 1.6), dz > 0.0);
    return -1.2 + 1.9 * prof * (0.85 + 0.15 * sin(0.5 * x));
  } else if (comp < 4.5) {
    return -1.2 + 0.45 * (dunesH(x, z) + 1.3);
  } else if (comp < 5.5) {
    let r = length(vec2f(x, z - 1.0));
    return -1.0 + 0.9 * exp(-r * r * 0.5) + 0.06 * sin(r * 7.0) * exp(-0.12 * r) * smoothstep(0.6, 1.4, r);
  } else if (comp < 6.5) {
    return -1.25 + 1.0 * asymDune(x, z) + 0.07 * rip(x, z, 1.2, 1.0);
  } else if (comp < 7.5) {
    return -1.0 + 0.3 * (vnoise(vec2f(x * 0.2, z * 0.2)) - 0.5) + 0.11 * rip(x, z, 1.0, 1.6);
  } else if (comp < 8.5) {
    let r = length(vec2f((x - 1.6) * 0.8, z - 1.5));
    let mound = 0.9 * exp(-r * r * 0.35);
    let ph = 1.3 * (z * 0.9 + x * 0.35) + 1.2 * vnoise(vec2f(x * 0.3, z * 0.3)) + 1.8 * exp(-r * r * 0.25);
    let damp = 1.0 - smoothstep(0.3, 0.8, mound / 0.9);
    return -1.0 + mound + 0.09 * asymProf(fract(ph), 0.24) * damp;
  } else if (comp < 9.5) {
    let s = fract(asymPhase(x, z));
    let lw = mix(0.12, 0.38, clamp(u.wv.z, 0.0, 1.0));
    let windward = 1.0 - smoothstep(0.55, 1.0 - lw, s);
    return -1.25 + 1.1 * asymDune(x, z) + 0.07 * rip(x, z, 1.3, 0.8) * windward;
  } else if (comp < 10.5) {
    let r0 = length(vec2f(x + 1.8, z - 1.2));
    let r = rdist(x, z, -1.8, 1.2, 0.85, 0.85, 0.6);
    return -1.0 + 0.85 * exp(-r0 * r0 * 0.5) + rings(r, 1.1, 0.1);
  } else if (comp < 11.5) {
    let r1 = length(vec2f(x + 1.4, z - 0.8));
    let r2 = length(vec2f(x - 2.0, z - 2.4));
    let m = 0.8 * exp(-r1 * r1 * 0.5) + 0.45 * exp(-r2 * r2 * 0.9);
    let a = rdist(x, z, -1.4, 0.8, 1.0, 1.0, 0.4);
    let b = rdist(x, z, 2.0, 2.4, 1.0, 1.0, 0.4) + 0.3;
    let k = 0.8;
    let hh = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    let d = mix(b, a, hh) - k * hh * (1.0 - hh);
    return -1.0 + m + 0.09 * asymProf(fract(d * 1.1), 0.3) * exp(-0.08 * d) * smoothstep(0.4, 1.1, min(r1, r2 * 1.4));
  } else if (comp < 12.5) {
    let r0 = length(vec2f(x - 1.2, z - 1.4));
    let r = rdist(x, z, 1.2, 1.4, 1.0, 0.7, 0.5);
    let bowl = -0.35 * exp(-r0 * r0 * 0.6) + 0.12 * exp(-(r0 - 1.3) * (r0 - 1.3) * 3.0);
    return -1.0 + bowl + rings(r, 1.2, 0.1) * smoothstep(1.0, 1.8, r0);
  }
  let r0 = length(vec2f(x - 0.6, z - 1.3));
  let r = rdist(x, z, 0.6, 1.3, 1.0, 0.6, 0.4);
  return -1.0 + 0.75 * exp(-r0 * r0 * 0.55) + rings(r, 1.1, 0.1);
}

fn hgt(x: f32, z: f32) -> f32 {
  let amp = u.wv.x;
  let sc = max(u.wv.y, 0.1);
  let base = -1.2;
  let h = rawH(x / sc, (z - 1.0) / sc + 1.0);
  return base + (h - base) * amp * sc;
}

fn peakPos(comp: f32) -> vec3f {
  if (comp > 0.5 && comp < 1.5) { return vec3f(0.0, 0.47, 2.2); }
  if (comp > 3.5 && comp < 4.5) { return vec3f(0.0, 0.27, 1.0); }
  if (comp > 4.5 && comp < 5.5) { return vec3f(0.0, -0.03, 1.0); }
  return vec3f(0.0, 100.0, 0.0);
}

fn objects(p: vec3f) -> f32 {
  var d: f32 = 100000.0;
  if (u.a.w > 3.5 && u.a.w < 4.5) { d = length(p - vec3f(0.0, -1.1, 1.0)) - 1.3; }
  if (u.bg.w > 0.5) { d = min(d, length(p - peakPos(u.a.w)) - 0.07); }
  return d;
}

fn scene(p: vec3f) -> f32 {
  let k = 0.28 / max(u.wv.x, 1.0);
  return min((p.y - hgt(p.x, p.z)) * k, objects(p));
}

fn march(ro: vec3f, rd: vec3f) -> f32 {
  var t: f32 = 0.0;
  for (var i: i32 = 0; i < 360; i = i + 1) {
    let d = scene(ro + rd * t);
    if (d < 0.0005 * (1.0 + t)) { return t; }
    t = t + d;
    if (t > 45.0) { break; }
  }
  return -1.0;
}

fn calcNormal(p: vec3f) -> vec3f {
  let e = vec2f(0.002, 0.0);
  return normalize(vec3f(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)));
}

fn softShadow(ro: vec3f, rd: vec3f) -> f32 {
  var res: f32 = 1.0;
  var t: f32 = 0.04;
  for (var i: i32 = 0; i < 64; i = i + 1) {
    let h = scene(ro + rd * t);
    res = min(res, 10.0 * h / t);
    t = t + clamp(h, 0.02, 0.35);
    if (res < 0.001 || t > 14.0) { break; }
  }
  return clamp(res, 0.0, 1.0);
}

@fragment fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let res = u.a.xy;
  let rs = max(u.a.z, 0.0001);
  let uv = (pos.xy - 0.5 * res) / res.y * vec2f(1.0, -1.0);
  let zoom = u.c.w;
  let shift = u.ink.w;
  let camH = u.acc.w;
  let ro = vec3f(-shift * 3.0, camH, -7.0);
  let ta = vec3f(-shift * 3.0, -0.9, 2.0);
  let fw = normalize(ta - ro);
  let rt = normalize(cross(vec3f(0.0, 1.0, 0.0), fw));
  let up = cross(fw, rt);
  let rd = normalize(uv.x * rt + uv.y * up + fw * (2.0 * zoom));
  let la = u.b.z;
  let lh = u.b.w;
  let L = normalize(vec3f(cos(la) * cos(lh), sin(lh), sin(la) * cos(lh)));

  var lum: f32 = 0.0;
  var accent: f32 = 0.0;
  let t = march(ro, rd);
  if (t > 0.0) {
    let p = ro + rd * t;
    if (u.bg.w > 0.5 && length(p - peakPos(u.a.w)) < 0.075) { accent = 1.0; }
    let n = calcNormal(p);
    let dif = max(dot(n, L), 0.0);
    let sh = softShadow(p + n * 0.02, L);
    let rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * max(dot(n, L) + 0.3, 0.0);
    let spec = pow(max(dot(reflect(-L, n), -rd), 0.0), 8.0);
    lum = dif * sh * 0.95 + rim * 0.15 + spec * 0.12 * sh + 0.008;
    lum = lum * exp(-0.07 * max(t - 7.0, 0.0));
  } else {
    lum = 0.07 * exp(-2.5 * length(uv - vec2f(L.x, L.y) * 0.7));
  }
  lum = clamp(lum, 0.0, 1.0);
  let vig = 1.0 - u.c.z * smoothstep(0.35, 1.2, length(uv));
  lum = lum * vig;
  let tgt = pow(lum, u.b.y);

  let q = pos.xy / rs;
  let g = max(u.b.x, 0.3);
  let seedU = u32(max(u.c.y, 0.0));
  var cov: f32 = 0.0;
  for (var k: i32 = 0; k < 2; k = k + 1) {
    let fine = k == 1;
    let cell = g * select(1.0, 0.62, fine);
    let gp = q / cell;
    let id = floor(gp);
    let f = fract(gp);
    let base = seedU * 16u + u32(k) * 8u;
    let o = vec2f(hashU(id, base + 1u), hashU(id, base + 2u)) * 0.6 + 0.2;
    let r = 0.28 + 0.12 * hashU(id, base + 3u);
    let d = length(f - o);
    let aa = 0.7 / max(cell * rs, 0.5);
    let dotm = 1.0 - smoothstep(r - aa, r + aa, d);
    let thresh = select(tgt, max(tgt * 1.4 - 0.25, 0.0), fine);
    let on = step(hashU(id, base + 4u), thresh);
    cov = max(cov, dotm * on);
  }
  let solidTone = smoothstep(0.93, 1.0, tgt);
  let v = clamp(max(cov, solidTone) + u.c.x * tgt, 0.0, 1.0);
  var col = mix(u.bg.rgb, u.ink.rgb, v);
  col = mix(col, u.acc.rgb, accent);
  return vec4f(col, 1.0);
}
`;
    frame.state.module = device.createShaderModule({ code: wgsl });
    frame.state.pipeline = null;
    frame.state.pipelineFormat = null;
    frame.state.quad = device.createBuffer({
        size: 6 * 4 * 4,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(frame.state.quad.getMappedRange()).set([
        -1, -1, 0, 1,
        1, -1, 1, 1,
        -1, 1, 0, 0,
        -1, 1, 0, 0,
        1, -1, 1, 1,
        1, 1, 1, 0,
    ]);
    frame.state.quad.unmap();
    frame.state.uniforms = device.createBuffer({
        size: 112,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
}
function render(device, frame) {
    var params = frame.params || {};
    function num(v, fallback) {
        var n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }
    function ch(color, c, fallback) {
        if (!color)
            return fallback;
        return num(color[c], fallback);
    }
    var ink = params.ink;
    var bg = params.background;
    var acc = params.accent;
    var accentOn = params.showAccent === true ? 1 : 0;
    var deg = Math.PI / 180;
    device.queue.writeBuffer(frame.state.uniforms, 0, new Float32Array([
        frame.output.width, frame.output.height, num(frame.renderScale, 1), num(params.composition, 0),
        num(params.grain, 1.6), num(params.contrast, 1.3), num(params.lightAngle, 160) * deg, num(params.lightHeight, 14) * deg,
        num(params.tone, 0.04), num(params.seed, 7), num(params.vignette, 0.55), num(params.zoom, 1),
        ch(ink, 'r', 1), ch(ink, 'g', 1), ch(ink, 'b', 1), num(params.subjectX, 0),
        ch(bg, 'r', 0), ch(bg, 'g', 0), ch(bg, 'b', 0), accentOn,
        ch(acc, 'r', 0.55), ch(acc, 'g', 0.95), ch(acc, 'b', 0.72), num(params.cameraHeight, 1),
        num(params.waveHeight, 1), num(params.waveScale, 1), num(params.roundness, 0.6), 0,
    ]));
    var outputFormat = frame.output.format;
    if (frame.state.pipeline == null || frame.state.pipelineFormat !== outputFormat) {
        frame.state.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: frame.state.module,
                entryPoint: 'vs_main',
                buffers: [{
                        arrayStride: 16,
                        attributes: [
                            { shaderLocation: 0, format: 'float32x2', offset: 0 },
                            { shaderLocation: 1, format: 'float32x2', offset: 8 },
                        ],
                    }],
            },
            fragment: {
                module: frame.state.module,
                entryPoint: 'fs_main',
                targets: [{ format: outputFormat }],
            },
            primitive: { topology: 'triangle-list' },
        });
        frame.state.pipelineFormat = outputFormat;
    }
    var encoder = device.createCommandEncoder();
    var pass = encoder.beginRenderPass({
        colorAttachments: [{
                view: frame.output.createView(),
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                storeOp: 'store',
            }],
    });
    pass.setPipeline(frame.state.pipeline);
    var bindGroup = device.createBindGroup({
        layout: frame.state.pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: frame.state.uniforms } }],
    });
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, frame.state.quad);
    pass.draw(6);
    pass.end();
    device.queue.submit([encoder.finish()]);
}
var manifest = {
  "isAnimated": false,
  "name": "Foresight Grain Dunes",
  "renderScaleAware": true,
  "usesMouse": false,
  "version": 3
};
return { setup: setup, render: render, manifest: manifest };
})();

/* ---------- Shader host: runs the Figma shader modules' setup/render on WebGPU ---------- */
(function () {
  var PARAMS = {
    emi: { background: { r: 0, g: 0, b: 0, a: 1 }, zoom: 1, subjectX: 0, composition: 0, lightAngle: 160, vignette: 0.550000011920929, tone: 0.03999999910593033, grain: 1.600000023841858, accent: { r: 0.550000011920929, g: 0.949999988079071, b: 0.7200000286102295, a: 1 }, waveScale: 1, showAccent: false, cameraHeight: 1, ink: { r: 1, g: 1, b: 1, a: 1 }, lightHeight: 14, contrast: 1.2999999523162842, waveHeight: 1, seed: 7 },
    control: { background: { r: 0, g: 0, b: 0, a: 1 }, zoom: 1, subjectX: 0, composition: 0, lightAngle: 160, vignette: 0.550000011920929, tone: 0.03999999910593033, roundness: 0.6000000238418579, grain: 1.600000023841858, accent: { r: 0.550000011920929, g: 0.949999988079071, b: 0.7200000286102295, a: 1 }, waveScale: 1, showAccent: false, cameraHeight: 1, ink: { r: 1, g: 1, b: 1, a: 1 } /* white, to match the diagram panel (Agentation note; Figma had mint) */, lightHeight: 14, contrast: 1.2999999523162842, waveHeight: 1, seed: 7 }
  };
  function rgb(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/).map(Number);
    return v.length === 3 && v.every(Number.isFinite) ? { r: v[0] / 255, g: v[1] / 255, b: v[2] / 255, a: 1 } : fallback;
  }
  async function start() {
    if (!navigator.gpu) return;
    Object.keys(PARAMS).forEach(function (k) {
      PARAMS[k].background = rgb('--shader-bg', PARAMS[k].background);
      PARAMS[k].ink = rgb('--shader-ink', PARAMS[k].ink);
    });
    var adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return;
    var device = await adapter.requestDevice();
    var format = navigator.gpu.getPreferredCanvasFormat();
    document.querySelectorAll('canvas[data-shader]').forEach(function (canvas) {
      var key = canvas.dataset.shader, mod = window.FS_SHADERS[key];
      var ctx = canvas.getContext('webgpu');
      ctx.configure({ device: device, format: format, alphaMode: 'premultiplied' });
      var frame = { state: {}, params: PARAMS[key], renderScale: 1, output: null };
      mod.setup(device, frame);
      var pending = false;
      function draw() {
        pending = false;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
        var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        frame.renderScale = dpr;
        frame.output = ctx.getCurrentTexture();
        mod.render(device, frame);
      }
      new ResizeObserver(function () { if (!pending) { pending = true; requestAnimationFrame(draw); } }).observe(canvas);
    });
  }
  start().catch(function (e) { console.warn('Shader fill unavailable:', e); });
})();

/* ---------- Rail: mark the pieces that currently sit over the hero photo ---------- */
(function () {
  var hero = document.getElementById('top');
  if (!hero) return;
  var rail = document.querySelector('.rail');
  var parts = Array.prototype.slice.call(document.querySelectorAll('.wordmark, .index, .demo'));
  function update() {
    var edge = hero.getBoundingClientRect().bottom;
    parts.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var over = (r.top + r.bottom) / 2 < edge;
      el.classList.toggle('over-hero', over);
      if (el.classList.contains('wordmark')) rail.classList.toggle('over-hero', over);
    });
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ---------- You stay in control: scroll-linked accordion + stacking layers ---------- */
(function () {
  var track = document.getElementById('control-track');
  if (!track) return;
  var items = Array.prototype.slice.call(document.querySelectorAll('.acc-item'));
  var slabs = Array.prototype.slice.call(document.querySelectorAll('.slab'));
  var stack = document.getElementById('stack');
  var fit = document.getElementById('stack-fit');
  var stage = document.getElementById('stage');
  var N = items.length, GAP = 41.55, DROP = 240;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = -1;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function progress() {
    var r = track.getBoundingClientRect();
    var dist = track.offsetHeight - window.innerHeight;
    return dist > 0 ? clamp(-r.top / dist) : 0;
  }

  function fitStack() {
    var cs = getComputedStyle(stage);
    var aw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var ah = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var s = Math.min(1, aw / 459.92, ah / 319.52);
    fit.style.transform = 'scale(' + Math.max(s, 0.3) + ')';
  }

  function render() {
    var p = progress();
    var seg = 1 / N;
    // Slab k arrives across the boundary into its segment; slab 0 is there from the start.
    var arrived = slabs.map(function (_, k) {
      if (k === 0) return 1;
      var t = clamp((p - (k * seg - 0.10)) / 0.16);
      return reduce ? (t > 0.5 ? 1 : 0) : ease(t);
    });
    var count = arrived.reduce(function (a, b) { return a + b; }, 0);
    // Keep the visible stack centred in the panel as it grows.
    stack.style.transform = 'translateY(' + (-(N - count) * GAP / 2) + 'px)';
    slabs.forEach(function (el, k) {
      var e = arrived[k];
      el.style.transform = 'translateY(' + (-(1 - e) * DROP) + 'px)';
      el.style.opacity = e;
      var isTop = k === N - 1 || arrived[k + 1] < 0.5;
      el.querySelector('.slab-label').style.opacity = isTop ? 1 : 0;
    });

    var active = 0;
    for (var k = 0; k < N; k++) if (arrived[k] >= 0.5) active = k;
    items.forEach(function (it, k) {
      var fill = k < active ? 1 : k > active ? 0 : clamp((p - k * seg) / seg);
      it.style.setProperty('--fill', fill.toFixed(3));
    });
    if (active !== current) {
      current = active;
      items.forEach(function (it, k) {
        var open = k === active;
        it.classList.toggle('is-open', open);
        it.querySelector('.acc-head').setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }

  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; render(); }); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { fitStack(); render(); });
  new ResizeObserver(fitStack).observe(stage);

  // Clicking a point scrolls to its step.
  items.forEach(function (it, k) {
    it.querySelector('.acc-head').addEventListener('click', function () {
      var dist = track.offsetHeight - window.innerHeight;
      var top = track.getBoundingClientRect().top + window.scrollY;
      var target = top + dist * (k / N + (k ? 0.1 : 0.02));
      window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  fitStack();
  render();
})();

/* ---------- Emi diagram: beads flow Foresight-1 -> each card -> outcomes (mint),
   rest 1s, then feed back outcomes -> Foresight-1 (white). Agentation note. ---------- */
(function () {
  var inners = document.querySelectorAll('.emi-inner');
  if (!inners.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var NS = 'http://www.w3.org/2000/svg';
  var FWD = 7000, REST = 1000, BACK = 7000, TRAIN = 2, GAP = 0.03; // two equal beads per route, close together (Agentation notes)
  var CYCLE = FWD + REST + BACK + REST;

  // Polyline with rounded corners (radius r), as SVG path data.
  function rounded(pts, r) {
    var p = pts.filter(function (q, i) { return i === 0 || Math.abs(q[0] - pts[i - 1][0]) > .5 || Math.abs(q[1] - pts[i - 1][1]) > .5; });
    var d = 'M' + p[0][0] + ' ' + p[0][1];
    for (var i = 1; i < p.length - 1; i++) {
      var a = p[i - 1], b = p[i], c = p[i + 1];
      var l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      var rr = Math.min(r, l1 / 2, l2 / 2);
      var s = [b[0] - (b[0] - a[0]) / l1 * rr, b[1] - (b[1] - a[1]) / l1 * rr];
      var e = [b[0] + (c[0] - b[0]) / l2 * rr, b[1] + (c[1] - b[1]) / l2 * rr];
      d += ' L' + s[0] + ' ' + s[1] + ' Q' + b[0] + ' ' + b[1] + ' ' + e[0] + ' ' + e[1];
    }
    var z = p[p.length - 1];
    return d + ' L' + z[0] + ' ' + z[1];
  }

  inners.forEach(function (inner) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'emi-flow');
    svg.setAttribute('aria-hidden', 'true');
    inner.insertBefore(svg, inner.firstChild);
    var paths = [], beads = [];

    function build() {
      var box = inner.getBoundingClientRect();
      if (!box.width) return;
      svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
      svg.innerHTML = '';
      paths = []; beads = [];
      function R(el) { var r = el.getBoundingClientRect(); return { l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top, cx: (r.left + r.right) / 2 - box.left, cy: (r.top + r.bottom) / 2 - box.top }; }
      var orch = R(inner.querySelector('.orch-frame'));
      var rows = inner.querySelectorAll('.row3');
      var busOut = R(rows[0].querySelector('.bus')).cy;
      var cells = rows[0].querySelectorAll('.cell');
      var cards = rows[1].querySelectorAll('.tilecard');
      var busBack = R(rows[2].querySelector('.bus')).cy;
      var loop = R(inner.querySelector('.loop'));
      var x0 = orch.cx;
      for (var i = 0; i < cells.length; i++) {
        var xi = R(cells[i]).cx, card = R(cards[i]);
        var pts = [[x0, orch.b], [x0, busOut], [xi, busOut], [xi, card.t], [xi, card.b], [xi, busBack], [x0, busBack], [x0, loop.t]];
        var path = document.createElementNS(NS, 'path');
        path.setAttribute('d', rounded(pts, 14.84));
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
        var len = path.getTotalLength();
        paths.push({ el: path, len: len });
        for (var k = 0; k < TRAIN; k++) {
          var c = document.createElementNS(NS, 'circle');
          c.setAttribute('r', 2.6); // both beads the same size (Agentation note)
          c.setAttribute('class', 'emi-bead');
          svg.appendChild(c);
          beads.push({ c: c, p: i, k: k });
        }
      }
    }

    var visible = false, start = performance.now(), raf = 0;
    function frame(now) {
      raf = 0;
      if (!visible || !paths.length) return;
      var t = (now - start) % CYCLE, prog = null, back = false;
      if (t < FWD) prog = t / FWD;
      else if (t >= FWD + REST && t < FWD + REST + BACK) { prog = (t - FWD - REST) / BACK; back = true; }
      svg.classList.toggle('is-back', back);
      beads.forEach(function (bd) {
        if (prog === null) { bd.c.style.opacity = 0; return; }
        var u = prog * (1 + GAP * (TRAIN - 1)) - bd.k * GAP;         // trailing beads start a little later
        if (u < 0 || u > 1) { bd.c.style.opacity = 0; return; }
        var e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;  // ease in-out
        var P = paths[bd.p], at = (back ? 1 - e : e) * P.len;
        var pt = P.el.getPointAtLength(at);
        bd.c.setAttribute('cx', pt.x); bd.c.setAttribute('cy', pt.y);
        bd.c.style.opacity = (1 - bd.k * .15) * Math.min(1, u * 12, (1 - u) * 12);
      });
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (visible && !raf) raf = requestAnimationFrame(frame); }

    build();
    if ('ResizeObserver' in window) new ResizeObserver(build).observe(inner);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(inner);
  });
})();
