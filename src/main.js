// main.js - Entrypoint & Phaser Game Initialization
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { SanctuaryScene } from './scenes/SanctuaryScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { HudScene } from './scenes/HudScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 540,
  backgroundColor: '#08090c',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: {
    activePointers: 3,
    mouse: {
      preventDefaultWheel: true
    }
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 750 },
      debug: false
    }
  },
  scene: [BootScene, MainMenuScene, SanctuaryScene, DungeonScene, HudScene]
};

const game = new Phaser.Game(config);

// Guard against external browser extensions automatically toggling debug overlays
if (import.meta.env && import.meta.env.DEV) {
  window.__GAME_DEV__ = game;
}

export default game;
