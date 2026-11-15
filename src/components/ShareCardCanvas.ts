import { MedalTier } from '../game/types';

export interface ShareCardParams {
  levelNumber: number;
  levelName: string;
  isVictory: boolean;
  timeFormatted: string;
  fragmentsCollected: number;
  fragmentsTotal: number;
  pulsesUsed: number;
  hintsUsed: number;
  medal: MedalTier;
  recapText: string;
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  // Works for space-separated scripts as well as CJK strings
  const hasSpaces = text.includes(' ');
  const tokens = hasSpaces ? text.split(/\s+/) : Array.from(text);
  const joiner = hasSpaces ? ' ' : '';
  const lines: string[] = [];
  let current = '';

  for (const tok of tokens) {
    const candidate = current ? `${current}${joiner}${tok}` : tok;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = tok;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

export async function renderShareCardBlob(params: ShareCardParams): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Deep obsidian background gradient
  const bg = ctx.createLinearGradient(0, 0, 1200, 630);
  bg.addColorStop(0, '#050812');
  bg.addColorStop(0.55, '#091225');
  bg.addColorStop(1, '#070B16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 630);

  // Subtle geometric sonar rings on right
  ctx.save();
  const cx = 965;
  const cy = 285;
  const ringRadii = [75, 130, 195, 265, 340];
  ringRadii.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle =
      idx % 2 === 0 ? 'rgba(67, 232, 255, 0.16)' : 'rgba(155, 123, 255, 0.13)';
    ctx.lineWidth = idx === 1 ? 2.5 : 1.5;
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#43E8FF';
  ctx.fill();
  ctx.restore();

  // Crisp outer frame
  ctx.strokeStyle = 'rgba(67, 232, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, 1144, 574);

  // Top label
  ctx.fillStyle = '#43E8FF';
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    params.isVictory
      ? 'SANCTUM RESTORED · CAMPAIGN COMPLETE'
      : `LEVEL 0${params.levelNumber} CLEAR · ${params.levelName.toUpperCase()}`,
    72,
    92
  );

  // Main title
  ctx.fillStyle = '#F1F5FF';
  ctx.font = '700 54px system-ui, -apple-system, sans-serif';
  ctx.fillText('ECHOES OF THE DARK', 72, 158);

  // Medal callout if earned
  if (params.medal) {
    const medalColor =
      params.medal === 'gold' ? '#FFC857' : params.medal === 'silver' ? '#D8E3F8' : '#E09F67';
    ctx.fillStyle = medalColor;
    ctx.font = '700 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${params.medal.toUpperCase()} MEDAL`, 72, 204);
  } else {
    ctx.fillStyle = '#A4B0C6';
    ctx.font = '500 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('EXPLORER RUN SUMMARY', 72, 204);
  }

  // Stats grid row
  const statsY = 262;
  const statItems = [
    { label: 'TIME', value: params.timeFormatted, color: '#F1F5FF' },
    {
      label: 'FRAGMENTS',
      value: `${params.fragmentsCollected}/${params.fragmentsTotal}`,
      color: '#FFC857',
    },
    { label: 'PULSES', value: String(params.pulsesUsed), color: '#43E8FF' },
    { label: 'HINTS', value: String(params.hintsUsed), color: '#9B7BFF' },
  ];

  statItems.forEach((item, i) => {
    const sx = 72 + i * 210;
    ctx.fillStyle = 'rgba(16, 24, 42, 0.85)';
    ctx.fillRect(sx, statsY, 188, 92);
    ctx.strokeStyle = 'rgba(57, 134, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(sx, statsY, 188, 92);

    ctx.fillStyle = '#A4B0C6';
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(item.label, sx + 16, statsY + 30);

    ctx.fillStyle = item.color;
    ctx.font = '700 32px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(item.value, sx + 16, statsY + 70);
  });

  // Poetic Recap box
  ctx.fillStyle = 'rgba(12, 19, 36, 0.88)';
  ctx.fillRect(72, 386, 1056, 128);
  ctx.strokeStyle = 'rgba(67, 232, 255, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(72, 386, 1056, 128);

  ctx.fillStyle = '#43E8FF';
  ctx.font = '600 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('ECHO KEEPER RECAP', 94, 416);

  ctx.fillStyle = '#F1F5FF';
  ctx.font = '400 22px system-ui, -apple-system, sans-serif';
  const lines = wrapTextLines(ctx, params.recapText, 1010, 3);
  lines.forEach((line, idx) => {
    ctx.fillText(line, 94, 450 + idx * 28);
  });

  // Footer
  ctx.fillStyle = '#A4B0C6';
  ctx.font = '500 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('3D Acoustic Puzzle Adventure · In a world without light, sound reveals the path.', 72, 566);

  ctx.fillStyle = '#9B7BFF';
  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Built with Gemini', 1128, 566);
  ctx.textAlign = 'left';

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
