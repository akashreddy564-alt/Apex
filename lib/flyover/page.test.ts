import test from 'node:test';
import assert from 'node:assert/strict';
import { flyoverHtml } from './page.ts';
import { flyoverPlan } from './plan.ts';

const coords = Array.from({ length: 30 }, (_, i) => [-121, 47 + i * 0.001, 500 + i * 10]);

test('the page carries the token and the plan, and only export loads the muxer', () => {
  const plan = flyoverPlan(coords, { name: 'Mount Si', distanceKm: 3, gainM: 290, durationSeconds: 3600 });
  assert.ok(plan);
  const play = flyoverHtml('pk.test', plan, 'play');
  assert.ok(play.includes('"token":"pk.test"'));
  assert.ok(!play.includes('mp4-muxer'));
  assert.ok(flyoverHtml('pk.test', plan, 'export').includes('mp4-muxer@5.1.3'));
});

test('a trail name cannot close the script element', () => {
  const plan = flyoverPlan(coords, { name: '</script><script>alert(1)</script>', distanceKm: 3, gainM: 290, durationSeconds: 3600 });
  assert.ok(plan);
  const html = flyoverHtml('pk.test', plan, 'play');
  assert.equal(html.split('</script>').length - 1, 2); // mapbox-gl and the page script, nothing from the name
  assert.ok(html.includes('\\u003c/script>'));
});
