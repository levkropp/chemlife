import { TileData, TileType } from '../types';

export const TILE_SIZE = 48;
export const MAP_COLS = 14; // includes 1-tile fence border on each side
export const MAP_ROWS = 14;
export const CANVAS_WIDTH = MAP_COLS * TILE_SIZE;   // 672
export const CANVAS_HEIGHT = MAP_ROWS * TILE_SIZE;  // 672

export const PLAYER_SPEED = 120; // pixels per second
export const PLAYER_SIZE = 24;   // pixels (square)

// Player spawn (in-world pixel center)
export const PLAYER_SPAWN_X = 6 * TILE_SIZE + TILE_SIZE / 2;
export const PLAYER_SPAWN_Y = 10 * TILE_SIZE + TILE_SIZE / 2;

// ChemBay fee structure
export const CHEMBAY_FLAT_FEE = 5;        // $ per transaction
export const CHEMBAY_PERCENT_FEE = 0.03;  // 3%
export const CHEMBAY_SHIPPING_PER_KG = 10; // $/kg paid by buyer

// Electricity
export const GRID_ELECTRICITY_COST_PER_KWH = 0.15; // $/kWh

// Market refresh interval
export const MARKET_REFRESH_INTERVAL_MINUTES = 240; // 4 in-game hours

// Non-commodity listing life
export const LISTING_MIN_LIFE_MINUTES = 720;  // 12 in-game hours
export const LISTING_MAX_LIFE_MINUTES = 2880; // 48 in-game hours

// Solarized palette (as Phaser hex ints for tile colors)
export const COLORS = {
  base03:  0x002b36,
  base02:  0x073642,
  base01:  0x586e75,
  base00:  0x657b83,
  base0:   0x839496,
  base1:   0x93a1a1,
  base2:   0xeee8d5,
  base3:   0xfdf6e3,
  yellow:  0xb58900,
  orange:  0xcb4b16,
  red:     0xdc322f,
  magenta: 0xd33682,
  violet:  0x6c71c4,
  blue:    0x268bd2,
  cyan:    0x2aa198,
  green:   0x859900,
};

// ─── Tile map definition ──────────────────────────────────────────────────────
// Grid is 14×14. Coordinate (col, row).
// Fence:  col ∈ {0,13} or row ∈ {0,13}
// Playable area: cols 1-12, rows 1-12 (12×12 effective)
// House: cols 4-8, rows 4-8 (5×5 block)
//   Walls: outer ring of that block
//   Interior: cols 5-7, rows 5-7 (3×3)
//   Door: col 6, row 8 (south center of house wall)

export function buildTileMap(): TileData[][] {
  const map: TileData[][] = [];

  for (let row = 0; row < MAP_ROWS; row++) {
    map[row] = [];
    for (let col = 0; col < MAP_COLS; col++) {
      let type: TileType;
      let walkable = true;
      let isIndoor = false;

      const isFence = col === 0 || col === MAP_COLS - 1 || row === 0 || row === MAP_ROWS - 1;
      const inHouseBox = col >= 4 && col <= 8 && row >= 4 && row <= 8;
      const isHouseWall =
        inHouseBox &&
        (col === 4 || col === 8 || row === 4 || row === 8);
      const isDoor = col === 6 && row === 8; // south center of house
      const isInterior = col >= 5 && col <= 7 && row >= 5 && row <= 7;

      if (isFence) {
        type = 'fence';
        walkable = false;
      } else if (isDoor) {
        type = 'door';
        walkable = true;
        isIndoor = false; // transition tile
      } else if (isHouseWall) {
        type = 'house_wall';
        walkable = false;
      } else if (isInterior) {
        type = 'indoor';
        walkable = true;
        isIndoor = true;
      } else {
        type = 'outdoor';
        walkable = true;
      }

      map[row][col] = { x: col, y: row, type, walkable, isIndoor };
    }
  }

  return map;
}

export const TILE_MAP: TileData[][] = buildTileMap();

export function getTile(col: number, row: number): TileData | null {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return null;
  return TILE_MAP[row][col];
}

export function isTileWalkable(col: number, row: number): boolean {
  const t = getTile(col, row);
  return t?.walkable ?? false;
}

export function pixelToTile(px: number, py: number): { col: number; row: number } {
  return {
    col: Math.floor(px / TILE_SIZE),
    row: Math.floor(py / TILE_SIZE),
  };
}

export function tileColor(type: TileType): number {
  switch (type) {
    case 'fence':      return COLORS.base01;
    case 'house_wall': return COLORS.base00;
    case 'door':       return COLORS.yellow;
    case 'indoor':     return COLORS.base3;
    case 'outdoor':    return COLORS.base2;
    default:           return COLORS.base2;
  }
}
