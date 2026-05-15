// ─── Chemistry ────────────────────────────────────────────────────────────────

export interface SubstanceDef {
  id: string;
  name: string;
  formula: string;
  molarMass: number; // g/mol
  state: 'solid' | 'liquid' | 'gas';
  color: string; // hex for visual representation
  description: string;
  boilingPoint?: number; // °C
  meltingPoint?: number; // °C
  density?: number; // g/mL
  isCommodity: boolean;
  commodityPricePerKg?: number;
  commodityDailyLimitKg?: number;
  priceMinPerKg?: number; // for non-commodities
  priceMaxPerKg?: number;
  tags: string[];
}

export interface CompoundComponent {
  substanceId: string;
  massGrams: number;
}

// A compound is a mixture of substances with definite masses
export interface Compound {
  components: CompoundComponent[];
}

export function getTotalMass(c: Compound): number {
  return c.components.reduce((s, x) => s + x.massGrams, 0);
}

export function getPrimaryComponent(c: Compound): CompoundComponent {
  return c.components.reduce((max, x) => (x.massGrams > max.massGrams ? x : max));
}

export function getPurity(c: Compound): number {
  const total = getTotalMass(c);
  if (total === 0) return 0;
  return getPrimaryComponent(c).massGrams / total;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  compound: Compound;
  totalMassGrams: number;
  label?: string;
}

// ─── Buildings ────────────────────────────────────────────────────────────────

export type BuildingTypeId =
  | 'hot_plate'
  | 'storage_cabinet'
  | 'reaction_vessel'
  | 'distillation_kit'
  | 'fume_hood';

export interface BuildingDef {
  id: BuildingTypeId;
  name: string;
  description: string;
  priceUsd: number;
  tileWidth: number;
  tileHeight: number;
  canPlaceIndoor: boolean;
  canPlaceOutdoor: boolean;
  powerKwhPerRun?: number;
  storageKg?: number;
  color: number; // Phaser hex int
  accentColor: string; // CSS hex
  shortLabel: string;
}

export interface ProcessingJob {
  recipeId: string;
  startTimeMinutes: number; // in-game minutes
  endTimeMinutes: number;
  inputs: InventoryItem[];
  status: 'running' | 'complete' | 'failed';
  outputs?: InventoryItem[];
}

export interface PlacedBuilding {
  id: string;
  typeId: BuildingTypeId;
  tileX: number;
  tileY: number;
  isIndoor: boolean;
  processingJob?: ProcessingJob;
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

export interface RecipeInput {
  substanceId: string;
  moles: number;
}

export interface RecipeOutput {
  substanceId: string;
  molesPerInputMole: number; // moles produced per mole of limiting reagent input
  yieldFactor: number; // 0–1
  isByproduct: boolean;
}

export interface RecipeDef {
  id: string;
  name: string;
  description: string;
  buildingTypeId: BuildingTypeId;
  inputs: RecipeInput[]; // stoichiometric ratio; player scales by amount
  outputs: RecipeOutput[];
  durationMinutes: number; // in-game minutes
  electricityKwhPerRun: number;
  tutorial?: string;
}

// ─── Market ───────────────────────────────────────────────────────────────────

export interface ChemBayListing {
  id: string;
  sellerName: string;
  substanceId: string; // primary substance (display name)
  compound: Compound; // full composition
  totalMassKg: number;
  pricePerKg: number;
  analyzed: boolean;
  isCommodity: boolean;
  expiresAtMinutes?: number; // for non-commodities
  purchasedKg?: number; // for commodities: how much bought today
  dailyLimitKg?: number; // for commodities
}

export interface PlayerOrder {
  id: string;
  type: 'buy' | 'sell';
  substanceName: string;
  massKg: number;
  pricePerKg: number;
  subtotal: number;
  chemBayFee: number;
  shippingCost: number;
  net: number; // negative = money spent, positive = money received
  timestampMinutes: number;
}

// ─── Tile Map ─────────────────────────────────────────────────────────────────

export type TileType = 'outdoor' | 'indoor' | 'fence' | 'house_wall' | 'door';

export interface TileData {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
  isIndoor: boolean;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export type PanelId = 'chembay' | 'inventory' | 'build' | 'tutorial' | 'building';

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameTime {
  totalMinutes: number;
  speed: 1 | 2 | 3;
  isPaused: boolean;
}

export interface PlayerState {
  pixelX: number; // world pixel position
  pixelY: number;
  money: number;
  inventory: InventoryItem[];
  maxInventoryKg: number;
}

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  completed: boolean;
  completionCheck?: (state: GameState) => boolean;
}

export interface GameState {
  initialized: boolean;
  gameTime: GameTime;
  player: PlayerState;
  buildings: PlacedBuilding[];
  chemBayListings: ChemBayListing[];
  orders: PlayerOrder[];
  electricityCostPerKwh: number;
  totalElectricityKwh: number;
  tutorial: {
    currentStep: number;
    dismissed: boolean;
    steps: TutorialStep[];
  };
  // UI state — ordered array; last element = highest z-index (topmost window)
  openWindows: PanelId[];
  selectedBuildingId: string | null;
  pendingPlacement: BuildingTypeId | null;
}
