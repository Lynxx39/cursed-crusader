// SpriteFactory.js - Procedural Pixel-Art Canvas Texture Generator
export class SpriteFactory {
  static generateAll(scene) {
    this.createKnightTexture(scene);
    this.createFeralBeastTexture(scene);
    this.createAbyssalBladeTexture(scene);
    this.createGargoyleTexture(scene);
    this.createSlashTextures(scene);
    this.createEnemyTextures(scene);
    this.createPickupTextures(scene);
    this.createGateTextures(scene);
    this.createEnvironmentTextures(scene);
    this.createParticleTextures(scene);
  }

  // 1. Holy Knight (Fallback procedural)
  static createKnightTexture(scene) {
    if (scene.textures.exists('knight')) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#991b1b'; ctx.fillRect(10, 16, 8, 22);
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(9, 15, 14, 18);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(10, 4, 12, 12);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(13, 9, 7, 2);
    scene.textures.addCanvas('knight', canvas);
  }

  // 2. Feral Beast (Fallback procedural)
  static createFeralBeastTexture(scene) {
    if (scene.textures.exists('beast_feral')) return;
    const canvas = document.createElement('canvas');
    canvas.width = 48; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath(); ctx.ellipse(22, 16, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.fillRect(36, 10, 4, 3);
    scene.textures.addCanvas('beast_feral', canvas);
  }

  // 3. Abyssal Blade (40x56)
  static createAbyssalBladeTexture(scene) {
    if (scene.textures.exists('beast_abyssal')) return;
    const canvas = document.createElement('canvas');
    canvas.width = 48; canvas.height = 56;
    const ctx = canvas.getContext('2d');

    // Spectral Shadow Cloak
    ctx.fillStyle = '#1e1035';
    ctx.beginPath();
    ctx.moveTo(20, 10); ctx.lineTo(36, 50); ctx.lineTo(18, 54); ctx.lineTo(6, 46);
    ctx.closePath(); ctx.fill();

    // Void Core
    ctx.fillStyle = '#6b21a8';
    ctx.beginPath(); ctx.ellipse(20, 26, 8, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c084fc'; ctx.fillRect(16, 11, 3, 2); ctx.fillRect(21, 11, 3, 2);

    // Colossal Void Blade
    ctx.fillStyle = '#3b0764'; ctx.fillRect(32, 4, 6, 50);
    ctx.fillStyle = '#e879f9'; ctx.fillRect(34, 6, 2, 44);
    ctx.fillStyle = '#a855f7'; ctx.fillRect(28, 38, 14, 3);

    scene.textures.addCanvas('beast_abyssal', canvas);
  }

  // 4. Gargoyle Colossus (56x56)
  static createGargoyleTexture(scene) {
    if (scene.textures.exists('beast_gargoyle')) return;
    const canvas = document.createElement('canvas');
    canvas.width = 56; canvas.height = 56;
    const ctx = canvas.getContext('2d');

    // Heavy Slate Stone
    ctx.fillStyle = '#1f2937'; ctx.fillRect(12, 14, 32, 30);
    ctx.fillStyle = '#374151'; ctx.fillRect(16, 16, 24, 24);
    // Magma Veins
    ctx.fillStyle = '#ef4444'; ctx.fillRect(20, 22, 3, 14); ctx.fillRect(28, 20, 4, 16);
    ctx.fillStyle = '#f97316'; ctx.fillRect(21, 25, 8, 3);
    // Heavy Fists
    ctx.fillStyle = '#111827'; ctx.fillRect(4, 24, 10, 18); ctx.fillRect(42, 24, 10, 18);
    // Horned Head
    ctx.fillStyle = '#111827'; ctx.fillRect(20, 4, 16, 12);
    ctx.fillStyle = '#facc15'; ctx.fillRect(23, 8, 3, 3); ctx.fillRect(30, 8, 3, 3);

    scene.textures.addCanvas('beast_gargoyle', canvas);
  }

  // 5. Attack Slash FX Textures (Authentic 16-Bit Pixel-Art Craftsman Grade)
  static createSlashTextures(scene) {
    if (!scene.textures.exists('slash_knight')) {
      const c = document.createElement('canvas');
      c.width = 48; c.height = 48;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 16-bit Steel Blade Crescent (Facing Right)
      for (let y = 4; y <= 43; y++) {
        const v = (y - 24.0) / 19.0;
        if (Math.abs(v) > 0.98) continue;
        const frontX = 42.0 - 26.0 * (v * v);
        const centerF = Math.max(0.0, 1.0 - (v * v));
        const thickness = 2.5 + centerF * 5.5;
        const backX = frontX - thickness;

        for (let x = Math.max(0, Math.floor(backX - 2)); x <= Math.min(47, Math.ceil(frontX + 1)); x++) {
          const dist = frontX - x;
          if (dist < -0.8) continue;
          if (dist <= 1.2) {
            ctx.fillStyle = '#ffffff'; // White-hot blade cutting edge
            ctx.fillRect(x, y, 1, 1);
          } else if (dist <= 2.6) {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#bae6fd' : '#ffffff'; // Radiant pale azure highlight
            ctx.fillRect(x, y, 1, 1);
          } else if (dist <= 4.5) {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#38bdf8' : '#bae6fd'; // Brilliant knight cyan
            ctx.fillRect(x, y, 1, 1);
          } else if (dist <= 6.5) {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#1d4ed8' : '#38bdf8'; // Royal sapphire steel
            ctx.fillRect(x, y, 1, 1);
          } else {
            if ((x + y) % 2 === 0) {
              ctx.fillStyle = '#0f172a'; // Deep midnight trailing shadow
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }
      // Trailing blade sparks
      ctx.fillStyle = '#bae6fd'; ctx.fillRect(14, 10, 2, 2); ctx.fillRect(10, 24, 2, 2); ctx.fillRect(14, 38, 2, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(38, 16, 2, 1); ctx.fillRect(40, 24, 2, 2); ctx.fillRect(38, 32, 2, 1);

      scene.textures.addCanvas('slash_knight', c);
    }

    if (!scene.textures.exists('holy_arc')) {
      const c = document.createElement('canvas');
      c.width = 48; c.height = 72;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 16-bit Radiant Holy Crescent Fallback (Facing Right)
      for (let y = 4; y <= 67; y++) {
        const v = (y - 36.0) / 32.0;
        if (Math.abs(v) > 0.98) continue;
        const frontX = 38.0 - 24.5 * (v * v);
        const centerF = Math.max(0.0, 1.0 - (v * v));
        const thickness = 4.5 + centerF * 8.5;
        const backX = frontX - thickness;

        for (let x = Math.max(0, Math.floor(backX - 3)); x <= Math.min(47, Math.ceil(frontX + 1)); x++) {
          const dist = frontX - x;
          if (dist < -0.8) continue;
          if (dist <= 1.4) {
            ctx.fillStyle = '#ffffff'; // White-hot solar razor core
            ctx.fillRect(x, y, 1, 1);
          } else if (dist <= 3.2) {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#fef08a' : '#facc15'; // Radiant molten gold
            ctx.fillRect(x, y, 1, 1);
          } else if (dist <= 6.5) {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#eab308' : '#ca8a04'; // Gilded golden edge
            ctx.fillRect(x, y, 1, 1);
          } else if (dist <= 9.5) {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#f97316' : '#ea580c'; // Sacred sunfire aura
            ctx.fillRect(x, y, 1, 1);
          } else {
            if ((x + y) % 2 === 0) {
              ctx.fillStyle = '#451a03'; // Charred obsidian cinder rim
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }
      // Detached trailing solar sparks
      ctx.fillStyle = '#fef08a'; ctx.fillRect(6, 18, 2, 2); ctx.fillRect(4, 36, 2, 2); ctx.fillRect(6, 54, 2, 2);
      ctx.fillStyle = '#f97316'; ctx.fillRect(2, 26, 2, 2); ctx.fillRect(2, 46, 2, 2);

      scene.textures.addCanvas('holy_arc', c);
    }

    if (!scene.textures.exists('slash_feral')) {
      const c = document.createElement('canvas');
      c.width = 48; c.height = 36;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 16-bit Triple Savage Claw Gouge
      const drawClawRake = (x0, y0, x1, y1) => {
        const steps = 30;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const cx = Math.round(x0 + (x1 - x0) * t);
          const cy = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 2);
          const w = (t > 0.85) ? 1 : (t < 0.2 ? 2 : 3);

          // Deep dark blood underlayer
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(cx - 1, cy - 1, w + 2, 4);
          // Crimson arterial blood core
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(cx, cy, w, 2);
          // Razor bone tip highlight
          if (t > 0.75) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx + 1, cy, 1, 1);
          }
        }
      };

      drawClawRake(8, 6, 38, 12);
      drawClawRake(6, 17, 42, 20);
      drawClawRake(10, 27, 36, 30);

      // Blood splatter spray
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(41, 10, 2, 1); ctx.fillRect(44, 22, 2, 2); ctx.fillRect(39, 32, 1, 2);
      ctx.fillRect(24, 3, 1, 1); ctx.fillRect(28, 33, 2, 1);

      scene.textures.addCanvas('slash_feral', c);
    }

    if (!scene.textures.exists('slash_abyssal')) {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 16-bit Colossal Abyssal Dimensional Tear
      for (let y = 6; y <= 57; y++) {
        const v = (y - 32.0) / 26.0;
        if (Math.abs(v) > 0.98) continue;
        const frontX = 54.0 - 34.0 * (v * v);
        const centerF = Math.max(0.0, 1.0 - (v * v));
        const thickness = 4.0 + centerF * 9.0;
        const backX = frontX - thickness;

        for (let x = Math.max(0, Math.floor(backX - 3)); x <= Math.min(63, Math.ceil(frontX + 1)); x++) {
          const dist = frontX - x;
          if (dist < -0.8) continue;
          if (dist <= 1.5) {
            ctx.fillStyle = '#f5d0fe'; // Ethereal lilac razor edge
            ctx.fillRect(x, y, 1, 1);
          } else if (dist <= 3.5) {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#e879f9' : '#f5d0fe'; // Neon violet flare
            ctx.fillRect(x, y, 1, 1);
          } else if (dist <= 7.0) {
            ctx.fillStyle = ((x + y) % 2 === 0) ? '#a855f7' : '#6b21a8'; // Abyssal spectral purple
            ctx.fillRect(x, y, 1, 1);
          } else {
            if ((x + y) % 2 === 0) {
              ctx.fillStyle = '#1e1035'; // Pitch obsidian void
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }
      // Floating void sparks
      ctx.fillStyle = '#e879f9'; ctx.fillRect(8, 20, 2, 2); ctx.fillRect(6, 34, 2, 2); ctx.fillRect(10, 48, 2, 2);
      ctx.fillStyle = '#f5d0fe'; ctx.fillRect(52, 24, 2, 1); ctx.fillRect(53, 38, 2, 1);

      scene.textures.addCanvas('slash_abyssal', c);
    }

    if (!scene.textures.exists('slash_gargoyle')) {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 16-bit Volcanic Earth Basalt Rupture
      const drawSpike = (xBase, wBase, xTip, yTip) => {
        // Slate rock base & sides
        ctx.fillStyle = '#111827';
        for (let y = 31; y >= yTip; y--) {
          const progress = (31 - y) / (31 - yTip);
          const w = Math.max(1, Math.round(wBase * (1.0 - progress)));
          const cx = Math.round(xBase + (xTip - xBase) * progress);
          ctx.fillRect(cx - Math.floor(w / 2), y, w, 1);
        }
        // Rugged slate highlight
        ctx.fillStyle = '#374151';
        for (let y = 30; y >= yTip + 2; y -= 2) {
          const progress = (31 - y) / (31 - yTip);
          const cx = Math.round(xBase + (xTip - xBase) * progress);
          ctx.fillRect(cx - 1, y, 2, 1);
        }
        // Molten magma vein
        ctx.fillStyle = '#ef4444';
        for (let y = 30; y >= yTip + 4; y -= 3) {
          const progress = (31 - y) / (31 - yTip);
          const cx = Math.round(xBase + (xTip - xBase) * progress);
          ctx.fillRect(cx, y, 1, 2);
        }
        // Molten yellow magma apex
        ctx.fillStyle = '#facc15'; ctx.fillRect(xTip - 1, yTip, 3, 2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(xTip, yTip, 1, 1);
      };

      drawSpike(14, 16, 14, 6);
      drawSpike(33, 20, 34, 2);
      drawSpike(50, 16, 51, 8);

      // Trailing volcanic cinder sparks
      ctx.fillStyle = '#f97316'; ctx.fillRect(20, 4, 2, 2); ctx.fillRect(44, 4, 2, 2); ctx.fillRect(32, 0, 2, 1);

      scene.textures.addCanvas('slash_gargoyle', c);
    }
  }

  // 6. Enemy Textures (Fallback procedural)
  static createEnemyTextures(scene) {
    if (!scene.textures.exists('enemy_ghoul')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#64748b'; ctx.fillRect(10, 6, 12, 18);
      scene.textures.addCanvas('enemy_ghoul', c);
    }
    if (!scene.textures.exists('enemy_cultist')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 36;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#3b0764'; ctx.fillRect(10, 8, 12, 22);
      scene.textures.addCanvas('enemy_cultist', c);
    }
    if (!scene.textures.exists('enemy_elite')) {
      const c = document.createElement('canvas');
      c.width = 48; c.height = 48;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#1e293b'; ctx.fillRect(12, 10, 24, 26);
      scene.textures.addCanvas('enemy_elite', c);
    }
  }

  // 7. Pickups
  static createPickupTextures(scene) {
    if (!scene.textures.exists('blood_orb')) {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fecaca';
      ctx.beginPath(); ctx.arc(6, 6, 2, 0, Math.PI * 2); ctx.fill();
      scene.textures.addCanvas('blood_orb', c);
    }

    if (!scene.textures.exists('gold_coin')) {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef08a'; ctx.fillRect(6, 5, 4, 6);
      scene.textures.addCanvas('gold_coin', c);
    }
  }

  // 8. GRAND GOTHIC ARCHWAY PORTALS (80x128 px) - Dark Fantasy Roguelite Grade
  static createGateTextures(scene) {
    const makeGrandGothicGate = (key, theme) => {
      if (scene.textures.exists(key)) return;
      const c = document.createElement('canvas');
      c.width = 84;
      c.height = 128;
      const ctx = c.getContext('2d');

      // 1. Triple-tiered Carved Stone Plinth (Base)
      ctx.fillStyle = '#090d16';
      ctx.fillRect(4, 120, 76, 8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 114, 68, 6);
      ctx.fillStyle = '#334155';
      ctx.fillRect(12, 108, 60, 6);
      // Mortar highlights
      ctx.fillStyle = '#475569';
      ctx.fillRect(14, 110, 56, 1);

      // 2. Twin Gothic Columns / Fluted Pillars
      const drawPillar = (px) => {
        // Base block
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px, 32, 14, 76);
        ctx.fillStyle = '#334155';
        ctx.fillRect(px + 2, 34, 10, 72);
        // Fluted vertical grooves
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px + 4, 38, 2, 64);
        ctx.fillRect(px + 8, 38, 2, 64);
        // Column Capital (Brackets)
        ctx.fillStyle = '#475569';
        ctx.fillRect(px - 2, 28, 18, 6);
        ctx.fillRect(px - 1, 30, 16, 2);
      };
      drawPillar(12); // Left Pillar
      drawPillar(58); // Right Pillar

      // 3. Pointed Gothic Ogive Archway
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      // Outer arch
      ctx.moveTo(10, 32);
      ctx.quadraticCurveTo(10, 2, 42, 2);
      ctx.quadraticCurveTo(74, 2, 74, 32);
      // Inner arch
      ctx.lineTo(58, 34);
      ctx.quadraticCurveTo(58, 18, 42, 16);
      ctx.quadraticCurveTo(26, 18, 26, 34);
      ctx.closePath();
      ctx.fill();

      // Stone moulding bevel
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 4. Dimensional Vortex Interior (Swirling Portal Rift)
      const grad = ctx.createRadialGradient(42, 66, 4, 42, 66, 34);
      grad.addColorStop(0, theme.coreGlow);
      grad.addColorStop(0.4, theme.midColor);
      grad.addColorStop(0.85, theme.outerColor);
      grad.addColorStop(1, '#05070a');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(26, 34);
      ctx.quadraticCurveTo(26, 16, 42, 14);
      ctx.quadraticCurveTo(58, 16, 58, 34);
      ctx.lineTo(58, 108);
      ctx.lineTo(26, 108);
      ctx.closePath();
      ctx.fill();

      // Swirling ethereal energy lines
      ctx.strokeStyle = theme.streakColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(42, 64, 10, 24, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(42, 64, 18, 34, -0.15, 0, Math.PI * 2);
      ctx.stroke();

      // 5. Ornate Stone Gargoyle / Skull Keystone at Arch Peak
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(36, 0, 12, 12);
      ctx.fillStyle = '#475569';
      ctx.fillRect(38, 2, 8, 8);
      // Keystone Eyes
      ctx.fillStyle = theme.eyeColor;
      ctx.fillRect(39, 4, 2, 2);
      ctx.fillRect(43, 4, 2, 2);

      // 6. Floating Gothic Heraldic Crest & Ribbon Banner
      // Crest Plaque
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(22, 14, 40, 16);
      ctx.strokeStyle = theme.trimColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(22, 14, 40, 16);

      // Gold / Chalice / Skull Emblem
      theme.drawIcon(ctx, 42, 22);

      scene.textures.addCanvas(key, c);
    };

    // Gate 1: Treasury of Midas (Gold)
    makeGrandGothicGate('gate_gold', {
      outerColor: '#451a03',
      midColor: '#b45309',
      coreGlow: '#fef08a',
      streakColor: '#f59e0b',
      trimColor: '#fbbf24',
      eyeColor: '#fde047',
      drawIcon: (ctx, x, y) => {
        ctx.fillStyle = '#fde047';
        // Crowned Chalice
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 5); ctx.lineTo(x + 6, y - 5);
        ctx.lineTo(x + 4, y + 2); ctx.lineTo(x - 4, y + 2);
        ctx.closePath(); ctx.fill();
        ctx.fillRect(x - 2, y + 2, 4, 3);
        ctx.fillRect(x - 5, y + 5, 10, 2);
      }
    });

    // Gate 2: Altar of Relics (Arcane)
    makeGrandGothicGate('gate_relic', {
      outerColor: '#2e1065',
      midColor: '#7e22ce',
      coreGlow: '#f5d0fe',
      streakColor: '#c084fc',
      trimColor: '#a855f7',
      eyeColor: '#e879f9',
      drawIcon: (ctx, x, y) => {
        ctx.fillStyle = '#e879f9';
        // Mystic Arcane Eye
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3b0764';
        ctx.fillRect(x - 1, y - 4, 2, 8);
      }
    });

    // Gate 3: Blood Altar of the Beast (Beast / Curse)
    makeGrandGothicGate('gate_altar', {
      outerColor: '#450a0a',
      midColor: '#b91c1c',
      coreGlow: '#fecaca',
      streakColor: '#ef4444',
      trimColor: '#dc2626',
      eyeColor: '#ff0000',
      drawIcon: (ctx, x, y) => {
        ctx.fillStyle = '#fca5a5';
        // Horned Demon Skull
        ctx.fillRect(x - 5, y - 3, 10, 7);
        // Horns
        ctx.fillRect(x - 7, y - 6, 2, 4);
        ctx.fillRect(x + 5, y - 6, 2, 4);
        // Red Eye sockets
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(x - 3, y - 1, 2, 2);
        ctx.fillRect(x + 1, y - 1, 2, 2);
      }
    });
  }

  // 9. Environment Tiles
  static createEnvironmentTextures(scene) {
    if (!scene.textures.exists('tile_floor')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#161d2f'; ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#232d42'; ctx.fillRect(0, 0, 32, 4);
      ctx.fillStyle = '#0a0d14'; ctx.strokeRect(1, 1, 30, 30);
      ctx.fillStyle = '#3b4761'; ctx.fillRect(6, 10, 4, 3); ctx.fillRect(18, 20, 5, 3);
      scene.textures.addCanvas('tile_floor', c);
    }

    if (!scene.textures.exists('tile_platform')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 16;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#232d42'; ctx.fillRect(0, 0, 32, 16);
      ctx.fillStyle = '#3b4761'; ctx.fillRect(0, 0, 32, 3);
      ctx.fillStyle = '#0a0d14'; ctx.strokeRect(0, 0, 32, 16);
      scene.textures.addCanvas('tile_platform', c);
    }

    // 16-Bit Breakable Terracotta Urn (24x28)
    if (!scene.textures.exists('urn_clay')) {
      const c = document.createElement('canvas');
      c.width = 24; c.height = 28;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Urn Rim & Lip
      ctx.fillStyle = '#78350f'; ctx.fillRect(5, 3, 14, 4);
      ctx.fillStyle = '#92400e'; ctx.fillRect(6, 4, 12, 2);
      ctx.fillStyle = '#451a03'; ctx.fillRect(8, 2, 8, 2);

      // Neck
      ctx.fillStyle = '#78350f'; ctx.fillRect(7, 7, 10, 3);

      // Belly
      ctx.fillStyle = '#b45309'; ctx.fillRect(4, 10, 16, 13);
      ctx.fillStyle = '#d97706'; ctx.fillRect(5, 11, 4, 11); // Left clay highlight
      ctx.fillStyle = '#92400e'; ctx.fillRect(9, 11, 7, 11);
      ctx.fillStyle = '#451a03'; ctx.fillRect(16, 11, 4, 11); // Right shadow

      // Ancient Gold Inlay Band
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(4, 14, 16, 2);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(5, 14, 3, 2);

      // Base
      ctx.fillStyle = '#78350f'; ctx.fillRect(6, 23, 12, 4);
      ctx.fillStyle = '#451a03'; ctx.fillRect(7, 26, 10, 2);

      scene.textures.addCanvas('urn_clay', c);
    }

    // Rusted Iron Impalement Hazard Spikes (32x24) - Authentic Dark Gothic Stakes
    if (!scene.textures.exists('hazard_spikes')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 24;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Heavy weathered iron plinth
      ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, 20, 32, 4);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(1, 20, 30, 2);
      ctx.fillStyle = '#334155'; ctx.fillRect(2, 22, 28, 1);

      // Jagged medieval impalement triangular stakes
      const drawTriSpike = (baseX, w, tipX, tipY) => {
        // Dark iron silhouette
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(baseX, 20);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(baseX + w, 20);
        ctx.closePath();
        ctx.fill();

        // Shaded side
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(baseX + 1, 20);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tipX + 1, 20);
        ctx.closePath();
        ctx.fill();

        // Highlight spine
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(tipX, tipY + 2);
        ctx.lineTo(tipX, 18);
        ctx.stroke();

        // Coagulated dried blood & barbed tip
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(tipX - 1, tipY + 1, 3, 4);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(tipX, tipY, 1, 3);
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(tipX - 1, tipY + 5, 2, 3);
      };

      // 3 natural asymmetrical medieval iron stakes (varying heights: 16px, 22px, 14px)
      drawTriSpike(1, 9, 5, 4);    // Stake 1 (left, sharp & tall)
      drawTriSpike(11, 11, 16, 1); // Stake 2 (center, tallest razor pike)
      drawTriSpike(22, 9, 27, 6);  // Stake 3 (right, angled barb)

      // Iron rivet bolts on the base
      ctx.fillStyle = '#64748b';
      ctx.fillRect(3, 21, 2, 2);
      ctx.fillRect(15, 21, 2, 2);
      ctx.fillRect(27, 21, 2, 2);

      scene.textures.addCanvas('hazard_spikes', c);
    }

    // Altar of Sacrifice (Blood Shrine, 40x52)
    if (!scene.textures.exists('shrine_blood')) {
      const c = document.createElement('canvas');
      c.width = 40; c.height = 52;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Carved stone plinth
      ctx.fillStyle = '#090d16'; ctx.fillRect(2, 44, 36, 8);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(4, 38, 32, 6);
      ctx.fillStyle = '#334155'; ctx.fillRect(8, 22, 24, 16);

      // Crimson Blood Runes on altar face
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(18, 24, 4, 12);
      ctx.fillRect(13, 28, 14, 3);
      ctx.fillRect(15, 34, 10, 2);

      // Golden sacrificial bowl atop altar
      ctx.fillStyle = '#b45309'; ctx.fillRect(6, 14, 28, 8);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(8, 15, 24, 3);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(10, 15, 4, 2);

      // Pool of sacrificial blood inside bowl
      ctx.fillStyle = '#991b1b'; ctx.fillRect(8, 12, 24, 4);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(11, 12, 18, 3);

      // Glowing crimson ethereal wisp rising from blood
      ctx.fillStyle = '#f87171'; ctx.fillRect(15, 5, 10, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(18, 7, 4, 3);

      scene.textures.addCanvas('shrine_blood', c);
    }

    // Wall-Mounted Iron Torch Sconce (16x32)
    if (!scene.textures.exists('torch_sconce')) {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Iron bracket
      ctx.fillStyle = '#0f172a'; ctx.fillRect(2, 14, 10, 4);
      ctx.fillStyle = '#334155'; ctx.fillRect(6, 12, 4, 16);

      // Wooden torch shaft
      ctx.fillStyle = '#78350f'; ctx.fillRect(7, 8, 2, 8);

      // Metal sconce bowl
      ctx.fillStyle = '#475569'; ctx.fillRect(5, 6, 6, 3);

      // Fire flame
      ctx.fillStyle = '#ea580c'; ctx.fillRect(6, 2, 4, 5);
      ctx.fillStyle = '#f97316'; ctx.fillRect(7, 1, 2, 4);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(7, 3, 2, 2);

      scene.textures.addCanvas('torch_sconce', c);
    }

    // 11. Subterranean Crypt Foundation Masonry (32x32)
    if (!scene.textures.exists('tile_foundation')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#111827'; ctx.fillRect(1, 1, 14, 14); ctx.fillRect(17, 1, 14, 14);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(1, 17, 7, 14); ctx.fillRect(10, 17, 14, 14); ctx.fillRect(26, 17, 5, 14);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(2, 2, 12, 2); ctx.fillRect(18, 2, 12, 2); ctx.fillRect(11, 18, 12, 2);
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 15, 32, 2);
      ctx.fillRect(15, 0, 2, 16);
      ctx.fillRect(8, 16, 2, 16);
      ctx.fillRect(24, 16, 2, 16);

      scene.textures.addCanvas('tile_foundation', c);
    }

    // Chasm Cliff Face Edges & Corners (32x32)
    // Left Cliff Top Corner (Floor drops off on the right)
    if (!scene.textures.exists('tile_cliff_corner_left')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Base stone fill
      ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, 28, 32);
      // Top flagstone surface
      ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 26, 8);
      ctx.fillStyle = '#334155'; ctx.fillRect(0, 1, 24, 4);
      ctx.fillStyle = '#64748b'; ctx.fillRect(0, 1, 22, 1);
      // Masonry brick layers below
      ctx.fillStyle = '#111827'; ctx.fillRect(0, 9, 26, 11); ctx.fillRect(0, 21, 24, 11);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(1, 10, 12, 2); ctx.fillRect(14, 10, 10, 2);
      ctx.fillStyle = '#05070a'; ctx.fillRect(0, 8, 28, 1); ctx.fillRect(0, 20, 26, 1);
      // Right jagged cliff drop-off
      ctx.fillStyle = '#090d16';
      ctx.fillRect(24, 2, 4, 6);
      ctx.fillRect(26, 6, 2, 8);
      ctx.fillRect(24, 14, 3, 10);
      ctx.fillRect(22, 24, 3, 8);
      // Dark moss & blood stain dripping off edge
      ctx.fillStyle = '#14532d'; ctx.fillRect(20, 3, 3, 2);
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(24, 8, 2, 6);

      scene.textures.addCanvas('tile_cliff_corner_left', c);
    }

    // Right Cliff Top Corner (Floor begins on the right, void on the left)
    if (!scene.textures.exists('tile_cliff_corner_right')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Base stone fill
      ctx.fillStyle = '#090d16'; ctx.fillRect(4, 0, 28, 32);
      // Top flagstone surface
      ctx.fillStyle = '#1e293b'; ctx.fillRect(6, 0, 26, 8);
      ctx.fillStyle = '#334155'; ctx.fillRect(8, 1, 24, 4);
      ctx.fillStyle = '#64748b'; ctx.fillRect(10, 1, 22, 1);
      // Masonry brick layers below
      ctx.fillStyle = '#111827'; ctx.fillRect(6, 9, 26, 11); ctx.fillRect(8, 21, 24, 11);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(8, 10, 12, 2); ctx.fillRect(21, 10, 10, 2);
      ctx.fillStyle = '#05070a'; ctx.fillRect(4, 8, 28, 1); ctx.fillRect(6, 20, 26, 1);
      // Left jagged cliff rise
      ctx.fillStyle = '#090d16';
      ctx.fillRect(4, 2, 4, 6);
      ctx.fillRect(4, 6, 2, 8);
      ctx.fillRect(5, 14, 3, 10);
      ctx.fillRect(7, 24, 3, 8);
      // Moss and blood
      ctx.fillStyle = '#14532d'; ctx.fillRect(9, 3, 3, 2);
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(6, 8, 2, 6);

      scene.textures.addCanvas('tile_cliff_corner_right', c);
    }

    // Subterranean Vertical Cliff Wall Left (facing right into pit)
    if (!scene.textures.exists('tile_cliff_left')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, 28, 32);
      ctx.fillStyle = '#111827'; ctx.fillRect(0, 1, 25, 14); ctx.fillRect(0, 16, 23, 15);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(1, 2, 11, 2); ctx.fillRect(13, 2, 10, 2); ctx.fillRect(2, 17, 18, 2);
      ctx.fillStyle = '#05070a'; ctx.fillRect(0, 15, 26, 1);
      // Jagged rocky right face
      ctx.fillStyle = '#090d16';
      ctx.fillRect(24, 4, 4, 8);
      ctx.fillRect(22, 12, 4, 10);
      ctx.fillRect(21, 22, 5, 10);
      ctx.fillStyle = '#450a0a'; ctx.fillRect(22, 8, 2, 12); // blood seep

      scene.textures.addCanvas('tile_cliff_left', c);
    }

    // Subterranean Vertical Cliff Wall Right (facing left into pit)
    if (!scene.textures.exists('tile_cliff_right')) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = '#090d16'; ctx.fillRect(4, 0, 28, 32);
      ctx.fillStyle = '#111827'; ctx.fillRect(7, 1, 25, 14); ctx.fillRect(9, 16, 23, 15);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(9, 2, 11, 2); ctx.fillRect(21, 2, 10, 2); ctx.fillRect(11, 17, 18, 2);
      ctx.fillStyle = '#05070a'; ctx.fillRect(6, 15, 26, 1);
      // Jagged rocky left face
      ctx.fillStyle = '#090d16';
      ctx.fillRect(4, 4, 4, 8);
      ctx.fillRect(6, 12, 4, 10);
      ctx.fillRect(6, 22, 5, 10);
      ctx.fillStyle = '#450a0a'; ctx.fillRect(8, 8, 2, 12); // blood seep

      scene.textures.addCanvas('tile_cliff_right', c);
    }

    // Ground Drop-Shadow for Characters & Enemies (36x12)
    if (!scene.textures.exists('shadow_ellipse')) {
      const c = document.createElement('canvas');
      c.width = 36; c.height = 12;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(18, 6, 2, 18, 6, 16);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.60)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 36, 12);
      scene.textures.addCanvas('shadow_ellipse', c);
    }

    // Ornate Gothic Skull Crest for HUD (28x28)
    if (!scene.textures.exists('hud_skull_crest')) {
      const c = document.createElement('canvas');
      c.width = 28; c.height = 28;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Iron filigree ring
      ctx.fillStyle = '#1e293b'; ctx.fillRect(2, 2, 24, 24);
      ctx.fillStyle = '#334155'; ctx.fillRect(3, 3, 22, 22);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(5, 5, 18, 18);

      // Gold corner studs
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(2, 2, 2, 2); ctx.fillRect(24, 2, 2, 2);
      ctx.fillRect(2, 24, 2, 2); ctx.fillRect(24, 24, 2, 2);

      // Carved Skull
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(9, 7, 10, 8); // cranium
      ctx.fillRect(10, 15, 8, 5); // jaw
      // Eye sockets (Ruby glow)
      ctx.fillStyle = '#ef4444'; ctx.fillRect(11, 10, 2, 3); ctx.fillRect(15, 10, 2, 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(11, 11, 1, 1); ctx.fillRect(15, 11, 1, 1);
      // Nasal cavity & teeth
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(13, 14, 2, 2);
      ctx.fillRect(11, 18, 1, 2); ctx.fillRect(13, 18, 1, 2); ctx.fillRect(15, 18, 1, 2);

      scene.textures.addCanvas('hud_skull_crest', c);
    }

    // Gilded Coin Icon for Run Stats (16x16)
    if (!scene.textures.exists('icon_gold_coin')) {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = '#b45309'; ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(4, 4, 8, 8);
      // Emblem cross
      ctx.fillStyle = '#d97706'; ctx.fillRect(7, 5, 2, 6); ctx.fillRect(5, 7, 6, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(4, 4, 2, 2); // glint

      scene.textures.addCanvas('icon_gold_coin', c);
    }

    // Carved Gothic Stone Corbel / Bracket (16x18)
    if (!scene.textures.exists('platform_corbel')) {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 18;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = '#090d16'; ctx.fillRect(0, 0, 16, 4);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(2, 4, 12, 4);
      ctx.fillStyle = '#334155'; ctx.fillRect(4, 8, 8, 4);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(6, 12, 4, 4);
      ctx.fillStyle = '#090d16'; ctx.fillRect(7, 16, 2, 2);

      scene.textures.addCanvas('platform_corbel', c);
    }

    // Hanging Rusted Iron Cathedral Chains (8x32)
    if (!scene.textures.exists('chain_link')) {
      const c = document.createElement('canvas');
      c.width = 8; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const drawLink = (y) => {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(1, y, 6, 10);
        ctx.fillStyle = '#334155'; ctx.fillRect(2, y + 1, 4, 8);
        ctx.clearRect(3, y + 3, 2, 4);
        ctx.fillStyle = '#64748b'; ctx.fillRect(2, y + 1, 1, 8);
      };
      drawLink(0);
      drawLink(11);
      drawLink(22);

      scene.textures.addCanvas('chain_link', c);
    }

    // Volumetric Torch Light Halo (96x96, additive blend)
    if (!scene.textures.exists('torch_glow')) {
      const c = document.createElement('canvas');
      c.width = 96; c.height = 96;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(48, 48, 2, 48, 48, 46);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.50)');
      grad.addColorStop(0.25, 'rgba(245, 158, 11, 0.35)');
      grad.addColorStop(0.6, 'rgba(234, 88, 12, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 96, 96);
      scene.textures.addCanvas('torch_glow', c);
    }

    // Crimson Blood Aura for Shrine (140x140)
    if (!scene.textures.exists('shrine_glow')) {
      const c = document.createElement('canvas');
      c.width = 140; c.height = 140;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(70, 70, 4, 70, 70, 68);
      grad.addColorStop(0, 'rgba(254, 202, 202, 0.55)');
      grad.addColorStop(0.3, 'rgba(239, 68, 68, 0.35)');
      grad.addColorStop(0.65, 'rgba(153, 27, 27, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 140, 140);
      scene.textures.addCanvas('shrine_glow', c);
    }

    // Creeping Pit Void Mist (64x24)
    if (!scene.textures.exists('mist_fog')) {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 24;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(32, 12, 2, 32, 12, 30);
      grad.addColorStop(0, 'rgba(147, 51, 234, 0.35)');
      grad.addColorStop(0.5, 'rgba(220, 38, 38, 0.20)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 24);
      scene.textures.addCanvas('mist_fog', c);
    }
  }

  // 10. Particles (Authentic 16-Bit Pixel Clusters)
  static createParticleTextures(scene) {
    if (!scene.textures.exists('part_spark')) {
      const c = document.createElement('canvas');
      c.width = 8; c.height = 8;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(3, 0, 2, 8); ctx.fillRect(0, 3, 8, 2);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(2, 2, 4, 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 3, 2, 2);
      scene.textures.addCanvas('part_spark', c);
    }
    if (!scene.textures.exists('part_blood')) {
      const c = document.createElement('canvas');
      c.width = 6; c.height = 6;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(2, 0, 2, 6); ctx.fillRect(0, 2, 6, 2);
      ctx.fillStyle = '#dc2626'; ctx.fillRect(1, 1, 4, 4);
      ctx.fillStyle = '#f87171'; ctx.fillRect(2, 2, 2, 1);
      scene.textures.addCanvas('part_blood', c);
    }
    if (!scene.textures.exists('part_void')) {
      const c = document.createElement('canvas');
      c.width = 8; c.height = 8;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#3b0764'; ctx.fillRect(3, 0, 2, 8); ctx.fillRect(0, 3, 8, 2);
      ctx.fillStyle = '#a855f7'; ctx.fillRect(2, 2, 4, 4);
      ctx.fillStyle = '#e879f9'; ctx.fillRect(2, 3, 4, 2); ctx.fillRect(3, 2, 2, 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 3, 2, 2);
      scene.textures.addCanvas('part_void', c);
    }
    if (!scene.textures.exists('part_sunfire')) {
      const c = document.createElement('canvas');
      c.width = 6; c.height = 6;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ea580c'; ctx.fillRect(2, 0, 2, 6); ctx.fillRect(0, 2, 6, 2);
      ctx.fillStyle = '#f97316'; ctx.fillRect(1, 1, 4, 4);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(2, 2, 2, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(2, 2, 1, 1);
      scene.textures.addCanvas('part_sunfire', c);
    }
    if (!scene.textures.exists('part_urn_shard')) {
      const c = document.createElement('canvas');
      c.width = 6; c.height = 6;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#78350f'; ctx.fillRect(1, 1, 4, 4);
      ctx.fillStyle = '#b45309'; ctx.fillRect(1, 1, 2, 2);
      ctx.fillStyle = '#d97706'; ctx.fillRect(2, 2, 1, 1);
      scene.textures.addCanvas('part_urn_shard', c);
    }
  }
}

export default SpriteFactory;
