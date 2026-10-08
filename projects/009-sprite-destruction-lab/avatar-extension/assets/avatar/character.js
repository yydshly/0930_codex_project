/**
 * Original Canvas character. All coordinates are relative to the feet.
 * `time` is elapsed seconds; facing=1 looks right, facing=-1 looks left.
 * No physics or DOM state lives here: callers choose the position and pose.
 */
export function drawCharacter(ctx, {
  x = 0, y = 0, scale = 1, pose = 'idle', time = 0,
  facing = 1, headImage = null, portrait = false,
} = {}) {
  if (!ctx || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(scale) || scale <= 0) return;
  time = Number.isFinite(time) ? time : 0;
  const outline = '#172b45';
  const skin = '#ffc88c';
  const isRun = pose === 'run';
  const isWalk = pose === 'walk' || pose === 'return';
  const phase = time * (isRun ? 15 : 9);
  const stride = Math.sin(phase);
  const lift = Math.max(0, Math.cos(phase));
  const moving = isRun || isWalk;
  const bounce = portrait ? Math.sin(time * 2.4) * 1.1
    : moving ? -Math.abs(Math.sin(phase)) * (isRun ? 3.5 : 1.7)
    : pose === 'jump' ? -1.5 : Math.sin(time * 2.4) * .8;
  const lean = portrait ? 0 : isRun ? .12 : pose === 'kick' ? -.09 : pose === 'jump' ? -.05 : 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (facing < 0 ? -1 : 1), scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // A soft contact shadow helps the figure belong to a real page. The caller
  // can keep it on a separate floor by passing portrait=true when clipping.
  if (!portrait && pose !== 'jump') {
    ctx.fillStyle = 'rgba(23,43,69,.12)';
    ctx.beginPath(); ctx.ellipse(0, 3, pose === 'kick' ? 28 : 22, 4.4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(0, bounce);
  ctx.rotate(lean);

  const backLeg = [[-8, -30], [-10, -16], [-10, -3]];
  const frontLeg = [[8, -30], [10, -16], [10, -3]];
  let backArm = [[-15, -54], [-23, -41], [-21, -30]];
  let frontArm = [[15, -54], [23, -41], [21, -30]];
  if (moving) {
    const reach = isRun ? 22 : 13;
    backLeg[1] = [-8 - stride * reach * .56, -17 - lift * 3];
    backLeg[2] = [-8 - stride * reach, -3 - lift * (isRun ? 9 : 4)];
    frontLeg[1] = [8 + stride * reach * .56, -17 - (1 - lift) * 3];
    frontLeg[2] = [8 + stride * reach, -3 - Math.max(0, -Math.cos(phase)) * (isRun ? 9 : 4)];
    backArm = [[-15, -54], [-20 + stride * 11, -43], [-17 + stride * (isRun ? 20 : 13), -32]];
    frontArm = [[15, -54], [20 - stride * 11, -43], [17 - stride * (isRun ? 20 : 13), -32]];
    if (pose === 'return') frontArm = [[15, -54], [27, -62], [29 + Math.sin(time * 8) * 3, -76]];
  } else if (pose === 'jump') {
    backLeg[1] = [-17, -20]; backLeg[2] = [-10, -13];
    frontLeg[1] = [16, -20]; frontLeg[2] = [23, -14];
    backArm = [[-15, -54], [-27, -70], [-25, -86]];
    frontArm = [[15, -54], [28, -67], [31, -83]];
  } else if (pose === 'kick') {
    backLeg[1] = [-12, -16]; backLeg[2] = [-14, -2];
    frontLeg[1] = [26, -24]; frontLeg[2] = [48, -22 + Math.sin(time * 13) * .7];
    backArm = [[-15, -54], [-31, -48], [-38, -58]];
    frontArm = [[15, -54], [24, -66], [15, -69]];
  }

  const limb = (points, width, color) => {
    ctx.beginPath(); ctx.moveTo(...points[0]); ctx.lineTo(...points[1]); ctx.lineTo(...points[2]);
    ctx.strokeStyle = outline; ctx.lineWidth = width + 3; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  };
  const hand = ([hx, hy]) => {
    ctx.fillStyle = skin; ctx.strokeStyle = outline; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(hx, hy, 5.6, 6.1, -.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d48d68'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx + 1, hy - 1.8); ctx.lineTo(hx + 2.7, hy + .6); ctx.stroke();
  };
  const shoe = ([fx, fy], back = false) => {
    ctx.save(); ctx.translate(fx, fy);
    if (pose === 'kick' && !back) ctx.rotate(-.18);
    ctx.fillStyle = back ? '#233b58' : '#304968'; ctx.strokeStyle = outline; ctx.lineWidth = 2;
    roundedRect(ctx, -6.5, -4.2, 18, 9.2, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#e7eef2'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-4, 3.1); ctx.lineTo(9, 3.1); ctx.stroke();
    if (!back) {
      ctx.strokeStyle = '#aabaca'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(0, -2.2); ctx.lineTo(3, -.7); ctx.moveTo(3, -2.5); ctx.lineTo(6, -.9); ctx.stroke();
    }
    ctx.restore();
  };

  if (!portrait) {
    limb(backLeg, 10, '#243952'); shoe(backLeg[2], true);
    limb(frontLeg, 11, '#365272'); shoe(frontLeg[2]);
    limb(backArm, 10, '#d87934'); hand(backArm[2]);
  }

  // Short jacket, contrasted collar, zipper and pocket: readable at small sizes.
  ctx.fillStyle = skin; ctx.strokeStyle = outline; ctx.lineWidth = 2;
  roundedRect(ctx, -6, -64, 12, 13, 4); ctx.fill(); ctx.stroke();
  const jacket = ctx.createLinearGradient(-15, -58, 18, -28);
  jacket.addColorStop(0, '#ffb058'); jacket.addColorStop(1, '#ef833b');
  ctx.fillStyle = jacket;
  ctx.beginPath();
  ctx.moveTo(-11, -59); ctx.quadraticCurveTo(-22, -56, -18, -43);
  ctx.lineTo(-15, -28); ctx.quadraticCurveTo(0, -24, 15, -28);
  ctx.lineTo(18, -43); ctx.quadraticCurveTo(22, -56, 11, -59);
  ctx.lineTo(0, -54); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff2d6';
  ctx.beginPath(); ctx.moveTo(-7, -58); ctx.lineTo(0, -54); ctx.lineTo(7, -58); ctx.lineTo(4, -42); ctx.lineTo(-4, -42); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#b65d2c'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(0, -28); ctx.moveTo(-12, -37); ctx.lineTo(-6, -39); ctx.moveTo(7, -39); ctx.lineTo(13, -37); ctx.stroke();
  ctx.fillStyle = '#ffe8ab'; roundedRect(ctx, -1.3, -41, 2.6, 5, 1); ctx.fill();
  ctx.fillStyle = outline; ctx.globalAlpha = .2; roundedRect(ctx, -13, -29, 26, 3, 1); ctx.fill(); ctx.globalAlpha = 1;

  if (!portrait) {
    limb(frontArm, 10, '#f99a48');
    // Pale cuff is visible between the orange sleeve and the hand.
    ctx.fillStyle = '#fff0d2'; ctx.beginPath(); ctx.arc(frontArm[2][0], frontArm[2][1] - 2.5, 5.1, 0, Math.PI * 2); ctx.fill();
    hand(frontArm[2]);
  }

  ctx.save();
  ctx.translate(0, -80);
  ctx.rotate(portrait ? Math.sin(time * 1.8) * .025 : pose === 'kick' ? .06 : pose === 'jump' ? -.04 : -.025);
  // Hair silhouette behind the ears, including a small rebellious forelock.
  ctx.fillStyle = '#253f61'; ctx.strokeStyle = outline; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22, 8); ctx.bezierCurveTo(-30, -1, -28, -17, -19, -23);
  ctx.quadraticCurveTo(-26, -27, -14, -28); ctx.quadraticCurveTo(-9, -35, -1, -28);
  ctx.quadraticCurveTo(12, -35, 15, -25); ctx.quadraticCurveTo(28, -28, 26, -15);
  ctx.quadraticCurveTo(32, -5, 23, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = skin;
  for (const earX of [-22, 22]) {
    ctx.beginPath(); ctx.ellipse(earX, 4, 5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d9936e'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(earX, 4, 2.5, -.9, .9); ctx.stroke(); ctx.strokeStyle = outline; ctx.lineWidth = 2;
  }
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 1, 22, 23, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  const imageWidth = headImage?.naturalWidth || headImage?.videoWidth || headImage?.width || 0;
  const imageHeight = headImage?.naturalHeight || headImage?.videoHeight || headImage?.height || 0;
  if (headImage && imageWidth > 0 && imageHeight > 0) {
    // The supplied photo remains a static circular head, attached to the body.
    // It is never interpreted as a rigged or generated full-body character.
    ctx.save(); ctx.beginPath(); ctx.arc(0, 1, 21.5, 0, Math.PI * 2); ctx.clip();
    const side = Math.min(imageWidth, imageHeight);
    ctx.drawImage(headImage, (imageWidth - side) / 2, (imageHeight - side) / 2, side, side, -22, -21, 44, 44);
    ctx.restore();
  } else {
    // Front fringe leaves the eyes and expressive eyebrows unobstructed.
    ctx.fillStyle = '#253f61';
    ctx.beginPath(); ctx.moveTo(-22, -8); ctx.quadraticCurveTo(-23, -25, -5, -25);
    ctx.quadraticCurveTo(17, -30, 23, -10); ctx.lineTo(16, -6); ctx.lineTo(14, -15);
    ctx.quadraticCurveTo(4, -4, -4, -13); ctx.quadraticCurveTo(-9, -4, -18, -7); ctx.lineTo(-19, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#476584'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-16, -20); ctx.quadraticCurveTo(-7, -25, 0, -21); ctx.moveTo(5, -22); ctx.quadraticCurveTo(13, -25, 18, -17); ctx.stroke();
    const blink = Math.sin(time * .72) > .997;
    const eyebrowTilt = pose === 'kick' ? 2 : pose === 'jump' ? -1.5 : 0;
    ctx.strokeStyle = outline; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-13, -5 - eyebrowTilt); ctx.lineTo(-5, -6 + eyebrowTilt);
    ctx.moveTo(5, -6 + eyebrowTilt); ctx.lineTo(13, -5 - eyebrowTilt); ctx.stroke();
    for (const eyeX of [-9, 9]) {
      if (blink) {
        ctx.beginPath(); ctx.moveTo(eyeX - 3, 2); ctx.lineTo(eyeX + 3, 2); ctx.stroke();
      } else {
        ctx.fillStyle = outline; ctx.beginPath(); ctx.ellipse(eyeX, 2, 2.9, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(eyeX + .8, .4, 1, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(231,119,100,.32)';
    ctx.beginPath(); ctx.ellipse(-15, 9, 4.2, 2.2, .1, 0, Math.PI * 2); ctx.ellipse(15, 9, 4.2, 2.2, -.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d68b63'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.quadraticCurveTo(-2, 7, 1, 8); ctx.stroke();
    if (pose === 'jump' || pose === 'kick' || isRun) {
      ctx.fillStyle = '#813f43'; ctx.strokeStyle = outline; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-7, 12); ctx.quadraticCurveTo(0, 17, 7, 12); ctx.quadraticCurveTo(4, 24, -3, 21); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6e8'; ctx.beginPath(); ctx.moveTo(-5, 13); ctx.quadraticCurveTo(0, 16, 5, 13); ctx.lineTo(4, 16); ctx.lineTo(-4, 16); ctx.closePath(); ctx.fill();
    } else {
      ctx.strokeStyle = outline; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-6, 13); ctx.quadraticCurveTo(0, 19, 7, 12); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r); ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height); ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
