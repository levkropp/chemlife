import { RecipeDef } from '../types';

export const RECIPES: Record<string, RecipeDef> = {

  // ─── Tutorial: Soap (first recipe — no controlled chemicals needed) ────────
  soap_saponification: {
    id: 'soap_saponification',
    name: 'Soap Saponification',
    description: 'React vegetable oil with NaOH lye to produce sodium soap and glycerol byproduct.',
    buildingTypeId: 'hot_plate',
    inputs: [
      { substanceId: 'vegetable_oil', moles: 1 },  // ~870 g per mol
      { substanceId: 'naoh', moles: 3 },            // 3 × 40 = 120 g; SAP value ~0.138
    ],
    outputs: [
      { substanceId: 'soap',     molesPerInputMole: 3, yieldFactor: 0.91, isByproduct: false },
      { substanceId: 'glycerol', molesPerInputMole: 1, yieldFactor: 0.88, isByproduct: true },
    ],
    durationMinutes: 60,
    electricityKwhPerRun: 0.10,
    tutorial: `Saponification: triglyceride + 3 NaOH → 3 soap + glycerol.
Use a 3:1 molar ratio of NaOH to oil (SAP value ~0.138 for vegetable oil).
Heat at 70–80 °C for 60 min. Don't overheat — the soap will discolour.
Both products have market value. Scale up to at least 500 g of oil for a profitable batch.`,
  },

  // ─── Ester synthesis: ethyl acetate ──────────────────────────────────────
  ethyl_acetate_synthesis: {
    id: 'ethyl_acetate_synthesis',
    name: 'Ethyl Acetate Synthesis (Fischer)',
    description: 'Fischer esterification of ethanol and acetic acid with H₂SO₄ catalyst.',
    buildingTypeId: 'hot_plate',
    inputs: [
      { substanceId: 'ethanol',     moles: 1 },  // 46 g
      { substanceId: 'acetic_acid', moles: 1 },  // 60 g
    ],
    outputs: [
      { substanceId: 'ethyl_acetate', molesPerInputMole: 1, yieldFactor: 0.70, isByproduct: false },
      { substanceId: 'water',         molesPerInputMole: 1, yieldFactor: 0.70, isByproduct: true },
    ],
    durationMinutes: 45,
    electricityKwhPerRun: 0.07,
    tutorial: `Fischer esterification: ethanol + acetic acid ⇌ ethyl acetate + water (reversible).
A few drops of concentrated H₂SO₄ (from hardware store) as catalyst shifts equilibrium.
Yield is limited (~70 %) — distillation can raise purity and yield significantly.
Scale to at least 200 g ethanol for a profitable batch above ChemBay flat fees.`,
  },

  // ─── Ester synthesis: isoamyl acetate (banana) ───────────────────────────
  isoamyl_acetate_synthesis: {
    id: 'isoamyl_acetate_synthesis',
    name: 'Isoamyl Acetate Synthesis (banana ester)',
    description: 'Fischer esterification of isoamyl alcohol and acetic acid; produces the characteristic banana fragrance.',
    buildingTypeId: 'hot_plate',
    inputs: [
      { substanceId: 'isoamyl_alcohol', moles: 1 },  // 88 g
      { substanceId: 'acetic_acid',     moles: 1 },  // 60 g
    ],
    outputs: [
      { substanceId: 'isoamyl_acetate', molesPerInputMole: 1, yieldFactor: 0.72, isByproduct: false },
      { substanceId: 'water',           molesPerInputMole: 1, yieldFactor: 0.72, isByproduct: true },
    ],
    durationMinutes: 50,
    electricityKwhPerRun: 0.08,
    tutorial: `Same mechanism as ethyl acetate — just swap the alcohol for isoamyl alcohol.
Isoamyl acetate has a much higher market value (fragrance/flavouring grade) so the economics are better.
Add a few drops of H₂SO₄ catalyst and heat at 65–70 °C.`,
  },

  // ─── Acid synthesis chain ─────────────────────────────────────────────────

  // 1. Phosphoric acid from calcium phosphate + HCl
  phosphoric_acid_synthesis: {
    id: 'phosphoric_acid_synthesis',
    name: 'Phosphoric Acid Synthesis',
    description: 'React calcium phosphate with hydrochloric acid to produce dilute phosphoric acid and calcium chloride.',
    buildingTypeId: 'reaction_vessel',
    inputs: [
      { substanceId: 'calcium_phosphate', moles: 1 },  // 310 g
      { substanceId: 'hcl',              moles: 6 },  // 6 × 36.46 = 219 g anhydrous HCl
    ],
    outputs: [
      { substanceId: 'phosphoric_acid',  molesPerInputMole: 2, yieldFactor: 0.87, isByproduct: false },
      { substanceId: 'calcium_chloride', molesPerInputMole: 3, yieldFactor: 0.95, isByproduct: true },
    ],
    durationMinutes: 30,
    electricityKwhPerRun: 0.03,
    tutorial: `Ca₃(PO₄)₂ + 6 HCl → 2 H₃PO₄ + 3 CaCl₂
Use muriatic acid (31 % HCl from hardware store). The HCl component is what matters — the water is a carrier.
The reaction is exothermic — no heat needed. Stir well and allow 30 min for completion.
Filter off the CaCl₂ precipitate and collect the H₃PO₄ solution. Both products sell on ChemBay.`,
  },

  // 2. Nitric acid from calcium nitrate + sulfuric acid
  nitric_acid_synthesis: {
    id: 'nitric_acid_synthesis',
    name: 'Nitric Acid Synthesis (nitrate displacement)',
    description: 'Displace nitric acid from calcium nitrate using concentrated sulfuric acid, then distil.',
    buildingTypeId: 'hot_plate',
    inputs: [
      { substanceId: 'calcium_nitrate', moles: 1 },   // 164 g
      { substanceId: 'sulfuric_acid',   moles: 1 },   // 98 g anhydrous H₂SO₄
    ],
    outputs: [
      { substanceId: 'nitric_acid',     molesPerInputMole: 2, yieldFactor: 0.82, isByproduct: false },
      { substanceId: 'calcium_sulfate', molesPerInputMole: 1, yieldFactor: 0.94, isByproduct: true },
    ],
    durationMinutes: 45,
    electricityKwhPerRun: 0.12,
    tutorial: `Ca(NO₃)₂ + H₂SO₄ → 2 HNO₃ + CaSO₄↓
Use 93 % H₂SO₄ from the hardware store. Add acid to nitrate slowly — the reaction is vigorous.
Heat gently to 80 °C. Nitric acid vapours distil off; condensate is ~60 % HNO₃.
Calcium sulfate (gypsum) precipitates out. Filter and collect. Both products sell on ChemBay.
⚠ Do this outdoors or with a fume hood — NOₓ gases are produced.`,
  },

  // 3. Nitric acid from magnesium nitrate (alternative route)
  nitric_acid_from_mg_nitrate: {
    id: 'nitric_acid_from_mg_nitrate',
    name: 'Nitric Acid Synthesis (from Mg nitrate)',
    description: 'Alternative route using magnesium nitrate instead of calcium nitrate.',
    buildingTypeId: 'hot_plate',
    inputs: [
      { substanceId: 'magnesium_nitrate', moles: 1 },  // 148 g
      { substanceId: 'sulfuric_acid',     moles: 1 },  // 98 g
    ],
    outputs: [
      { substanceId: 'nitric_acid',     molesPerInputMole: 2, yieldFactor: 0.80, isByproduct: false },
      { substanceId: 'calcium_sulfate', molesPerInputMole: 1, yieldFactor: 0.92, isByproduct: true },
    ],
    durationMinutes: 45,
    electricityKwhPerRun: 0.12,
    tutorial: `Mg(NO₃)₂ + H₂SO₄ → 2 HNO₃ + MgSO₄
Same procedure as calcium nitrate route. Slightly lower yield.
Use when calcium nitrate stock is depleted — both nitrate sources work.`,
  },

  // 4. Ammonium nitrate from ammonium sulfate + calcium nitrate
  ammonium_nitrate_synthesis: {
    id: 'ammonium_nitrate_synthesis',
    name: 'Ammonium Nitrate Synthesis',
    description: 'Double-displacement between ammonium sulfate and calcium nitrate yields ammonium nitrate and calcium sulfate.',
    buildingTypeId: 'reaction_vessel',
    inputs: [
      { substanceId: 'ammonium_sulfate', moles: 1 },  // 132 g
      { substanceId: 'calcium_nitrate',  moles: 2 },  // 2 × 164 = 328 g
    ],
    outputs: [
      { substanceId: 'ammonium_nitrate', molesPerInputMole: 2, yieldFactor: 0.88, isByproduct: false },
      { substanceId: 'calcium_sulfate',  molesPerInputMole: 1, yieldFactor: 0.95, isByproduct: true },
    ],
    durationMinutes: 40,
    electricityKwhPerRun: 0.04,
    tutorial: `(NH₄)₂SO₄ + Ca(NO₃)₂ → 2 NH₄NO₃ + CaSO₄↓
Dissolve both salts in minimum water, mix, and allow CaSO₄ to precipitate.
Filter, evaporate filtrate, and crystallise the NH₄NO₃.
⚠ NH₄NO₃ is regulated — you can only sell this through Contracts, not on ChemBay.
Farming contracts will pay $30–55/kg.`,
  },

  // 5. Potassium nitrate from potassium chloride + nitric acid
  potassium_nitrate_synthesis: {
    id: 'potassium_nitrate_synthesis',
    name: 'Potassium Nitrate Synthesis',
    description: 'React potassium chloride with nitric acid to produce potassium nitrate (saltpetre).',
    buildingTypeId: 'reaction_vessel',
    inputs: [
      { substanceId: 'potassium_chloride', moles: 1 },  // 75 g
      { substanceId: 'nitric_acid',        moles: 1 },  // 63 g
    ],
    outputs: [
      { substanceId: 'potassium_nitrate', molesPerInputMole: 1, yieldFactor: 0.85, isByproduct: false },
      { substanceId: 'hcl',              molesPerInputMole: 1, yieldFactor: 0.90, isByproduct: true },
    ],
    durationMinutes: 35,
    electricityKwhPerRun: 0.03,
    tutorial: `KCl + HNO₃ → KNO₃ + HCl↑
The HCl gas is driven off by gentle heating (< 60 °C). Evaporate and crystallise the KNO₃.
⚠ KNO₃ is regulated — sell only via Contracts to pyrotechnics or defence suppliers.
Contracts pay $40–80/kg.`,
  },

  // ─── Aspirin (mid-game: requires controlled acetic anhydride) ─────────────
  aspirin_synthesis: {
    id: 'aspirin_synthesis',
    name: 'Aspirin Synthesis',
    description: 'Acetylate salicylic acid with acetic anhydride (controlled). Requires a supplier event to obtain the anhydride.',
    buildingTypeId: 'hot_plate',
    inputs: [
      { substanceId: 'salicylic_acid',  moles: 1 },  // 138 g
      { substanceId: 'acetic_anhydride', moles: 1 }, // 102 g — must be obtained via supplier event
    ],
    outputs: [
      { substanceId: 'aspirin',     molesPerInputMole: 1, yieldFactor: 0.88, isByproduct: false },
      { substanceId: 'acetic_acid', molesPerInputMole: 1, yieldFactor: 0.90, isByproduct: true },
    ],
    durationMinutes: 20,
    electricityKwhPerRun: 0.08,
    tutorial: `C₇H₆O₃ + (CH₃CO)₂O → C₉H₈O₄ + CH₃COOH
Heat at 85 °C for 20 min. The acetyl group transfers from anhydride to the salicylic acid hydroxyl.
Output: crude aspirin (~88 % yield) mixed with trace salicylic acid; acetic acid as liquid byproduct.
⚠ Acetic anhydride is DEA List II controlled — obtain it only through supplier random events.`,
  },

  // ─── Essential oil distillation ───────────────────────────────────────────
  lavender_distillation: {
    id: 'lavender_distillation',
    name: 'Lavender Oil Fractionation',
    description: 'Fractionally separate lavender EO into linalool and linalyl acetate fractions.',
    buildingTypeId: 'distillation_kit',
    inputs: [{ substanceId: 'lavender_eo', moles: 1 }],
    outputs: [
      { substanceId: 'linalool',       molesPerInputMole: 0.40, yieldFactor: 0.85, isByproduct: false },
      { substanceId: 'linalyl_acetate', molesPerInputMole: 0.35, yieldFactor: 0.80, isByproduct: false },
    ],
    durationMinutes: 90,
    electricityKwhPerRun: 0.25,
    tutorial: `Linalool bp ~198 °C, linalyl acetate bp ~220 °C.
Ramp heat slowly — first fraction is linalool, second is linalyl acetate.
Residual terpenes remain in the still pot.`,
  },

  peppermint_distillation: {
    id: 'peppermint_distillation',
    name: 'Peppermint Oil Fractionation',
    description: 'Isolate menthol from peppermint essential oil.',
    buildingTypeId: 'distillation_kit',
    inputs: [{ substanceId: 'peppermint_eo', moles: 1 }],
    outputs: [
      { substanceId: 'menthol', molesPerInputMole: 0.45, yieldFactor: 0.82, isByproduct: false },
    ],
    durationMinutes: 75,
    electricityKwhPerRun: 0.20,
  },

  lemon_distillation: {
    id: 'lemon_distillation',
    name: 'Lemon Oil Fractionation',
    description: 'Isolate d-limonene from cold-pressed lemon essential oil.',
    buildingTypeId: 'distillation_kit',
    inputs: [{ substanceId: 'lemon_eo', moles: 1 }],
    outputs: [
      { substanceId: 'limonene', molesPerInputMole: 0.60, yieldFactor: 0.83, isByproduct: false },
    ],
    durationMinutes: 60,
    electricityKwhPerRun: 0.18,
  },
};

export function getRecipesByBuilding(buildingTypeId: string): RecipeDef[] {
  return Object.values(RECIPES).filter(r => r.buildingTypeId === buildingTypeId);
}

export function getRecipe(id: string): RecipeDef | undefined {
  return RECIPES[id];
}
