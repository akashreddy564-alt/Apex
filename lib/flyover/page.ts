/**
 * The flyover page that runs inside the WebView (an iframe on web): Mapbox
 * GL JS with 3D terrain, the glowing line, and the camera. It plays the
 * plan's cues in real time ('play') or renders them frame by frame into an
 * MP4 ('export'), waiting for every tile so the video has no holes.
 *
 * Messages out (JSON strings): {type:'start'} when the first frame is on
 * screen, {type:'end'}, {type:'progress', done, total} while exporting,
 * {type:'chunk', i, n, data} (base64 MP4 pieces), {type:'exported', bytes},
 * {type:'error', reason}.
 * Pure, so node tests can run it (no `@/` imports).
 */
import type { FlyoverPlan } from './plan.ts';

export type FlyoverMode = 'play' | 'export';

const MAPBOX_GL = 'https://api.mapbox.com/mapbox-gl-js/v3.9.4';
const MP4_MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.js';
const FONTS =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Space+Mono:wght@700&display=block';
/** base64 characters per message; WKWebView handles this size comfortably. */
const CHUNK = 512 * 1024;

/** JSON that is safe inside a <script> element. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(new RegExp('\\u2028', 'g'), '\\u2028')
    .replace(new RegExp('\\u2029', 'g'), '\\u2029');
}

export function flyoverHtml(token: string, plan: FlyoverPlan, mode: FlyoverMode): string {
  const config = scriptJson({ token, plan, mode, chunk: CHUNK });
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link href="${MAPBOX_GL}/mapbox-gl.css" rel="stylesheet">
<link href="${FONTS}" rel="stylesheet">
<script src="${MAPBOX_GL}/mapbox-gl.js"></script>
${mode === 'export' ? `<script src="${MP4_MUXER}"></script>` : ''}
<style>
  html, body { margin: 0; height: 100%; background: #09090B; overflow: hidden; }
  #map { position: absolute; inset: 0; }
  body.export #map { width: 360px; height: 640px; inset: auto; left: 0; top: 0; }
  #veil { position: absolute; inset: 0; background: #09090B; transition: opacity 900ms ease; pointer-events: none; }
  #veil.off { opacity: 0; }
  .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { opacity: 0.55; }
</style>
</head>
<body class="${mode}">
<div id="map"></div>
<div id="veil"></div>
<script>
(function () {
  var C = ${config};
  var plan = C.plan, P = plan.points, cues = plan.cues, N = P.length;
  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage(s, '*');
  }
  window.onerror = function (m) { send({ type: 'error', reason: String(m) }); };
  if (!window.mapboxgl) { send({ type: 'error', reason: 'offline' }); return; }
  if (!mapboxgl.supported || !mapboxgl.supported()) { send({ type: 'error', reason: 'webgl' }); return; }

  mapboxgl.accessToken = C.token;
  var R = Math.PI / 180;
  function at(a) {
    var x = Math.max(0, Math.min(1, a)) * (N - 1), i = Math.min(N - 2, Math.floor(x)), t = x - i, p = P[i], q = P[i + 1];
    var e = p[2] != null && q[2] != null ? p[2] + (q[2] - p[2]) * t : null;
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, e];
  }
  function metres(a, b) {
    var dLat = (b[1] - a[1]) * R, dLon = (b[0] - a[0]) * R;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[1] * R) * Math.cos(b[1] * R) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }
  function bearing(a, b) {
    var y = Math.sin((b[0] - a[0]) * R) * Math.cos(b[1] * R);
    var x = Math.cos(a[1] * R) * Math.sin(b[1] * R) - Math.sin(a[1] * R) * Math.cos(b[1] * R) * Math.cos((b[0] - a[0]) * R);
    return (Math.atan2(y, x) / R + 360) % 360;
  }
  var W = plan.bounds[0][0], S = plan.bounds[0][1], E = plan.bounds[1][0], Nn = plan.bounds[1][1];
  var centre = [(W + E) / 2, (S + Nn) / 2];
  var span = Math.max(600, metres([W, S], [E, Nn]));
  var peakPt = plan.peak >= 0 ? P[plan.peak] : P[N - 1];

  var map = new mapboxgl.Map({
    container: 'map', style: 'mapbox://styles/mapbox/satellite-v9', center: P[0], zoom: 13, pitch: 65,
    interactive: false, attributionControl: true, preserveDrawingBuffer: C.mode === 'export', antialias: true, fadeDuration: 0,
  });

  function setDrawn(a) {
    var trim = [Math.min(0.999999, Math.max(0, a)), 1];
    map.setPaintProperty('core', 'line-trim-offset', trim);
    map.setPaintProperty('glow', 'line-trim-offset', trim);
  }
  function headAt(p) { map.getSource('head').setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [p[0], p[1]] } }); }
  function place(target, bearingDeg, dist, alt) {
    var cam = map.getFreeCameraOptions(), back = (bearingDeg + 180) * R;
    var lng = target[0] + (dist * Math.sin(back)) / (111320 * Math.cos(target[1] * R));
    var lat = target[1] + (dist * Math.cos(back)) / 111320;
    var ground = Math.max(map.queryTerrainElevation([lng, lat]) || 0, map.queryTerrainElevation([target[0], target[1]]) || 0, target[2] || 0);
    cam.position = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], ground + alt);
    cam.lookAtPoint([target[0], target[1]]);
    map.setFreeCameraOptions(cam);
  }

  var heading = null, orbitFrom = null, pullFrom = null, pullTo = null;
  function lerpAngle(a, b, k) { return a + ((((b - a) % 360) + 540) % 360 - 180) * k; }
  function apply(cue) {
    setDrawn(cue.a);
    var head = at(cue.a);
    headAt(head);
    var follow = Math.min(3200, Math.max(1400, span * 0.45)), height = follow * 0.42;
    if (cue.p >= 0) {
      // Pull back to the whole route: ease from wherever the camera is to a fitted overview.
      if (!pullFrom) {
        var c0 = map.getCenter();
        pullFrom = { lng: c0.lng, lat: c0.lat, zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
        var fit = map.cameraForBounds(plan.bounds, { padding: { top: 140, bottom: 300, left: 40, right: 40 }, pitch: 45, bearing: pullFrom.bearing });
        var fc = fit && fit.center ? mapboxgl.LngLat.convert(fit.center) : { lng: centre[0], lat: centre[1] };
        pullTo = { lng: fc.lng, lat: fc.lat, zoom: Math.min(15, fit && fit.zoom != null ? fit.zoom - 0.2 : 12), pitch: 45, bearing: pullFrom.bearing + 25 };
      }
      var k = cue.p;
      map.jumpTo({
        center: [pullFrom.lng + (pullTo.lng - pullFrom.lng) * k, pullFrom.lat + (pullTo.lat - pullFrom.lat) * k],
        zoom: pullFrom.zoom + (pullTo.zoom - pullFrom.zoom) * k,
        pitch: pullFrom.pitch + (pullTo.pitch - pullFrom.pitch) * k,
        bearing: lerpAngle(pullFrom.bearing, pullTo.bearing, k),
      });
      return;
    }
    if (cue.o >= 0) {
      if (orbitFrom == null) orbitFrom = heading == null ? 0 : heading;
      heading = orbitFrom + 160 * cue.o;
      place(peakPt, heading, follow * (1 + 0.15 * cue.o), height * (1 + 0.2 * cue.o));
      return;
    }
    if (orbitFrom != null) orbitFrom = null;
    var ahead = at(Math.min(1, cue.a + 600 / Math.max(1, plan.lengthM)));
    var want = cue.a >= 0.999 ? (heading == null ? 0 : heading) : bearing(head, ahead);
    heading = heading == null ? want : heading + (((want - heading + 540) % 360) - 180) * 0.06;
    place(head, heading, follow, height);
  }

  map.on('style.load', function () {
    map.addSource('dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
    map.setTerrain({ source: 'dem', exaggeration: 1.35 });
    map.setFog({ range: [0.8, 9], color: '#1b1d22', 'high-color': '#0b0c10', 'horizon-blend': 0.2, 'space-color': '#050507', 'star-intensity': 0.15 });
    map.addSource('route', { type: 'geojson', lineMetrics: true, data: { type: 'Feature', geometry: { type: 'LineString', coordinates: P.map(function (p) { return [p[0], p[1]]; }) } } });
    var grad = ['interpolate', ['linear'], ['line-progress'], 0, '#9C9584', 0.55, '#EDE6D6', 1, '#FFFFFF'];
    // The glow brightens on steep stretches.
    var glowGrad = ['interpolate', ['linear'], ['line-progress']];
    var lastF = -1;
    plan.steep.forEach(function (s) {
      if (s[0] <= lastF) return;
      lastF = s[0];
      var v = Math.round(156 + 99 * s[1]);
      glowGrad.push(s[0], 'rgb(' + v + ',' + Math.round(149 + 106 * s[1]) + ',' + Math.round(132 + 123 * s[1]) + ')');
    });
    if (glowGrad.length < 7) glowGrad = grad;
    map.addLayer({ id: 'glow', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-width': 16, 'line-blur': 12, 'line-opacity': 0.55, 'line-gradient': glowGrad, 'line-trim-offset': [0, 1] } });
    map.addLayer({ id: 'core', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-width': 4, 'line-gradient': grad, 'line-trim-offset': [0, 1] } });
    map.addSource('head', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: P[0] } } });
    map.addLayer({ id: 'head-halo', type: 'circle', source: 'head', paint: { 'circle-radius': 18, 'circle-color': '#EDE6D6', 'circle-opacity': 0.3, 'circle-blur': 0.9, 'circle-pitch-alignment': 'map' } });
    map.addLayer({ id: 'head', type: 'circle', source: 'head', paint: { 'circle-radius': 5, 'circle-color': '#FFFFFF', 'circle-stroke-color': '#EDE6D6', 'circle-stroke-width': 2, 'circle-pitch-alignment': 'map' } });
    if (plan.peak >= 0) {
      map.addSource('peak', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: [peakPt[0], peakPt[1]] } } });
      map.addLayer({ id: 'peak', type: 'circle', source: 'peak', paint: { 'circle-radius': 4, 'circle-color': '#09090B', 'circle-stroke-color': '#EDE6D6', 'circle-stroke-width': 2, 'circle-pitch-alignment': 'map' } });
    }
    apply(cues[0]);
    var started = false;
    function go() { if (started) return; started = true; C.mode === 'export' ? exportVideo() : play(); }
    map.once('idle', go);
    setTimeout(go, 8000);
  });
  map.on('error', function (e) { if (e && e.error && /401|403/.test(String(e.error.status || e.error.message))) send({ type: 'error', reason: 'token' }); });

  function play() {
    document.getElementById('veil').className = 'off';
    send({ type: 'start' });
    var t0 = performance.now(), last = -1;
    function tick(now) {
      var i = Math.floor(((now - t0) / 1000) * plan.fps);
      if (i >= cues.length) { apply(cues[cues.length - 1]); send({ type: 'end' }); return; }
      if (i !== last) {
        // Catch up through skipped cues so orbit and pull start where they should.
        for (var j = Math.max(0, last + 1); j <= i; j++) apply(cues[j]);
        last = i;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---- export -------------------------------------------------------------
  var OUT_W = 720, OUT_H = 1280;
  function settled() {
    return new Promise(function (resolve) {
      var deadline = performance.now() + 5000;
      function check() {
        if ((map.loaded() && map.areTilesLoaded()) || performance.now() > deadline) resolve();
        else { map.triggerRepaint(); map.once('render', check); }
      }
      map.triggerRepaint();
      map.once('render', check);
    });
  }
  function feet(m) { return Math.round(m * 3.28084).toLocaleString('en-US'); }
  function miles(km) { var mi = km / 1.609344; return mi >= 10 ? String(Math.round(mi)) : mi.toFixed(1); }
  function clock(s) { var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? h + ':' + (m < 10 ? '0' : '') + m : m + ' min'; }
  function fitName(ctx, name, max) {
    var size = 104;
    do { ctx.font = '800 ' + size + 'px "Bricolage Grotesque", sans-serif'; size -= 4; } while (ctx.measureText(name).width > max && size > 44);
  }
  function composite(ctx, cue, endFade) {
    ctx.drawImage(map.getCanvas(), 0, 0, OUT_W, OUT_H);
    var g = ctx.createLinearGradient(0, OUT_H * 0.6, 0, OUT_H);
    g.addColorStop(0, 'rgba(9,9,11,0)'); g.addColorStop(1, 'rgba(9,9,11,0.88)');
    ctx.fillStyle = g; ctx.fillRect(0, OUT_H * 0.6, OUT_W, OUT_H * 0.4);
    var top = ctx.createLinearGradient(0, 0, 0, 220);
    top.addColorStop(0, 'rgba(9,9,11,0.6)'); top.addColorStop(1, 'rgba(9,9,11,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, OUT_W, 220);
    ctx.textAlign = 'center'; ctx.fillStyle = '#EDE6D6';
    ctx.font = '800 26px "Bricolage Grotesque", sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '12px';
    ctx.fillText('APEX', OUT_W / 2 + 6, 96);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    var cols = [['MI', miles(cue.km)], ['FT GAIN', feet(cue.gain)], ['TIME', clock(cue.secs)]];
    for (var i = 0; i < 3; i++) {
      var x = OUT_W * (0.2 + i * 0.3);
      ctx.font = '700 54px "Space Mono", monospace'; ctx.fillStyle = '#FAFAFA'; ctx.fillText(cols[i][1], x, OUT_H - 150);
      ctx.font = '700 20px "Space Mono", monospace'; ctx.fillStyle = 'rgba(237,230,214,0.7)'; ctx.fillText(cols[i][0], x, OUT_H - 112);
    }
    if (endFade > 0) {
      ctx.globalAlpha = endFade; ctx.fillStyle = '#FAFAFA';
      var name = String(plan.stats.name || '').toUpperCase();
      fitName(ctx, name, OUT_W - 96);
      ctx.fillText(name, OUT_W / 2, OUT_H - 260);
      ctx.globalAlpha = 1;
    }
  }
  async function pickCodec() {
    var list = ['avc1.640028', 'avc1.4d0028', 'avc1.42001f'];
    for (var i = 0; i < list.length; i++) {
      try {
        var s = await VideoEncoder.isConfigSupported({ codec: list[i], width: OUT_W, height: OUT_H, bitrate: 8000000, framerate: plan.fps });
        if (s && s.supported) return list[i];
      } catch (e) {}
    }
    return null;
  }
  function toBase64(bytes) {
    var s = '', step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) s += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(s);
  }
  async function exportVideo() {
    try {
      if (typeof VideoEncoder === 'undefined' || !window.Mp4Muxer) { send({ type: 'error', reason: 'encoder' }); return; }
      var codec = await pickCodec();
      if (!codec) { send({ type: 'error', reason: 'encoder' }); return; }
      if (document.fonts) { try { await document.fonts.load('800 40px "Bricolage Grotesque"'); await document.fonts.load('700 40px "Space Mono"'); } catch (e) {} }
      send({ type: 'start' });
      var canvas = document.createElement('canvas'); canvas.width = OUT_W; canvas.height = OUT_H;
      var ctx = canvas.getContext('2d');
      var muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: OUT_W, height: OUT_H }, fastStart: 'in-memory' });
      var failed = null;
      var enc = new VideoEncoder({ output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); }, error: function (e) { failed = e; } });
      enc.configure({ codec: codec, width: OUT_W, height: OUT_H, bitrate: 8000000, framerate: plan.fps });
      var pullStart = -1;
      for (var i = 0; i < cues.length; i++) {
        if (failed) throw failed;
        var cue = cues[i];
        apply(cue);
        await settled();
        if (cue.p >= 0 && pullStart < 0) pullStart = i;
        var fade = cue.p >= 0 ? Math.min(1, cue.p * 1.4) : 0;
        composite(ctx, cue, fade);
        var frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / plan.fps), duration: Math.round(1e6 / plan.fps) });
        enc.encode(frame, { keyFrame: i % 60 === 0 });
        frame.close();
        while (enc.encodeQueueSize > 4) await new Promise(function (r) { setTimeout(r, 5); });
        if (i % 6 === 0) send({ type: 'progress', done: i, total: cues.length });
      }
      await enc.flush();
      muxer.finalize();
      var bytes = new Uint8Array(muxer.target.buffer);
      var b64 = toBase64(bytes), n = Math.ceil(b64.length / C.chunk);
      for (var k = 0; k < n; k++) send({ type: 'chunk', i: k, n: n, data: b64.slice(k * C.chunk, (k + 1) * C.chunk) });
      send({ type: 'exported', bytes: bytes.length });
    } catch (e) {
      send({ type: 'error', reason: 'export: ' + (e && e.message ? e.message : String(e)) });
    }
  }
})();
</script>
</body>
</html>`;
}
