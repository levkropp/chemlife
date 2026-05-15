import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  InventoryItem,
  PlacedBuilding,
  BuildingTypeId,
  ProcessingJob,
  ChemBayListing,
  PlayerOrder,
  Compound,
  TutorialStep,
  PanelId,
} from '../types';
import {
  getChemBayCommodities,
  getChemBayReagents,
  getHardwareStoreItems,
  getLocalStoreItems,
  getSubstance,
  SUBSTANCES,
} from '../data/substances';
import { getBuildingDef } from '../data/buildings';
import { getRecipe } from '../data/recipes';
import {
  runRecipeCalc,
  makeCompoundItem,
  formatMoney,
} from '../utils/chemistry';
import {
  CHEMBAY_FLAT_FEE,
  CHEMBAY_PERCENT_FEE,
  CHEMBAY_SHIPPING_PER_KG,
  GRID_ELECTRICITY_COST_PER_KWH,
  MARKET_REFRESH_INTERVAL_MINUTES,
  LISTING_MIN_LIFE_MINUTES,
  LISTING_MAX_LIFE_MINUTES,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Y,
  TILE_MAP,
} from '../game/constants';

// ─── Tutorial ────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ChemLife!',
    body: 'You start with $1,000 and a 10×10 plot. Use WASD to move your character. Your goal: build a profitable chemical business — no end goal, just profit!',
    completed: false,
  },
  {
    id: 'local_suppliers',
    title: 'Buy from Local Suppliers',
    body: "Open ChemBay (C) and switch to the 'Local' tab. Buy some 31 % HCl (muriatic acid) and 93 % H₂SO₄ — these are your starting acids, available from hardware stores at 10 L/day each. Acids cannot be bought or sold on ChemBay directly.",
    completed: false,
  },
  {
    id: 'buy_soap_inputs',
    title: 'Buy Soap Inputs on ChemBay',
    body: "On the 'Buy' tab, purchase Vegetable Oil and Sodium Hydroxide (NaOH). These are your saponification feedstocks. A batch of 500 g oil + 69 g NaOH is a good starting size.",
    completed: false,
  },
  {
    id: 'place_hot_plate',
    title: 'Build a Hot Plate',
    body: "Press B to open the Build menu. Buy a Hot Plate ($65) and enter the tile coordinates to place it outdoors (try tile 5, 10 — south of the house). Walk up to it and press E to interact.",
    completed: false,
  },
  {
    id: 'make_soap',
    title: 'Run Saponification',
    body: "Interact with the Hot Plate (E). Select 'Soap Saponification', assign your oil and NaOH from inventory, and start the reaction. Use speed controls (1/2/3) to pass time faster. Collect your soap and glycerol when done.",
    completed: false,
  },
  {
    id: 'sell_soap',
    title: 'Sell Your Products',
    body: "Open ChemBay → Sell tab. Select your soap from inventory, set a price (around $15–18/kg), and list it. ChemBay takes $5 flat + 3% commission. Glycerol is a byproduct worth ~$12/kg. Scale up batches to overcome the flat fee!",
    completed: false,
  },
  {
    id: 'acid_chain',
    title: 'Unlock the Acid Chain',
    body: "Now try synthesising phosphoric acid: buy Calcium Phosphate from ChemBay, combine with your muriatic HCl in a Reaction Vessel. Then make nitric acid from Calcium Nitrate + H₂SO₄. Nitric acid unlocks ammonium nitrate and potassium nitrate — sell those via Contracts for real money.",
    completed: false,
  },
];

// ─── Market helpers ───────────────────────────────────────────────────────────

const NPC_SELLERS = [
  'CascadeChemSupply', 'PurityLabsLLC', 'SynthesisHouse', 'MidwestChem',
  'GreenReagents', 'AlphaChemicals', 'StellarSynth', 'NovaChem',
  'QuantumReagents', 'ApexChemical',
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateCommodityListings(): ChemBayListing[] {
  return getChemBayCommodities().map(sub => ({
    id: uuidv4(),
    sellerName: 'ChemBay Commodities',
    substanceId: sub.id,
    compound: { components: [{ substanceId: sub.id, massGrams: (sub.commodityDailyLimitKg ?? 50) * 1000 }] },
    totalMassKg: sub.commodityDailyLimitKg ?? 50,
    pricePerKg: sub.commodityPricePerKg ?? 1,
    analyzed: true,
    isCommodity: true,
    purchasedKg: 0,
    dailyLimitKg: sub.commodityDailyLimitKg ?? 50,
  }));
}

function makeLocalListing(
  sub: ReturnType<typeof getSubstance> & object,
  info: NonNullable<ReturnType<typeof getSubstance>>['hardwareStore'],
  flags: { isHardwareStore?: boolean; isLocalStore?: boolean },
): ChemBayListing {
  const hw = info!;
  const kgPerLiter = hw.density; // g/mL = kg/L
  const totalMassKg = hw.dailyLimitLiters * kgPerLiter;
  const pureSubMassKg = totalMassKg * hw.concentration;
  const waterMassKg = totalMassKg * (1 - hw.concentration);
  const compound: Compound = {
    components: [
      { substanceId: (sub as any).id, massGrams: pureSubMassKg * 1000 },
      ...(waterMassKg > 0.0001 ? [{ substanceId: 'water', massGrams: waterMassKg * 1000 }] : []),
    ],
  };
  return {
    id: uuidv4(),
    sellerName: hw.storeName ?? 'Local Store',
    substanceId: (sub as any).id,
    compound,
    totalMassKg,
    pricePerKg: hw.pricePerLiter / kgPerLiter,
    analyzed: true,
    isCommodity: true,
    purchasedKg: 0,
    dailyLimitKg: totalMassKg,
    ...flags,
  } as ChemBayListing;
}

/** Hardware store + local store listings (diluted solutions) */
function generateHardwareStoreListings(): ChemBayListing[] {
  const hwListings = getHardwareStoreItems().map(sub =>
    makeLocalListing(sub as any, sub.hardwareStore!, { isHardwareStore: true })
  );
  const localListings = getLocalStoreItems().map(sub =>
    makeLocalListing(sub as any, sub.localStore!, { isLocalStore: true })
  );
  return [...hwListings, ...localListings];
}

function generateNonCommodityListing(substanceId: string, currentMinutes: number): ChemBayListing {
  const sub = SUBSTANCES[substanceId];
  const massKg = parseFloat(rand(0.1, 3.0).toFixed(2));
  const pricePerKg = parseFloat(rand(sub.priceMinPerKg ?? 10, sub.priceMaxPerKg ?? 100).toFixed(2));
  const lifeMinutes = rand(LISTING_MIN_LIFE_MINUTES, LISTING_MAX_LIFE_MINUTES);
  const seller = NPC_SELLERS[Math.floor(Math.random() * NPC_SELLERS.length)];
  const purity = rand(0.93, 0.999);
  const totalMassG = massKg * 1000;
  const impurityMassG = totalMassG * (1 - purity);
  const components: Compound['components'] = [
    { substanceId, massGrams: totalMassG * purity },
  ];
  if (impurityMassG > 0.1) {
    components.push({ substanceId: 'water', massGrams: impurityMassG });
  }
  return {
    id: uuidv4(),
    sellerName: seller,
    substanceId,
    compound: { components },
    totalMassKg: massKg,
    pricePerKg,
    analyzed: Math.random() > 0.6,
    isCommodity: false,
    expiresAtMinutes: currentMinutes + lifeMinutes,
  };
}

function generateInitialReagentListings(currentMinutes: number): ChemBayListing[] {
  const listings: ChemBayListing[] = [];
  // Always seed some of the more common reagents at start
  const seedSubstances = [
    'salicylic_acid', 'salicylic_acid',
    'lavender_eo', 'peppermint_eo', 'lemon_eo',
    'citric_acid',
    'isoamyl_alcohol',
  ];
  for (const id of seedSubstances) {
    listings.push(generateNonCommodityListing(id, currentMinutes));
  }
  return listings;
}

function refreshMarket(existing: ChemBayListing[], currentMinutes: number): ChemBayListing[] {
  // Expire old reagent listings
  const alive = existing.filter(
    l => l.isCommodity || (l.expiresAtMinutes != null && l.expiresAtMinutes > currentMinutes)
  );
  // Possibly add new reagent listings
  const newListings: ChemBayListing[] = [];
  for (const sub of getChemBayReagents()) {
    if (Math.random() < 0.3) {
      newListings.push(generateNonCommodityListing(sub.id, currentMinutes));
    }
  }
  return [...alive, ...newListings];
}

// ─── Initial state ────────────────────────────────────────────────────────────

function createInitialState(): GameState {
  const t0 = 0;
  return {
    initialized: true,
    gameTime: { totalMinutes: t0, speed: 1, isPaused: true },
    player: {
      pixelX: PLAYER_SPAWN_X,
      pixelY: PLAYER_SPAWN_Y,
      money: 1000,
      inventory: [],
      maxInventoryKg: 10,
    },
    buildings: [],
    chemBayListings: [
      ...generateCommodityListings(),
      ...generateHardwareStoreListings(),
      ...generateInitialReagentListings(t0),
    ],
    orders: [],
    electricityCostPerKwh: GRID_ELECTRICITY_COST_PER_KWH,
    totalElectricityKwh: 0,
    tutorial: {
      currentStep: 0,
      dismissed: false,
      steps: TUTORIAL_STEPS,
    },
    openWindows: ['tutorial'],
    selectedBuildingId: null,
    pendingPlacement: null,
  };
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface GameStore extends GameState {
  setPlayerPosition: (px: number, py: number) => void;
  addInventoryItem: (item: InventoryItem) => void;
  removeInventoryItem: (id: string) => void;

  placeBuilding: (typeId: BuildingTypeId, tileX: number, tileY: number) => string | null;
  removeBuilding: (id: string) => void;
  startProcessing: (buildingId: string, recipeId: string, inputs: InventoryItem[]) => { success: boolean; message: string };
  collectOutput: (buildingId: string) => InventoryItem[];

  buyFromChemBay: (listingId: string, massKg: number, pricePerKgOverride?: number) => { success: boolean; message: string };
  buyFromHardwareStore: (listingId: string, liters: number) => { success: boolean; message: string };
  sellOnChemBay: (item: InventoryItem, massKg: number, pricePerKg: number, requestAnalysis: boolean) => { success: boolean; message: string };

  tick: (realDeltaMs: number) => void;
  setSpeed: (speed: 1 | 2 | 3) => void;
  togglePause: () => void;

  toggleWindow: (id: PanelId) => void;
  openWindow: (id: PanelId) => void;
  closeWindow: (id: PanelId) => void;
  bringToFront: (id: PanelId) => void;
  setSelectedBuilding: (id: string | null) => void;
  setPendingPlacement: (typeId: BuildingTypeId | null) => void;

  completeTutorialStep: (stepId: string) => void;
  advanceTutorial: () => void;
  dismissTutorial: () => void;

  saveGame: () => void;
  loadGame: () => boolean;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  // ─── Player ──────────────────────────────────────────────────────────────
  setPlayerPosition: (px, py) =>
    set(s => ({ player: { ...s.player, pixelX: px, pixelY: py } })),

  addInventoryItem: (item) =>
    set(s => ({ player: { ...s.player, inventory: [...s.player.inventory, item] } })),

  removeInventoryItem: (id) =>
    set(s => ({ player: { ...s.player, inventory: s.player.inventory.filter(i => i.id !== id) } })),

  // ─── Buildings ───────────────────────────────────────────────────────────
  placeBuilding: (typeId, tileX, tileY) => {
    const def = getBuildingDef(typeId);
    if (!def) return null;
    const state = get();
    if (state.player.money < def.priceUsd) return null;

    for (let dy = 0; dy < def.tileHeight; dy++) {
      for (let dx = 0; dx < def.tileWidth; dx++) {
        const tile = TILE_MAP[tileY + dy]?.[tileX + dx];
        if (!tile || !tile.walkable) return null;
        const occupied = state.buildings.some(
          b => b.tileX === tileX + dx && b.tileY === tileY + dy
        );
        if (occupied) return null;
        if (tile.isIndoor && !def.canPlaceIndoor) return null;
        if (!tile.isIndoor && !def.canPlaceOutdoor) return null;
      }
    }

    const id = uuidv4();
    const isIndoor = TILE_MAP[tileY]?.[tileX]?.isIndoor ?? false;
    set(s => ({
      player: { ...s.player, money: s.player.money - def.priceUsd },
      buildings: [...s.buildings, { id, typeId, tileX, tileY, isIndoor }],
    }));
    return id;
  },

  removeBuilding: (id) =>
    set(s => ({ buildings: s.buildings.filter(b => b.id !== id) })),

  startProcessing: (buildingId, recipeId, inputs) => {
    const state = get();
    const building = state.buildings.find(b => b.id === buildingId);
    if (!building) return { success: false, message: 'Building not found' };
    if (building.processingJob?.status === 'running')
      return { success: false, message: 'Already processing' };

    const recipe = getRecipe(recipeId);
    if (!recipe) return { success: false, message: 'Unknown recipe' };
    if (recipe.buildingTypeId !== building.typeId)
      return { success: false, message: 'Wrong building type for this recipe' };

    const result = runRecipeCalc(recipe, inputs);
    if ('error' in result) return { success: false, message: result.error };

    const electricityCost = result.electricityKwh * state.electricityCostPerKwh;
    if (state.player.money < electricityCost)
      return { success: false, message: 'Insufficient funds for electricity' };

    const inputIds = new Set(inputs.map(i => i.id));
    const newInventory = state.player.inventory.filter(i => !inputIds.has(i.id));

    const job: ProcessingJob = {
      recipeId,
      startTimeMinutes: state.gameTime.totalMinutes,
      endTimeMinutes: state.gameTime.totalMinutes + recipe.durationMinutes,
      inputs,
      status: 'running',
      outputs: result.outputs,
    };

    set(s => ({
      player: {
        ...s.player,
        money: s.player.money - electricityCost,
        inventory: newInventory,
      },
      buildings: s.buildings.map(b =>
        b.id === buildingId ? { ...b, processingJob: job } : b
      ),
      totalElectricityKwh: s.totalElectricityKwh + result.electricityKwh,
    }));
    return { success: true, message: 'Processing started' };
  },

  collectOutput: (buildingId) => {
    const state = get();
    const building = state.buildings.find(b => b.id === buildingId);
    if (!building?.processingJob?.outputs || building.processingJob.status !== 'complete') return [];
    const outputs = building.processingJob.outputs;
    set(s => ({
      player: { ...s.player, inventory: [...s.player.inventory, ...outputs] },
      buildings: s.buildings.map(b =>
        b.id === buildingId ? { ...b, processingJob: undefined } : b
      ),
    }));
    return outputs;
  },

  // ─── Market — ChemBay buy ────────────────────────────────────────────────
  buyFromChemBay: (listingId, massKg, pricePerKgOverride?) => {
    const state = get();
    const listing = state.chemBayListings.find(l => l.id === listingId);
    if (!listing) return { success: false, message: 'Listing not found' };

    const availableKg = listing.isCommodity
      ? (listing.dailyLimitKg ?? 0) - (listing.purchasedKg ?? 0)
      : listing.totalMassKg;

    if (massKg > availableKg + 0.001) return { success: false, message: `Only ${availableKg.toFixed(2)} kg available` };
    if (massKg <= 0) return { success: false, message: 'Invalid quantity' };

    const effectivePrice = pricePerKgOverride ?? listing.pricePerKg;
    const subtotal = effectivePrice * massKg;
    const shipping = CHEMBAY_SHIPPING_PER_KG * massKg;
    const totalCost = subtotal + shipping;

    if (state.player.money < totalCost)
      return { success: false, message: `Need ${formatMoney(totalCost)}` };

    const fraction = massKg / listing.totalMassKg;
    const item = makeCompoundItem({
      components: listing.compound.components.map(c => ({
        substanceId: c.substanceId,
        massGrams: c.massGrams * fraction,
      })),
    });

    const order: PlayerOrder = {
      id: uuidv4(),
      type: 'buy',
      substanceName: (getSubstance(listing.substanceId)?.name ?? listing.substanceId) + ' — ' + listing.sellerName,
      massKg,
      pricePerKg: effectivePrice,
      subtotal,
      chemBayFee: 0,
      shippingCost: shipping,
      net: -totalCost,
      timestampMinutes: state.gameTime.totalMinutes,
    };

    set(s => ({
      player: {
        ...s.player,
        money: s.player.money - totalCost,
        inventory: [...s.player.inventory, item],
      },
      chemBayListings: s.chemBayListings
        .map(l => {
          if (l.id !== listingId) return l;
          if (l.isCommodity) return { ...l, purchasedKg: (l.purchasedKg ?? 0) + massKg };
          const remaining = l.totalMassKg - massKg;
          if (remaining < 0.001) return null as unknown as ChemBayListing;
          return { ...l, totalMassKg: remaining };
        })
        .filter(Boolean),
      orders: [order, ...s.orders],
    }));

    return { success: true, message: `Purchased ${massKg} kg for ${formatMoney(totalCost)}` };
  },

  // ─── Hardware / local store buy (litres, not kg) ─────────────────────────
  buyFromHardwareStore: (listingId, liters) => {
    const state = get();
    const listing = state.chemBayListings.find(l => l.id === listingId);
    if (!listing) return { success: false, message: 'Listing not found' };

    const sub = getSubstance(listing.substanceId);
    const hw = (listing as any).isLocalStore ? sub?.localStore : sub?.hardwareStore;
    if (!hw) return { success: false, message: 'Not a local store item' };

    const availableKg = (listing.dailyLimitKg ?? 0) - (listing.purchasedKg ?? 0);
    const kgPerLiter = hw.density; // density in g/mL = kg/L
    const requestedKg = liters * kgPerLiter;

    if (requestedKg > availableKg + 0.001)
      return { success: false, message: `Only ${(availableKg / kgPerLiter).toFixed(1)} L remaining today` };
    if (liters <= 0) return { success: false, message: 'Invalid quantity' };

    const totalCost = liters * hw.pricePerLiter;
    if (state.player.money < totalCost)
      return { success: false, message: `Need ${formatMoney(totalCost)}` };

    // Build compound: fraction of the daily listing scaled to purchased amount
    const fraction = requestedKg / listing.totalMassKg;
    const item = makeCompoundItem({
      components: listing.compound.components.map(c => ({
        substanceId: c.substanceId,
        massGrams: c.massGrams * fraction,
      })),
    }, `${sub?.name} (${(hw.concentration * 100).toFixed(0)}%)`);

    const order: PlayerOrder = {
      id: uuidv4(),
      type: 'buy',
      substanceName: `${sub?.name} (${(hw.concentration * 100).toFixed(0)}%) — Hardware Store`,
      massKg: requestedKg,
      pricePerKg: totalCost / requestedKg,
      subtotal: totalCost,
      chemBayFee: 0,
      shippingCost: 0, // pickup in person
      net: -totalCost,
      timestampMinutes: state.gameTime.totalMinutes,
    };

    set(s => ({
      player: {
        ...s.player,
        money: s.player.money - totalCost,
        inventory: [...s.player.inventory, item],
      },
      chemBayListings: s.chemBayListings.map(l =>
        l.id === listingId ? { ...l, purchasedKg: (l.purchasedKg ?? 0) + requestedKg } : l
      ),
      orders: [order, ...s.orders],
    }));

    return { success: true, message: `Purchased ${liters} L for ${formatMoney(totalCost)}` };
  },

  // ─── ChemBay sell ────────────────────────────────────────────────────────
  sellOnChemBay: (item, massKg, pricePerKg, requestAnalysis) => {
    const state = get();
    if (!state.player.inventory.find(i => i.id === item.id))
      return { success: false, message: 'Item not in inventory' };

    // Check substance can be sold on ChemBay
    const primarySubId = item.compound.components.reduce((m, c) =>
      c.massGrams > m.massGrams ? c : m
    ).substanceId;
    const primarySub = getSubstance(primarySubId);
    if (primarySub && !['chembay_commodity', 'chembay_reagent', 'sell_chembay'].includes(primarySub.marketAvailability)) {
      return {
        success: false,
        message: `${primarySub.name} cannot be sold on ChemBay. ${primarySub.regulatoryNote ?? 'Use Contracts instead.'}`,
      };
    }

    const subtotal = pricePerKg * massKg;
    const chemBayFee = CHEMBAY_FLAT_FEE + subtotal * CHEMBAY_PERCENT_FEE;
    const analysisCost = requestAnalysis ? 500 * massKg : 0;
    const netReceived = subtotal - chemBayFee - analysisCost;

    if (netReceived < 0)
      return { success: false, message: 'Fees exceed revenue. Raise your price or sell a larger quantity.' };

    const order: PlayerOrder = {
      id: uuidv4(),
      type: 'sell',
      substanceName: item.label ?? 'Unknown',
      massKg,
      pricePerKg,
      subtotal,
      chemBayFee: chemBayFee + analysisCost,
      shippingCost: 0,
      net: netReceived,
      timestampMinutes: state.gameTime.totalMinutes,
    };

    set(s => ({
      player: {
        ...s.player,
        money: s.player.money + netReceived,
        inventory: s.player.inventory.filter(i => i.id !== item.id),
      },
      orders: [order, ...s.orders],
    }));

    return { success: true, message: `Sold for ${formatMoney(netReceived)} net` };
  },

  // ─── Time ─────────────────────────────────────────────────────────────────
  tick: (realDeltaMs) => {
    const state = get();
    if (state.gameTime.isPaused) return;

    const gameDeltaMinutes = (realDeltaMs / 1000) * state.gameTime.speed;
    const prevMinutes = state.gameTime.totalMinutes;
    const newMinutes = prevMinutes + gameDeltaMinutes;

    const updatedBuildings = state.buildings.map(b => {
      if (b.processingJob?.status === 'running' && newMinutes >= b.processingJob.endTimeMinutes) {
        return { ...b, processingJob: { ...b.processingJob, status: 'complete' as const } };
      }
      return b;
    });

    const prevEpoch = Math.floor(prevMinutes / MARKET_REFRESH_INTERVAL_MINUTES);
    const newEpoch = Math.floor(newMinutes / MARKET_REFRESH_INTERVAL_MINUTES);
    let listings = state.chemBayListings;
    if (newEpoch > prevEpoch) {
      listings = refreshMarket(listings, newMinutes);
    }

    // Daily commodity + hardware store reset
    const prevDay = Math.floor(prevMinutes / 1440);
    const newDay = Math.floor(newMinutes / 1440);
    if (newDay > prevDay) {
      listings = listings.map(l => l.isCommodity ? { ...l, purchasedKg: 0 } : l);
    }

    set({
      gameTime: { ...state.gameTime, totalMinutes: newMinutes },
      buildings: updatedBuildings,
      chemBayListings: listings,
    });
  },

  setSpeed: (speed) => set(s => ({ gameTime: { ...s.gameTime, speed } })),
  togglePause: () => set(s => ({ gameTime: { ...s.gameTime, isPaused: !s.gameTime.isPaused } })),

  // ─── UI ───────────────────────────────────────────────────────────────────
  toggleWindow: (id) => set(s => ({
    openWindows: s.openWindows.includes(id)
      ? s.openWindows.filter(w => w !== id)
      : [...s.openWindows.filter(w => w !== id), id],
  })),
  openWindow: (id) => set(s => ({
    openWindows: [...s.openWindows.filter(w => w !== id), id],
  })),
  closeWindow: (id) => set(s => ({
    openWindows: s.openWindows.filter(w => w !== id),
  })),
  bringToFront: (id) => set(s => ({
    openWindows: [...s.openWindows.filter(w => w !== id), id],
  })),
  setSelectedBuilding: (id) => set({ selectedBuildingId: id }),
  setPendingPlacement: (typeId) => set({ pendingPlacement: typeId }),

  // ─── Tutorial ─────────────────────────────────────────────────────────────
  completeTutorialStep: (stepId) =>
    set(s => ({
      tutorial: {
        ...s.tutorial,
        steps: s.tutorial.steps.map(step =>
          step.id === stepId ? { ...step, completed: true } : step
        ),
      },
    })),

  advanceTutorial: () =>
    set(s => ({
      tutorial: {
        ...s.tutorial,
        currentStep: Math.min(s.tutorial.currentStep + 1, s.tutorial.steps.length - 1),
      },
    })),

  dismissTutorial: () =>
    set(s => ({ tutorial: { ...s.tutorial, dismissed: true }, openWindows: s.openWindows.filter(w => w !== 'tutorial') })),

  // ─── Persistence ──────────────────────────────────────────────────────────
  saveGame: () => {
    const s = get();
    localStorage.setItem('chemlife_save', JSON.stringify({
      gameTime: s.gameTime,
      player: s.player,
      buildings: s.buildings,
      chemBayListings: s.chemBayListings,
      orders: s.orders,
      electricityCostPerKwh: s.electricityCostPerKwh,
      totalElectricityKwh: s.totalElectricityKwh,
      tutorial: s.tutorial,
    }));
  },

  loadGame: () => {
    const raw = localStorage.getItem('chemlife_save');
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      set({
        gameTime: { ...data.gameTime, isPaused: true },
        player: data.player,
        buildings: data.buildings ?? [],
        chemBayListings: data.chemBayListings ?? [],
        orders: data.orders ?? [],
        electricityCostPerKwh: data.electricityCostPerKwh ?? GRID_ELECTRICITY_COST_PER_KWH,
        totalElectricityKwh: data.totalElectricityKwh ?? 0,
        tutorial: data.tutorial ?? createInitialState().tutorial,
        initialized: true,
      });
      return true;
    } catch {
      return false;
    }
  },

  resetGame: () => set(createInitialState()),
}));

if (typeof window !== 'undefined') {
  setInterval(() => useGameStore.getState().saveGame(), 60_000);
}
