import { NodeData, NodeArtifact } from '@/lib/ontology';
import { ProjectionMode } from '@/lib/projections';

/**
 * Generates a visual snapshot of the canvas with tactical overlay branding,
 * timestamp, coordinate stamp, grid lines, and projection specifics.
 */
export async function generateCanvasSnapshot(
  node: NodeData,
  projection: ProjectionMode
): Promise<NodeArtifact> {
  const canvas = document.createElement('canvas');
  const width = 1280;
  const height = 720;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.replace('T', ' ').slice(0, 19) + ' UTC';

  if (ctx) {
    // 1. Dark Canvas Background with gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0a0d14');
    bgGradient.addColorStop(0.5, '#0e121a');
    bgGradient.addColorStop(1, '#06080c');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Tactical Background Grid
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Polar Circles in center
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.lineWidth = 1.5;
    [100, 200, 300].forEach((r) => {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.beginPath();
    ctx.moveTo(width / 2 - 320, height / 2);
    ctx.lineTo(width / 2 + 320, height / 2);
    ctx.moveTo(width / 2, height / 2 - 320);
    ctx.lineTo(width / 2, height / 2 + 320);
    ctx.stroke();

    // 4. Projection Visual Render Simulation
    if (projection === 'geographic') {
      // Draw Map / Tactical Geometry
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.lineWidth = 2;

      // Simulated Landmass contours
      ctx.beginPath();
      ctx.ellipse(width / 2 - 100, height / 2 - 40, 220, 140, Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(width / 2 + 180, height / 2 + 60, 160, 110, -Math.PI / 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Target Pin & Radar Ring
      const pinX = width / 2;
      const pinY = height / 2;

      // Pulse rings
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pinX, pinY, 24, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pinX, pinY, 7, 0, Math.PI * 2);
      ctx.fill();

      // Location Callout Box
      ctx.fillStyle = 'rgba(13, 17, 23, 0.9)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.fillRect(pinX + 20, pinY - 40, 240, 50);
      ctx.strokeRect(pinX + 20, pinY - 40, 240, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(node.label, pinX + 32, pinY - 22);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(node.geo?.coordinatesText || '45°31\'54"N 122°39\'36"W', pinX + 32, pinY - 6);
    } else if (projection === 'digital') {
      // Digital polar network
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 2;

      const nodesPos = [
        { x: width / 2, y: height / 2, name: node.label, primary: true },
        { x: width / 2 - 180, y: height / 2 - 120, name: 'PARENT_GATEWAY', primary: false },
        { x: width / 2 + 200, y: height / 2 - 90, name: 'EDGE_ROUTER_01', primary: false },
        { x: width / 2 - 160, y: height / 2 + 140, name: 'STORAGE_CLUSTER', primary: false },
        { x: width / 2 + 170, y: height / 2 + 130, name: 'TELEMETRY_INGEST', primary: false },
      ];

      // Draw links
      nodesPos.forEach((p, i) => {
        if (i === 0) return;
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.moveTo(nodesPos[0].x, nodesPos[0].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw nodes
      nodesPos.forEach((p) => {
        ctx.fillStyle = p.primary ? '#3b82f6' : '#1e293b';
        ctx.strokeStyle = p.primary ? '#60a5fa' : '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.primary ? 18 : 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = p.primary ? '#ffffff' : '#cbd5e1';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(p.name, p.x + 22, p.y + 4);
      });
    } else if (projection === 'physical') {
      // Rack chassis representation
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      const rackW = 440;
      const rackH = 460;
      const rx = (width - rackW) / 2;
      const ry = (height - rackH) / 2;
      ctx.fillRect(rx, ry, rackW, rackH);
      ctx.strokeRect(rx, ry, rackW, rackH);

      // Blades
      for (let i = 0; i < 8; i++) {
        const by = ry + 20 + i * 52;
        ctx.fillStyle = i === 2 ? '#1e1b4b' : '#1e293b';
        ctx.strokeStyle = i === 2 ? '#3b82f6' : '#334155';
        ctx.lineWidth = 1.5;
        ctx.fillRect(rx + 16, by, rackW - 32, 42);
        ctx.strokeRect(rx + 16, by, rackW - 32, 42);

        // Status LED
        ctx.fillStyle = i === 2 ? '#10b981' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(rx + 36, by + 21, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText(`BLADE-${i + 1}: ${i === 2 ? node.label : 'HOT-SWAP REDUNDANT'}`, rx + 56, by + 25);
      }
    } else {
      // Ontology Matrix view
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      const cols = 4;
      const rows = 3;
      const cardW = 200;
      const cardH = 90;
      const startX = (width - cols * 220) / 2;
      const startY = (height - rows * 110) / 2;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const cx = startX + c * 220;
          const cy = startY + r * 110;
          const isTarget = c === 1 && r === 1;

          ctx.fillStyle = isTarget ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.5)';
          ctx.strokeStyle = isTarget ? '#3b82f6' : '#334155';
          ctx.fillRect(cx, cy, cardW, cardH);
          ctx.strokeRect(cx, cy, cardW, cardH);

          ctx.fillStyle = isTarget ? '#ffffff' : '#94a3b8';
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.fillText(isTarget ? node.label : `ENT_0x${c}${r}`, cx + 12, cy + 28);

          ctx.fillStyle = '#64748b';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(isTarget ? `TYPE: ${node.type}` : 'STATUS: SYNCED', cx + 12, cy + 48);
        }
      }
    }

    // 5. Tactical HUD Frame / Border Stamp
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    // Corners
    const cornerSize = 28;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(16, 16 + cornerSize);
    ctx.lineTo(16, 16);
    ctx.lineTo(16 + cornerSize, 16);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(width - 16 - cornerSize, 16);
    ctx.lineTo(width - 16, 16);
    ctx.lineTo(width - 16, 16 + cornerSize);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(16, height - 16 - cornerSize);
    ctx.lineTo(16, height - 16);
    ctx.lineTo(16 + cornerSize, height - 16);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(width - 16 - cornerSize, height - 16);
    ctx.lineTo(width - 16, height - 16);
    ctx.lineTo(width - 16, height - 16 - cornerSize);
    ctx.stroke();

    // 6. Header Watermark & Telemetry Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(24, 24, width - 48, 38);
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, width - 48, 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText(`◰ GDR-C2 SNAPSHOT ARTIFACT // ${projection.toUpperCase()} PROJECTION`, 36, 48);

    ctx.fillStyle = '#10b981';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`NODE: [${node.id.toUpperCase()}] ${node.label}  |  STATUS: ${node.status}`, width - 480, 48);

    // 7. Footer Timestamp and Calibration
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(24, height - 56, width - 48, 32);
    ctx.strokeRect(24, height - 56, width - 48, 32);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`TIMESTAMP: ${dateStr}  |  RES: 1280x720 60FPS  |  ENCRYPTION: AES-256-GCM`, 36, height - 36);

    ctx.fillStyle = '#60a5fa';
    ctx.fillText('CONFIDENTIAL // C2 MISSION INTELLIGENCE ARTIFACT', width - 360, height - 36);
  }

  const previewDataUrl = canvas.toDataURL('image/png');
  const artifactId = `snap_${Date.now().toString().slice(-6)}`;

  return {
    id: artifactId,
    label: `${node.label} [${projection.toUpperCase()}]`,
    timestamp: dateStr,
    projection,
    previewDataUrl,
    fileSize: '420 KB',
    dimensions: '1280 × 720',
    nodeId: node.id,
    summary: `Tactical snapshot capture of ${node.label} in ${projection} mode.`,
  };
}
