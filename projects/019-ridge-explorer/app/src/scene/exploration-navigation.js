import { LANDMARKS, TRAILS } from './exploration-map.js';

const EPSILON = 1e-7;
const LOOK_AHEAD = 12;
const OFF_TRAIL_DISTANCE = 3;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const copyPoint = point => ({ x: point.x, z: point.z });
const validPosition = position => position !== null && typeof position === 'object'
  && Number.isFinite(position.x) && Number.isFinite(position.z);

function project(position, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared ? Math.max(0, Math.min(1,
    ((position.x - a.x) * dx + (position.z - a.z) * dz) / lengthSquared)) : 0;
  return { point: { x: a.x + dx * t, z: a.z + dz * t }, t };
}

// Split shared vertices and crossing segments before building the undirected
// graph. A branch may meet the middle of a ridge segment, not only its ends.
function buildTrailGraph() {
  const nodes = [], keys = new Map(), segments = [];
  const addNode = point => {
    const key = `${Math.round(point.x / EPSILON)}:${Math.round(point.z / EPSILON)}`;
    if (!keys.has(key)) { keys.set(key, nodes.length); nodes.push(copyPoint(point)); }
    return keys.get(key);
  };
  for (const trail of TRAILS) {
    for (const point of trail.points) addNode(point);
    for (let i = 1; i < trail.points.length; i++) {
      const a = trail.points[i - 1], b = trail.points[i];
      if (distance(a, b) > EPSILON) segments.push({ a, b });
    }
  }
  for (const landmark of LANDMARKS) addNode(landmark);
  for (let i = 0; i < segments.length; i++) {
    const first = segments[i], rx = first.b.x - first.a.x, rz = first.b.z - first.a.z;
    for (let j = i + 1; j < segments.length; j++) {
      const second = segments[j], sx = second.b.x - second.a.x, sz = second.b.z - second.a.z;
      const denominator = rx * sz - rz * sx;
      if (Math.abs(denominator) <= EPSILON) continue;
      const qx = second.a.x - first.a.x, qz = second.a.z - first.a.z;
      const t = (qx * sz - qz * sx) / denominator;
      const u = (qx * rz - qz * rx) / denominator;
      if (t >= -EPSILON && t <= 1 + EPSILON && u >= -EPSILON && u <= 1 + EPSILON)
        addNode({ x: first.a.x + rx * Math.max(0, Math.min(1, t)), z: first.a.z + rz * Math.max(0, Math.min(1, t)) });
    }
  }
  const neighbors = nodes.map(() => new Map());
  for (const segment of segments) {
    const onSegment = nodes.map((point, id) => ({ ...project(point, segment.a, segment.b), id }))
      .filter(candidate => distance(nodes[candidate.id], candidate.point) <= EPSILON * 2)
      .sort((a, b) => a.t - b.t);
    for (let i = 1; i < onSegment.length; i++) {
      const a = onSegment[i - 1].id, b = onSegment[i].id, length = distance(nodes[a], nodes[b]);
      if (length <= EPSILON) continue;
      neighbors[a].set(b, length); neighbors[b].set(a, length);
    }
  }
  const edges = [];
  for (let a = 0; a < neighbors.length; a++)
    for (const [b, length] of neighbors[a]) if (a < b) edges.push({ a, b, length });
  const landmarkNodes = new Map(LANDMARKS.map(landmark => [landmark.id, addNode(landmark)]));
  return { nodes, neighbors, edges, landmarkNodes };
}

const graph = buildTrailGraph();

function nearestTrailProjection(position) {
  let nearest = null;
  for (const edge of graph.edges) {
    const { point } = project(position, graph.nodes[edge.a], graph.nodes[edge.b]);
    const separation = distance(position, point);
    if (Number.isFinite(separation) && (!nearest || separation < nearest.distance))
      nearest = { point, distance: separation, edge };
  }
  return nearest;
}

function shortestPath(projection, destination) {
  const start = graph.nodes.length, distances = Array(start + 1).fill(Infinity);
  const previous = Array(start + 1).fill(-1), visited = Array(start + 1).fill(false);
  distances[start] = 0;
  for (let iteration = 0; iteration <= start; iteration++) {
    let current = -1;
    for (let i = 0; i <= start; i++)
      if (!visited[i] && (current < 0 || distances[i] < distances[current])) current = i;
    if (current < 0 || !Number.isFinite(distances[current])) return null;
    if (current === destination) break;
    visited[current] = true;
    const neighbors = current === start
      ? [projection.edge.a, projection.edge.b].map(id => [id, distance(projection.point, graph.nodes[id])])
      : graph.neighbors[current];
    for (const [neighbor, length] of neighbors) {
      const nextDistance = distances[current] + length;
      if (nextDistance < distances[neighbor]) { distances[neighbor] = nextDistance; previous[neighbor] = current; }
    }
  }
  const path = [];
  for (let id = destination; id !== -1; id = previous[id])
    path.push(id === start ? copyPoint(projection.point) : copyPoint(graph.nodes[id]));
  return path.reverse();
}

/**
 * Return the shortest route along the connected trails, including a straight
 * connector from the current position to its nearest trail projection.
 * `distance` includes that connector; `offTrailDistance` reports its length.
 * All returned points are fresh objects, so callers cannot change the graph.
 */
export function planTrailRoute(position, destinationId) {
  if (!validPosition(position) || typeof destinationId !== 'string' || !graph.landmarkNodes.has(destinationId)) return null;
  const projection = nearestTrailProjection(position);
  if (!projection) return null;
  const path = shortestPath(projection, graph.landmarkNodes.get(destinationId));
  if (!path) return null;
  const points = [copyPoint(position)];
  for (const point of path) if (distance(points.at(-1), point) > EPSILON) points.push(point);
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return { points, distance: total, offTrailDistance: projection.distance };
}

function pointAhead(points, travel) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = distance(a, b);
    if (travel <= length) {
      const t = length ? travel / length : 0;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    travel -= length;
  }
  return copyPoint(points.at(-1));
}

/** Guide toward the trail first when more than 3m off it, then 12m ahead. */
export function routeGuidance(position, destinationId) {
  const route = planTrailRoute(position, destinationId);
  if (!route) return null;
  const landmark = LANDMARKS.find(point => point.id === destinationId);
  const arrived = distance(position, landmark) <= landmark.radius;
  const offTrail = route.offTrailDistance > OFF_TRAIL_DISTANCE;
  const waypoint = arrived ? copyPoint(position) : offTrail ? copyPoint(route.points[1]) : pointAhead(route.points, LOOK_AHEAD);
  return { ...route, waypoint, remainingDistance: arrived ? 0 : route.distance, arrived, offTrail };
}
