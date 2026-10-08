// Fixed-step spring guides. Motion is shared spatially; fiber roots stay attached.
export const FIXED_STEP = 1 / 120;
export const GUIDE_COUNT = 32;
export function stiffnessFor(length, stiffness) {
  // Longer fibers bend more easily; the slider describes material rigidity.
  return (28 + stiffness * 130) / (1 + length * 9);
}
export function stepSpring(position, velocity, force, stiffness, dt = FIXED_STEP) {
  const damping = 2 * Math.sqrt(stiffness) * .72;
  for (let axis = 0; axis < 3; axis++) {
    const acceleration = force[axis] - stiffness * position[axis] - damping * velocity[axis];
    velocity[axis] += acceleration * dt;
    position[axis] += velocity[axis] * dt;
  }
  const magnitude = Math.hypot(...position);
  if (magnitude > 1.6) {
    for (let axis = 0; axis < 3; axis++) {
      position[axis] *= 1.6 / magnitude;
      velocity[axis] *= .8;
    }
  }
}
export function tangentialForce(force, normal) {
  const dot = force[0] * normal[0] + force[1] * normal[1] + force[2] * normal[2];
  return force.map((value, i) => value - dot * normal[i]);
}
export function stepBounce(height, velocity, dt=FIXED_STEP, gravity=8, restitution=.24) {
  if(height<=0&&velocity<=0)return {height:0,velocity:0,impact:0};
  velocity-=gravity*dt;
  height+=velocity*dt;
  if(height<=0){const impact=Math.abs(velocity);return {height:0,velocity:impact>.8?impact*restitution:0,impact};}
  return {height,velocity,impact:0};
}
// CPU counterpart of the shader's arc-length integration, used for verification.
export function fiberPoints(root, normal, bend, length, segments = 6) {
  const result = [root.slice()];
  for (let i = 0; i < segments; i++) {
    const t = (i + .5) / segments;
    const direction = normal.map((v, axis) => v + bend[axis] * t * t);
    const magnitude = Math.hypot(...direction);
    const previous = result[result.length - 1];
    result.push(previous.map((v, axis) => v + direction[axis] / magnitude * length / segments));
  }
  return result;
}
