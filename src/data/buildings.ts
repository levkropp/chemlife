import { BuildingDef } from '../types';

export const BUILDING_DEFS: Record<string, BuildingDef> = {
  hot_plate: {
    id: 'hot_plate',
    name: 'Hot Plate',
    description:
      'Electric heating element for driving thermal reactions. Required for synthesis and saponification.',
    priceUsd: 65,
    tileWidth: 1,
    tileHeight: 1,
    canPlaceIndoor: true,
    canPlaceOutdoor: true,
    powerKwhPerRun: 0.08,
    color: 0xdc322f, // solarized red
    accentColor: '#dc322f',
    shortLabel: 'HP',
  },
  storage_cabinet: {
    id: 'storage_cabinet',
    name: 'Storage Cabinet',
    description: 'Chemical-grade storage cabinet. Adds 25 kg of inventory capacity.',
    priceUsd: 85,
    tileWidth: 1,
    tileHeight: 1,
    canPlaceIndoor: true,
    canPlaceOutdoor: false,
    storageKg: 25,
    color: 0x268bd2, // solarized blue
    accentColor: '#268bd2',
    shortLabel: 'SC',
  },
  reaction_vessel: {
    id: 'reaction_vessel',
    name: 'Reaction Vessel',
    description:
      'Glass or stainless vessel for cold mixing reactions. Useful for acid-base work.',
    priceUsd: 120,
    tileWidth: 1,
    tileHeight: 1,
    canPlaceIndoor: true,
    canPlaceOutdoor: true,
    powerKwhPerRun: 0.02,
    color: 0x6c71c4, // solarized violet
    accentColor: '#6c71c4',
    shortLabel: 'RV',
  },
  distillation_kit: {
    id: 'distillation_kit',
    name: 'Distillation Kit',
    description:
      'Fractional distillation setup. Required for separating essential oil components.',
    priceUsd: 350,
    tileWidth: 2,
    tileHeight: 1,
    canPlaceIndoor: true,
    canPlaceOutdoor: false,
    powerKwhPerRun: 0.25,
    color: 0x2aa198, // solarized cyan
    accentColor: '#2aa198',
    shortLabel: 'DK',
  },
  fume_hood: {
    id: 'fume_hood',
    name: 'Fume Hood',
    description:
      'Ventilated enclosure that captures volatile gases. Required for hazardous reactions.',
    priceUsd: 450,
    tileWidth: 2,
    tileHeight: 1,
    canPlaceIndoor: true,
    canPlaceOutdoor: false,
    powerKwhPerRun: 0.05,
    color: 0x859900, // solarized green
    accentColor: '#859900',
    shortLabel: 'FH',
  },
};

export function getBuildingDef(id: string): BuildingDef | undefined {
  return BUILDING_DEFS[id];
}

export function getAllBuildingDefs(): BuildingDef[] {
  return Object.values(BUILDING_DEFS);
}
