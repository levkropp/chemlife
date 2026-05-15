import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  PLAYER_SPEED,
  PLAYER_SIZE,
  COLORS,
  TILE_MAP,
  isTileWalkable,
  pixelToTile,
} from '../constants';
import { getBuildingDef } from '../../data/buildings';
import { BuildingTypeId, PlacedBuilding } from '../../types';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerLabel!: Phaser.GameObjects.Text;
  private buildingLayer!: Phaser.GameObjects.Graphics;
  private buildingLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private buildingRects: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private interactHint!: Phaser.GameObjects.Text;
  private placementGhost!: Phaser.GameObjects.Graphics;
  private placementHint!: Phaser.GameObjects.Text;

  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
    C: Phaser.Input.Keyboard.Key;
    B: Phaser.Input.Keyboard.Key;
    I: Phaser.Input.Keyboard.Key;
    ONE: Phaser.Input.Keyboard.Key;
    TWO: Phaser.Input.Keyboard.Key;
    THREE: Phaser.Input.Keyboard.Key;
    P: Phaser.Input.Keyboard.Key;
  };

  private lastBuildingSnapshot = '';
  private nearbyBuildingId: string | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    const base = import.meta.env.BASE_URL;
    this.load.image('tile_grass',  `${base}textures/tiles/grass.png`);
    this.load.image('tile_indoor', `${base}textures/tiles/wood_floor.png`);
    this.load.image('tile_wall',   `${base}textures/machines/casing_stainless.png`);
    this.load.image('tile_fence_overlay', `${base}textures/tiles/fence_wood.png`);
  }

  create() {
    this.drawTileMap();
    this.createBuildingLayer();
    this.createPlayer();
    this.createUI();
    this.setupKeys();
    this.setupCamera();
    this.subscribeToStore();

    // Try to load saved game
    const loaded = useGameStore.getState().loadGame();
    if (!loaded) {
      useGameStore.getState().saveGame();
    }

    this.game.events.emit('scene-ready');
  }

  update(_time: number, delta: number) {
    this.handleMovement(delta);
    this.detectNearbyBuilding();
    this.syncPlayerPositionToStore();
    this.updatePlacementMode();
    useGameStore.getState().tick(delta);
  }

  // ─── Tile map ─────────────────────────────────────────────────────────────

  private drawTileMap() {
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = TILE_MAP[row][col];
        const cx = col * TILE_SIZE + TILE_SIZE / 2;
        const cy = row * TILE_SIZE + TILE_SIZE / 2;

        switch (tile.type) {
          case 'outdoor':
          case 'door':
            this.add.image(cx, cy, 'tile_grass').setDisplaySize(TILE_SIZE, TILE_SIZE);
            break;
          case 'indoor':
            this.add.image(cx, cy, 'tile_indoor').setDisplaySize(TILE_SIZE, TILE_SIZE);
            break;
          case 'house_wall':
            this.add.image(cx, cy, 'tile_wall').setDisplaySize(TILE_SIZE, TILE_SIZE);
            break;
          case 'fence':
            // Grass base + fence overlay
            this.add.image(cx, cy, 'tile_grass').setDisplaySize(TILE_SIZE, TILE_SIZE);
            this.add.image(cx, cy, 'tile_fence_overlay').setDisplaySize(TILE_SIZE, TILE_SIZE);
            break;
        }
      }
    }

    // Grid lines, house outline, door marker
    const g = this.add.graphics();

    g.lineStyle(1, COLORS.base01, 0.12);
    for (let col = 1; col < MAP_COLS - 1; col++) {
      g.lineBetween(col * TILE_SIZE, TILE_SIZE, col * TILE_SIZE, (MAP_ROWS - 1) * TILE_SIZE);
    }
    for (let row = 1; row < MAP_ROWS - 1; row++) {
      g.lineBetween(TILE_SIZE, row * TILE_SIZE, (MAP_COLS - 1) * TILE_SIZE, row * TILE_SIZE);
    }

    g.lineStyle(2, COLORS.base00, 0.9);
    g.strokeRect(4 * TILE_SIZE, 4 * TILE_SIZE, 5 * TILE_SIZE, 5 * TILE_SIZE);

    g.fillStyle(COLORS.yellow, 1);
    const doorX = 6 * TILE_SIZE + TILE_SIZE / 2;
    const doorY = 8 * TILE_SIZE;
    g.fillTriangle(
      doorX - 8, doorY + TILE_SIZE - 4,
      doorX + 8, doorY + TILE_SIZE - 4,
      doorX, doorY + 8
    );

    this.add.text(6 * TILE_SIZE + TILE_SIZE / 2, 3.5 * TILE_SIZE, 'HOME', {
      fontSize: '10px', color: '#93a1a1', fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);
  }

  // ─── Placement ghost ───────────────────────────────────────────────────────

  private drawPlacementGhost(tileX: number, tileY: number, typeId: BuildingTypeId, buildings: PlacedBuilding[]) {
    const def = getBuildingDef(typeId);
    if (!def) return;

    let valid = true;
    outer:
    for (let dy = 0; dy < def.tileHeight; dy++) {
      for (let dx = 0; dx < def.tileWidth; dx++) {
        const tile = TILE_MAP[tileY + dy]?.[tileX + dx];
        if (!tile || !tile.walkable) { valid = false; break outer; }
        const occupied = buildings.some(b => {
          const bd = getBuildingDef(b.typeId);
          if (!bd) return false;
          return (tileX + dx >= b.tileX && tileX + dx < b.tileX + bd.tileWidth &&
                  tileY + dy >= b.tileY && tileY + dy < b.tileY + bd.tileHeight);
        });
        if (occupied) { valid = false; break outer; }
        if (tile.isIndoor && !def.canPlaceIndoor) { valid = false; break outer; }
        if (!tile.isIndoor && !def.canPlaceOutdoor) { valid = false; break outer; }
      }
    }

    const color = valid ? 0x859900 : 0xdc322f;
    this.placementGhost.clear();
    this.placementGhost.fillStyle(color, 0.35);
    this.placementGhost.fillRect(tileX * TILE_SIZE, tileY * TILE_SIZE, def.tileWidth * TILE_SIZE, def.tileHeight * TILE_SIZE);
    this.placementGhost.lineStyle(2, color, 0.9);
    this.placementGhost.strokeRect(tileX * TILE_SIZE, tileY * TILE_SIZE, def.tileWidth * TILE_SIZE, def.tileHeight * TILE_SIZE);
  }

  private updatePlacementMode() {
    const state = useGameStore.getState();
    if (!state.pendingPlacement) {
      this.placementGhost.clear();
      this.placementHint.setVisible(false);
      return;
    }

    const def = getBuildingDef(state.pendingPlacement);
    this.placementHint.setText(`Placing: ${def?.name ?? state.pendingPlacement}  ·  click to place  ·  [Esc] cancel`);
    this.placementHint.setVisible(true);

    const ptr = this.input.activePointer;
    const worldPt = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const tileX = Math.floor(worldPt.x / TILE_SIZE);
    const tileY = Math.floor(worldPt.y / TILE_SIZE);
    this.drawPlacementGhost(tileX, tileY, state.pendingPlacement, state.buildings);
  }

  // ─── Buildings ─────────────────────────────────────────────────────────────

  private createBuildingLayer() {
    this.buildingLayer = this.add.graphics();
    this.renderBuildings(useGameStore.getState().buildings);
  }

  private renderBuildings(buildings: PlacedBuilding[]) {
    this.buildingLayer.clear();

    // Remove old labels/rects
    this.buildingLabels.forEach(t => t.destroy());
    this.buildingLabels.clear();
    this.buildingRects.forEach(r => r.destroy());
    this.buildingRects.clear();

    for (const b of buildings) {
      const def = getBuildingDef(b.typeId);
      if (!def) continue;

      const px = b.tileX * TILE_SIZE;
      const py = b.tileY * TILE_SIZE;
      const w = def.tileWidth * TILE_SIZE;
      const h = def.tileHeight * TILE_SIZE;

      // Building rectangle
      this.buildingLayer.fillStyle(def.color, 0.85);
      this.buildingLayer.fillRoundedRect(px + 3, py + 3, w - 6, h - 6, 4);
      this.buildingLayer.lineStyle(2, def.color, 1);
      this.buildingLayer.strokeRoundedRect(px + 3, py + 3, w - 6, h - 6, 4);

      // Processing indicator
      if (b.processingJob) {
        const job = b.processingJob;
        if (job.status === 'running') {
          const state = useGameStore.getState();
          const progress = Math.min(
            1,
            (state.gameTime.totalMinutes - job.startTimeMinutes) /
              (job.endTimeMinutes - job.startTimeMinutes)
          );
          this.buildingLayer.fillStyle(COLORS.green, 0.6);
          this.buildingLayer.fillRect(px + 4, py + h - 10, (w - 8) * progress, 6);
        } else if (job.status === 'complete') {
          this.buildingLayer.fillStyle(COLORS.yellow, 0.9);
          this.buildingLayer.fillCircle(px + w - 10, py + 10, 5);
        }
      }

      // Short label text
      const label = this.add.text(px + w / 2, py + h / 2, def.shortLabel, {
        fontSize: '11px',
        color: '#fdf6e3',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);
      this.buildingLabels.set(b.id, label);
    }
  }

  private subscribeToStore() {
    // Phaser update loop already calls tick; subscribe for building changes
    let lastBuildingCount = -1;
    let lastJobStates = '';

    this.events.on('update', () => {
      const state = useGameStore.getState();
      const jobStates = state.buildings
        .map(b => `${b.id}:${b.processingJob?.status ?? 'idle'}`)
        .join(',');

      if (
        state.buildings.length !== lastBuildingCount ||
        jobStates !== lastJobStates
      ) {
        lastBuildingCount = state.buildings.length;
        lastJobStates = jobStates;
        this.renderBuildings(state.buildings);
      }
    });
  }

  // ─── Player ────────────────────────────────────────────────────────────────

  private createPlayer() {
    const state = useGameStore.getState();
    const px = state.player.pixelX;
    const py = state.player.pixelY;

    this.player = this.add.rectangle(px, py, PLAYER_SIZE, PLAYER_SIZE, COLORS.blue);
    this.player.setDepth(10);

    // Player direction indicator (small triangle pointing south by default)
    this.playerLabel = this.add.text(px, py - PLAYER_SIZE / 2 - 4, '●', {
      fontSize: '8px',
      color: '#eee8d5',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setDepth(11);
  }

  private handleMovement(delta: number) {
    const speed = PLAYER_SPEED * (delta / 1000);
    let dx = 0;
    let dy = 0;

    if (this.keys.A.isDown) dx = -speed;
    else if (this.keys.D.isDown) dx = speed;
    if (this.keys.W.isDown) dy = -speed;
    else if (this.keys.S.isDown) dy = speed;

    if (dx === 0 && dy === 0) return;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    const px = this.player.x;
    const py = this.player.y;
    const half = PLAYER_SIZE / 2 - 2;

    // Try horizontal
    const newPx = px + dx;
    if (
      this.canOccupy(newPx - half, py - half) &&
      this.canOccupy(newPx + half, py - half) &&
      this.canOccupy(newPx - half, py + half) &&
      this.canOccupy(newPx + half, py + half)
    ) {
      this.player.x = newPx;
    }

    // Try vertical
    const newPy = py + dy;
    if (
      this.canOccupy(this.player.x - half, newPy - half) &&
      this.canOccupy(this.player.x + half, newPy - half) &&
      this.canOccupy(this.player.x - half, newPy + half) &&
      this.canOccupy(this.player.x + half, newPy + half)
    ) {
      this.player.y = newPy;
    }

    this.playerLabel.setPosition(this.player.x, this.player.y - PLAYER_SIZE / 2 - 4);
  }

  private canOccupy(px: number, py: number): boolean {
    const { col, row } = pixelToTile(px, py);
    if (!isTileWalkable(col, row)) return false;
    // Check no building occupies this tile
    const state = useGameStore.getState();
    for (const b of state.buildings) {
      const def = getBuildingDef(b.typeId);
      if (!def) continue;
      if (col >= b.tileX && col < b.tileX + def.tileWidth &&
          row >= b.tileY && row < b.tileY + def.tileHeight) {
        return false;
      }
    }
    return true;
  }

  private syncPlayerPositionToStore() {
    useGameStore.getState().setPlayerPosition(this.player.x, this.player.y);
  }

  // ─── Nearby building detection ─────────────────────────────────────────────

  private detectNearbyBuilding() {
    const state = useGameStore.getState();
    const px = this.player.x;
    const py = this.player.y;
    const interactRange = TILE_SIZE * 1.6;

    let found: string | null = null;
    for (const b of state.buildings) {
      const def = getBuildingDef(b.typeId);
      if (!def) continue;
      const bCenterX = (b.tileX + def.tileWidth / 2) * TILE_SIZE;
      const bCenterY = (b.tileY + def.tileHeight / 2) * TILE_SIZE;
      const dist = Math.hypot(px - bCenterX, py - bCenterY);
      if (dist < interactRange) {
        found = b.id;
        break;
      }
    }

    if (found !== this.nearbyBuildingId) {
      this.nearbyBuildingId = found;
      this.interactHint.setVisible(found !== null);
      if (found) {
        const b = state.buildings.find(x => x.id === found)!;
        const def = getBuildingDef(b.typeId)!;
        this.interactHint.setText(`[E] ${def.name}`);
        this.interactHint.setPosition(
          (b.tileX + def.tileWidth / 2) * TILE_SIZE,
          b.tileY * TILE_SIZE - 12
        );
      }
    }

    // Handle E key
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) && found) {
      useGameStore.getState().setSelectedBuilding(found);
      useGameStore.getState().openWindow('building');
    }
  }

  // ─── UI elements ──────────────────────────────────────────────────────────

  private createUI() {
    this.interactHint = this.add.text(0, 0, '', {
      fontSize: '10px',
      color: '#b58900',
      backgroundColor: '#002b36cc',
      padding: { x: 4, y: 2 },
      fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setDepth(20).setVisible(false);

    this.placementGhost = this.add.graphics().setDepth(9);

    this.placementHint = this.add.text(this.scale.width / 2, 14, '', {
      fontSize: '11px',
      color: '#fdf6e3',
      backgroundColor: '#859900dd',
      padding: { x: 10, y: 5 },
      fontFamily: 'monospace',
    }).setScrollFactor(0).setOrigin(0.5, 0).setDepth(50).setVisible(false);

    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.placementHint.setX(size.width / 2);
    });

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button !== 0) return;
      const state = useGameStore.getState();
      if (!state.pendingPlacement) return;
      const worldPt = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const tileX = Math.floor(worldPt.x / TILE_SIZE);
      const tileY = Math.floor(worldPt.y / TILE_SIZE);
      const id = useGameStore.getState().placeBuilding(state.pendingPlacement, tileX, tileY);
      if (id) useGameStore.getState().setPendingPlacement(null);
    });
  }

  // ─── Keys ─────────────────────────────────────────────────────────────────

  private setupKeys() {
    const kb = this.input.keyboard!;
    this.keys = {
      W: kb.addKey('W'),
      A: kb.addKey('A'),
      S: kb.addKey('S'),
      D: kb.addKey('D'),
      E: kb.addKey('E'),
      C: kb.addKey('C'),
      B: kb.addKey('B'),
      I: kb.addKey('I'),
      ONE: kb.addKey('ONE'),
      TWO: kb.addKey('TWO'),
      THREE: kb.addKey('THREE'),
      P: kb.addKey('P'),
    };

    kb.on('keydown-C', () => useGameStore.getState().toggleWindow('chembay'));
    kb.on('keydown-B', () => useGameStore.getState().toggleWindow('build'));
    kb.on('keydown-I', () => useGameStore.getState().toggleWindow('inventory'));
    kb.on('keydown-P', () => useGameStore.getState().togglePause());
    kb.on('keydown-ESC', () => useGameStore.getState().setPendingPlacement(null));
    kb.on('keydown-ONE', () => useGameStore.getState().setSpeed(1));
    kb.on('keydown-TWO', () => useGameStore.getState().setSpeed(2));
    kb.on('keydown-THREE', () => useGameStore.getState().setSpeed(3));
  }

  // ─── Camera ────────────────────────────────────────────────────────────────

  private setupCamera() {
    this.cameras.main.setBackgroundColor(COLORS.base03);
    this.cameras.main.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    this.cameras.main.setZoom(2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }
}
