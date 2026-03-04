
export interface MVPData {
  nick: string;
  avatar_url?: string;
  abates: number;
  dano_medio: number;
  win_rate: string;
  periodo: string;
}

export const generateMVPCard = async (data: MVPData) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 9:16 Ratio (Instagram Stories)
  canvas.width = 1080;
  canvas.height = 1920;

  // 1. Background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gradients
  const grad1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 1000);
  grad1.addColorStop(0, 'rgba(255, 107, 0, 0.15)');
  grad1.addColorStop(1, 'transparent');
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad2 = ctx.createRadialGradient(canvas.width, canvas.height, 0, canvas.width, canvas.height, 1000);
  grad2.addColorStop(0, 'rgba(255, 107, 0, 0.1)');
  grad2.addColorStop(1, 'transparent');
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle Texture (Lines)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // 2. Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b00';
  ctx.font = '900 48px Outfit, sans-serif';
  ctx.letterSpacing = '12px';
  ctx.fillText('ELITE DO SQUAD', canvas.width / 2, 180);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 86px Outfit, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('MVP DA SEMANA', canvas.width / 2, 280);

  // Period
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '400 32px Inter, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText(data.periodo.toUpperCase(), canvas.width / 2, 340);

  // 3. Central Area (Player)
  // Avatar Placeholder Circle
  const avatarY = 700;
  const avatarRadius = 220;
  
  // Glow behind avatar
  const glow = ctx.createRadialGradient(canvas.width / 2, avatarY, 0, canvas.width / 2, avatarY, avatarRadius * 1.5);
  glow.addColorStop(0, 'rgba(255, 107, 0, 0.3)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, avatarY, avatarRadius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Avatar Circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.clip();
  
  if (data.avatar_url && data.avatar_url !== 'link_para_foto.jpg') {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = data.avatar_url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      ctx.drawImage(img, canvas.width / 2 - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    } catch (e) {
      // Fallback to placeholder color
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.fillStyle = '#ff6b00';
    ctx.font = '900 120px Outfit, sans-serif';
    ctx.fillText(data.nick.charAt(0).toUpperCase(), canvas.width / 2, avatarY + 40);
  }
  ctx.restore();

  // Border for avatar
  ctx.strokeStyle = '#ff6b00';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Nickname
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 110px Outfit, sans-serif';
  ctx.fillText(data.nick.toUpperCase(), canvas.width / 2, 1050);

  // 4. Stats Section (Bento Grid)
  const drawGlassBox = (x: number, y: number, w: number, h: number, label: string, value: string | number) => {
    ctx.save();
    // Shadow/Glow
    ctx.shadowColor = 'rgba(255, 107, 0, 0.2)';
    ctx.shadowBlur = 20;
    
    // Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 30);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Content
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '700 28px Inter, sans-serif';
    ctx.fillText(label.toUpperCase(), x + w / 2, y + 60);
    
    ctx.fillStyle = '#ff6b00';
    ctx.font = '900 72px Outfit, sans-serif';
    ctx.fillText(value.toString(), x + w / 2, y + 150);
    ctx.restore();
  };

  const boxW = 300;
  const boxH = 200;
  const spacing = 40;
  const startX = (canvas.width - (boxW * 3 + spacing * 2)) / 2;
  const startY = 1200;

  drawGlassBox(startX, startY, boxW, boxH, 'Abates', data.abates);
  drawGlassBox(startX + boxW + spacing, startY, boxW, boxH, 'Dano Médio', data.dano_medio);
  drawGlassBox(startX + (boxW + spacing) * 2, startY, boxW, boxH, 'Win Rate', data.win_rate);

  // 5. Footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.font = '900 40px Outfit, sans-serif';
  ctx.fillText('FF STATS PRO', canvas.width / 2, 1750);
  
  ctx.font = '400 24px Inter, sans-serif';
  ctx.fillText(new Date().toLocaleDateString('pt-BR'), canvas.width / 2, 1800);

  // Download
  const link = document.createElement('a');
  link.download = `MVP_${data.nick}_${new Date().getTime()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
