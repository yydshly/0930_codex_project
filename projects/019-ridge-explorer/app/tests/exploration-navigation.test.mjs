import test from 'node:test';
import assert from 'node:assert/strict';
import { LANDMARKS, TRAILS, START, distanceToTrail } from '../src/scene/exploration-map.js';
import { planTrailRoute, routeGuidance } from '../src/scene/exploration-navigation.js';

const separation = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = p => ({ x: p.x, z: p.z });
const landmark = id => LANDMARKS.find(p => p.id === id);
const junction = z => TRAILS[0].points.find(p => p.z === z);
const includesPoint = (route, p) => route.points.some(candidate => separation(candidate, p) < 1e-6);
const polylineLength = points => points.slice(1).reduce((sum, p, index) => sum + separation(points[index], p), 0);

function staysOnTrails(route, skipConnector = false) {
  for (let i = skipConnector ? 2 : 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i];
    for (let j = 0; j <= 20; j++) {
      const t = j / 20;
      assert.ok(distanceToTrail(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t) < 1e-6,
        'every routed segment must remain on an actual trail, including between its vertices');
    }
  }
  assert.ok(Math.abs(polylineLength(route.points) - route.distance) < 1e-7);
}

test('ridge junctions retain the complete creek, camp and lookout branch polylines', () => {
  const creek = planTrailRoute(junction(-40), 'creek');
  assert.deepEqual(creek.points, TRAILS[1].points.slice(0, 4).map(point));
  const camp = planTrailRoute(junction(-40), 'camp');
  assert.deepEqual(camp.points, TRAILS[1].points.slice(0, 7).map(point));
  const lookout = planTrailRoute(junction(-150), 'lookout');
  assert.deepEqual(lookout.points, TRAILS[2].points.slice(0, 5).map(point));
  for (const route of [creek, camp, lookout]) { staysOnTrails(route); assert.ok(route.distance > 0); }
});

test('travel between opposite branches crosses shared ridge junctions without cutting the hillside', () => {
  const creekToLookout = planTrailRoute(landmark('creek'), 'lookout');
  assert.ok(includesPoint(creekToLookout, junction(-40)));
  assert.ok(includesPoint(creekToLookout, junction(-150)));
  assert.ok(includesPoint(creekToLookout, junction(-100)), 'the main ridge retains its intermediate bends');
  assert.ok(creekToLookout.distance > separation(landmark('creek'), landmark('lookout')) + 30);
  staysOnTrails(creekToLookout);
  const campToLookout = planTrailRoute(landmark('camp'), 'lookout');
  assert.ok(includesPoint(campToLookout, junction(-230)));
  assert.ok(includesPoint(campToLookout, junction(-340)));
  staysOnTrails(campToLookout);
  const reverse = planTrailRoute(landmark('lookout'), 'camp');
  assert.ok(Math.abs(reverse.distance - campToLookout.distance) < 1e-7);
  staysOnTrails(reverse);
});

test('an off-trail position joins the nearest segment before following the trail graph', () => {
  const a = junction(20), b = junction(30), dx = b.x - a.x, dz = b.z - a.z;
  const length = separation(a, b), projection = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  const position = { x: projection.x + dz / length * 9, z: projection.z - dx / length * 9 };
  const route = planTrailRoute(position, 'camp');
  assert.deepEqual(route.points[0], position);
  assert.ok(separation(route.points[1], projection) < 1e-7);
  assert.ok(Math.abs(route.offTrailDistance - 9) < 1e-7);
  staysOnTrails(route, true);
  const guidance = routeGuidance(position, 'camp');
  assert.ok(guidance.offTrail);
  assert.ok(!guidance.arrived);
  assert.deepEqual(guidance.waypoint, route.points[1]);
  assert.equal(guidance.remainingDistance, route.distance);
});

test('guidance looks twelve metres along the next trail bends instead of pointing at the destination', () => {
  const [first, second] = TRAILS[1].points;
  const start = { x: (first.x + second.x) / 2, z: (first.z + second.z) / 2 };
  const route = routeGuidance(start, 'camp');
  const firstLength = separation(route.points[0], route.points[1]);
  assert.ok(firstLength < 12, 'this fixture looks beyond the first branch bend');
  const a = route.points[1], b = route.points[2], t = (12 - firstLength) / separation(a, b);
  const expected = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  assert.ok(separation(route.waypoint, expected) < 1e-7);
  assert.ok(distanceToTrail(route.waypoint.x, route.waypoint.z) < 1e-7);
  assert.ok(!route.offTrail && !route.arrived);
  const near = { x: START.x + 1, z: START.z };
  assert.ok(!routeGuidance(near, 'creek').offTrail, 'small steering deviations do not replace the forward waypoint');
});

test('arrival uses the actual discovery radius, gives zero remaining distance and stops steering', () => {
  const creek = landmark('creek');
  const exact = routeGuidance(creek, 'creek');
  assert.deepEqual(exact.points, [point(creek)]);
  assert.equal(exact.distance, 0);
  assert.ok(exact.arrived);
  assert.equal(exact.remainingDistance, 0);
  assert.deepEqual(exact.waypoint, point(creek));
  const inside = { x: creek.x + creek.radius - .01, z: creek.z };
  const near = routeGuidance(inside, 'creek');
  assert.ok(near.arrived);
  assert.equal(near.remainingDistance, 0);
  assert.deepEqual(near.waypoint, inside);
  assert.ok(!routeGuidance({ x: creek.x + creek.radius + .01, z: creek.z }, 'creek').arrived);
});

test('missing targets and invalid coordinates return null, and result mutation cannot alter future routes', () => {
  for (const position of [null, undefined, {}, { x: 1 }, { x: NaN, z: 0 }, { x: 0, z: Infinity }, { x: '0', z: 0 }]) {
    assert.equal(planTrailRoute(position, 'camp'), null);
    assert.equal(routeGuidance(position, 'camp'), null);
  }
  for (const destination of [undefined, null, '', 'unknown', '__proto__', 0, {}]) {
    assert.equal(planTrailRoute(START, destination), null);
    assert.equal(routeGuidance(START, destination), null);
  }
  const expected = planTrailRoute(START, 'camp');
  const changed = planTrailRoute(START, 'camp');
  changed.points[0].x = 9999; changed.points[1].z = 9999; changed.points.push({ x: 1, z: 2 });
  assert.deepEqual(planTrailRoute(START, 'camp'), expected);
});
