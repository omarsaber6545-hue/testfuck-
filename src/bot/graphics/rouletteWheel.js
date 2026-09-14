const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

const WHEEL_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#059669',
  '#D97706', '#4F46E5', '#0891B2', '#DC2626',
  '#14B8A6', '#8B5CF6', '#F43F5E', '#10B981'
];

/**
 * Preload avatars for participants
 */
async function loadAvatars(participants) {
  const avatarMap = new Map();
  await Promise.all(
    participants.map(async p => {
      try {
        if (p.avatarURL) {
          const img = await loadImage(p.avatarURL);
          avatarMap.set(p.id, img);
        }
      } catch {
        // Fallback handled in render
      }
    })
  );
  return avatarMap;
}

/**
 * Draw a single frame of the roulette wheel
 */
function drawWheelFrame(ctx, size, angleRad, participants, avatarMap, highlightedIndex, isFinished) {
  const center = size / 2;
  const radius = size * 0.40;

  // Clear background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, size, size);

  // Outer decorative dark wheel border
  ctx.beginPath();
  ctx.arc(center, center, radius + 22, 0, Math.PI * 2);
  ctx.fillStyle = '#1E293B';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#334155';
  ctx.stroke();

  // Outer golden rim
  ctx.beginPath();
  ctx.arc(center, center, radius + 8, 0, Math.PI * 2);
  ctx.strokeStyle = isFinished ? '#F59E0B' : '#64748B';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Golden perimeter studs
  const numStuds = 24;
  for (let i = 0; i < numStuds; i++) {
    const studAngle = (i * Math.PI * 2) / numStuds;
    const sx = center + (radius + 15) * Math.cos(studAngle);
    const sy = center + (radius + 15) * Math.sin(studAngle);
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();
  }

  const numSlices = participants.length;
  const sliceAngle = (Math.PI * 2) / numSlices;

  // Draw slices
  for (let i = 0; i < numSlices; i++) {
    const currentAngle = angleRad + i * sliceAngle;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();

    ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
    ctx.fill();

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw participant username
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(currentAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px sans-serif';

    // Format username
    const name = participants[i].username || `لاعب ${i + 1}`;
    const truncated = name.length > 11 ? name.substring(0, 10) + '..' : name;
    ctx.fillText(truncated, radius - 20, 0);
    ctx.restore();
  }

  // Draw Center Hub with User Avatar
  const hubRadius = 45;
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, hubRadius, 0, Math.PI * 2);
  ctx.clip();

  const currentParticipant = participants[highlightedIndex] || participants[0];
  const avatarImg = avatarMap.get(currentParticipant.id);

  if (avatarImg) {
    ctx.drawImage(avatarImg, center - hubRadius, center - hubRadius, hubRadius * 2, hubRadius * 2);
  } else {
    // Fallback initials circle
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(center - hubRadius, center - hubRadius, hubRadius * 2, hubRadius * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (currentParticipant.username || 'U')[0].toUpperCase();
    ctx.fillText(initial, center, center);
  }
  ctx.restore();

  // Center hub golden ring
  ctx.beginPath();
  ctx.arc(center, center, hubRadius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = isFinished ? '#F59E0B' : '#E2E8F0';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Top Pointer Arrow (fixed at top 12 o'clock, pointing down)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(center, radius * 0.18);
  ctx.lineTo(center - 14, 8);
  ctx.lineTo(center + 14, 8);
  ctx.closePath();
  ctx.fillStyle = '#EF4444';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/**
 * Generate complete animated GIF of roulette wheel
 * @param {Array} participants - List of participants { id, username, avatarURL }
 * @param {number} winnerIndex - Index of the winning participant
 * @returns {Promise<Buffer>} - Animated GIF buffer
 */
async function generateRouletteGif(participants, winnerIndex) {
  const size = 420;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const avatarMap = await loadAvatars(participants);
  const gif = GIFEncoder();

  const numSlices = participants.length;
  const sliceAngleDeg = 360 / numSlices;

  // Pointer is at the top (270 degrees in canvas space or -90 deg)
  // Target: The winner slice center should align with 270 degrees!
  // Winner slice starts at (winnerIndex * sliceAngleDeg) + sliceAngleDeg / 2
  // We want: (finalRotation + winnerCenter) % 360 = 270
  // finalRotation = (270 - winnerCenter + 360) % 360
  const winnerCenter = winnerIndex * sliceAngleDeg + sliceAngleDeg / 2;
  const finalOffset = (270 - winnerCenter + 720) % 360;

  // Total spins: 4 full turns + final offset
  const totalSpins = 4;
  const totalRotation = totalSpins * 360 + finalOffset;

  const totalFrames = 18;

  // Cubic ease-out formula
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  for (let f = 0; f <= totalFrames; f++) {
    const t = f / totalFrames;
    const progress = easeOutCubic(t);
    const currentAngleDeg = progress * totalRotation;
    const angleRad = (currentAngleDeg * Math.PI) / 180;

    // Determine which slice is currently under the pointer
    const normalized = (270 - (currentAngleDeg % 360) + 720) % 360;
    const currentSliceUnderPointer = Math.floor(normalized / sliceAngleDeg) % numSlices;

    const isFinished = f === totalFrames;
    const highlightedIndex = isFinished ? winnerIndex : currentSliceUnderPointer;

    drawWheelFrame(ctx, size, angleRad, participants, avatarMap, highlightedIndex, isFinished);

    // Quantize and write frame
    const { data } = ctx.getImageData(0, 0, size, size);
    const palette = quantize(data, 128);
    const index = applyPalette(data, palette);

    // Fast during spin, longer delay at the end
    const delay = isFinished ? 700 : f < 4 ? 70 : f < 12 ? 90 : 130;
    gif.writeFrame(index, size, size, { palette, delay });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}

module.exports = {
  generateRouletteGif,
  WHEEL_COLORS
};
