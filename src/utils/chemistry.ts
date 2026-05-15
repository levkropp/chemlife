import { v4 as uuidv4 } from 'uuid';
import { Compound, CompoundComponent, InventoryItem, RecipeDef } from '../types';
import { getSubstance } from '../data/substances';

export function makeCompound(components: { substanceId: string; massGrams: number }[]): Compound {
  return { components: components.filter(c => c.massGrams > 0.001) };
}

export function makePureCompound(substanceId: string, massGrams: number): Compound {
  return { components: [{ substanceId, massGrams }] };
}

export function makePureItem(substanceId: string, massGrams: number, label?: string): InventoryItem {
  return {
    id: uuidv4(),
    compound: makePureCompound(substanceId, massGrams),
    totalMassGrams: massGrams,
    label: label ?? getSubstance(substanceId)?.name,
  };
}

export function makeCompoundItem(compound: Compound, label?: string): InventoryItem {
  const filtered = { components: compound.components.filter(c => c.massGrams > 0.001) };
  const total = filtered.components.reduce((s, c) => s + c.massGrams, 0);
  const primary = filtered.components.length
    ? filtered.components.reduce((m, c) => (c.massGrams > m.massGrams ? c : m))
    : { substanceId: '', massGrams: 0 };
  return {
    id: uuidv4(),
    compound: filtered,
    totalMassGrams: total,
    label: label ?? getSubstance(primary.substanceId)?.name,
  };
}

export function getDisplayName(compound: Compound): string {
  if (!compound.components.length) return 'Unknown';
  const primary = compound.components.reduce((m, c) => (c.massGrams > m.massGrams ? c : m));
  return getSubstance(primary.substanceId)?.name ?? primary.substanceId;
}

export function getPrimarySubstanceId(compound: Compound): string {
  if (!compound.components.length) return '';
  return compound.components.reduce((m, c) => (c.massGrams > m.massGrams ? c : m)).substanceId;
}

export function getPurityPercent(compound: Compound): number {
  const total = compound.components.reduce((s, c) => s + c.massGrams, 0);
  if (total === 0) return 0;
  const max = compound.components.reduce((m, c) => (c.massGrams > m.massGrams ? c : m));
  return (max.massGrams / total) * 100;
}

// Run a recipe calculation. Returns output InventoryItems.
// Inputs must contain enough of the required substances.
export function runRecipeCalc(
  recipe: RecipeDef,
  inputItems: InventoryItem[]
): { outputs: InventoryItem[]; electricityKwh: number } | { error: string } {
  // Build a flat map of available substance masses
  const available: Record<string, number> = {};
  for (const item of inputItems) {
    for (const comp of item.compound.components) {
      available[comp.substanceId] = (available[comp.substanceId] ?? 0) + comp.massGrams;
    }
  }

  // Calculate moles available for each input substance
  const molesAvailable: Record<string, number> = {};
  for (const input of recipe.inputs) {
    const sub = getSubstance(input.substanceId);
    if (!sub) return { error: `Unknown substance: ${input.substanceId}` };
    const massG = available[input.substanceId] ?? 0;
    if (massG < 0.01) return { error: `Insufficient ${sub.name}` };
    molesAvailable[input.substanceId] = massG / sub.molarMass;
  }

  // Find limiting reagent (scale factor)
  let scaleFactor = Infinity;
  for (const input of recipe.inputs) {
    const ratio = molesAvailable[input.substanceId] / input.moles;
    if (ratio < scaleFactor) scaleFactor = ratio;
  }

  // Build output compounds
  const outputs: InventoryItem[] = [];
  for (const output of recipe.outputs) {
    const sub = getSubstance(output.substanceId);
    if (!sub) continue;
    const molesProduced = scaleFactor * output.molesPerInputMole * output.yieldFactor;
    const massGrams = molesProduced * sub.molarMass;
    if (massGrams < 0.001) continue;
    outputs.push(makePureItem(output.substanceId, massGrams));
  }

  // For non-primary outputs (like unreacted limiting reagent mixed into product)
  // In aspirin synthesis, unreacted SA stays in solid product
  // We'll mix the unreacted inputs into the primary non-byproduct output
  const primaryOutput = outputs.find(o => {
    const comp = getPrimarySubstanceId(o.compound);
    return recipe.outputs.find(r => r.substanceId === comp && !r.isByproduct);
  });

  if (primaryOutput) {
    const impurities: CompoundComponent[] = [];
    for (const input of recipe.inputs) {
      const sub = getSubstance(input.substanceId)!;
      const usedMoles = scaleFactor * input.moles;
      const availMoles = molesAvailable[input.substanceId];
      const unreactedMoles = availMoles - usedMoles;
      if (unreactedMoles > 0.001) {
        const unreactedMass = unreactedMoles * sub.molarMass * 0.5; // only solid impurities carry over
        if (sub.state === 'solid' && unreactedMass > 0.01) {
          impurities.push({ substanceId: input.substanceId, massGrams: unreactedMass });
        }
      }
    }
    if (impurities.length > 0) {
      const existing = primaryOutput.compound.components[0];
      const newCompound: Compound = {
        components: [existing, ...impurities],
      };
      primaryOutput.compound = newCompound;
      primaryOutput.totalMassGrams = newCompound.components.reduce((s, c) => s + c.massGrams, 0);
    }
  }

  const runs = scaleFactor; // "number of recipe runs" done
  return { outputs, electricityKwh: recipe.electricityKwhPerRun * runs };
}

// Merge two compounds (for combining inventory items)
export function mergeCompounds(a: Compound, b: Compound): Compound {
  const map: Record<string, number> = {};
  for (const c of [...a.components, ...b.components]) {
    map[c.substanceId] = (map[c.substanceId] ?? 0) + c.massGrams;
  }
  return {
    components: Object.entries(map).map(([substanceId, massGrams]) => ({ substanceId, massGrams })),
  };
}

export function formatMass(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  if (grams >= 1) return `${grams.toFixed(1)} g`;
  return `${(grams * 1000).toFixed(0)} mg`;
}

export function formatMoney(usd: number): string {
  return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
