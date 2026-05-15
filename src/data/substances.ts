export type MarketAvailability =
  | 'chembay_commodity'   // always listed on ChemBay; fixed price, daily kg limit
  | 'chembay_reagent'     // random listings on ChemBay; can buy AND sell
  | 'hardware_store'      // local pool/hardware supplier; daily litre limit; NOT on ChemBay
  | 'sell_chembay'        // player-synthesised; can SELL on ChemBay but cannot BUY there
  | 'private_only'        // can only sell to private buyers / contracts; must synthesise
  | 'controlled'          // DEA/regulatory controlled; only via supplier random events
  | 'synthesis_only';     // cannot be bought anywhere; must synthesise; also not saleable on ChemBay

export interface LocalStoreInfo {
  pricePerLiter: number;
  dailyLimitLiters: number;
  /** fraction 0–1 of the pure substance in the solution (e.g. 0.31 for 31 % HCl) */
  concentration: number;
  /** g/mL of the solution */
  density: number;
  /** Display label for this local variant, e.g. "Vinegar (5%)" */
  label?: string;
  /** Name of local store type, e.g. "Hardware Store", "Grocery Store" */
  storeName?: string;
}

/** @deprecated Use LocalStoreInfo */
export type HardwareStoreInfo = LocalStoreInfo;

export interface SubstanceDef {
  id: string;
  name: string;
  formula: string;
  molarMass: number; // g/mol
  state: 'solid' | 'liquid' | 'gas';
  color: string;
  description: string;
  boilingPoint?: number; // °C
  meltingPoint?: number; // °C
  density?: number; // g/mL of pure substance
  marketAvailability: MarketAvailability;
  // ChemBay commodity
  commodityPricePerKg?: number;
  commodityDailyLimitKg?: number;
  // ChemBay reagent (non-commodity)
  priceMinPerKg?: number;
  priceMaxPerKg?: number;
  // Hardware/local store (exclusive — item NOT on ChemBay)
  hardwareStore?: LocalStoreInfo;
  // Local store variant that co-exists alongside ChemBay availability
  localStore?: LocalStoreInfo;
  // Regulatory note shown in UI
  regulatoryNote?: string;
  // SMILES string for 2D structure rendering
  smiles?: string;
  tags: string[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

export function canBuyOnChemBay(s: SubstanceDef): boolean {
  return s.marketAvailability === 'chembay_commodity' ||
         s.marketAvailability === 'chembay_reagent';
}

export function canSellOnChemBay(s: SubstanceDef): boolean {
  return s.marketAvailability === 'chembay_commodity' ||
         s.marketAvailability === 'chembay_reagent' ||
         s.marketAvailability === 'sell_chembay';
}

export function isHardwareStore(s: SubstanceDef): boolean {
  return s.marketAvailability === 'hardware_store';
}

// ─── Substance database ───────────────────────────────────────────────────────

export const SUBSTANCES: Record<string, SubstanceDef> = {

  // ── ChemBay commodities (always available) ───────────────────────────────
  water: {
    id: 'water', name: 'Water', formula: 'H₂O',
    molarMass: 18.015, state: 'liquid', color: '#268bd2',
    description: 'Distilled water from local supplier. Free for practical purposes.',
    boilingPoint: 100, meltingPoint: 0, density: 1.0,
    marketAvailability: 'hardware_store',
    hardwareStore: {
      pricePerLiter: 0.10, dailyLimitLiters: 100,
      concentration: 1.0, density: 1.0,
      label: 'Distilled Water', storeName: 'Local Supplier',
    },
    smiles: 'O',
    tags: ['solvent', 'local'],
  },
  ethanol: {
    id: 'ethanol', name: 'Ethanol', formula: 'C₂H₅OH',
    molarMass: 46.068, state: 'liquid', color: '#2aa198',
    description: 'Grain alcohol as 40% solution (vodka/denatured). Esterification feedstock. Note: pure ethanol is synthesis_only.',
    boilingPoint: 78.4, meltingPoint: -114.1, density: 0.789,
    marketAvailability: 'hardware_store',
    hardwareStore: {
      pricePerLiter: 22.0, dailyLimitLiters: 10,
      concentration: 0.40, density: 0.935,
      label: 'Ethanol 40% (Spirits/Denatured)', storeName: 'Liquor / Hardware Store',
    },
    smiles: 'CCO',
    tags: ['solvent', 'local', 'alcohol'],
  },
  naoh: {
    id: 'naoh', name: 'Sodium Hydroxide', formula: 'NaOH',
    molarMass: 40.0, state: 'solid', color: '#859900',
    description: 'Lye. Strong base used in saponification and neutralisation.',
    meltingPoint: 318,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 1.5, commodityDailyLimitKg: 30,
    smiles: '[Na+].[OH-]',
    tags: ['base', 'commodity'],
  },
  sodium_bicarbonate: {
    id: 'sodium_bicarbonate', name: 'Sodium Bicarbonate', formula: 'NaHCO₃',
    molarMass: 84.007, state: 'solid', color: '#93a1a1',
    description: 'Baking soda. Mild base for neutralisations and gas generation.',
    meltingPoint: 50,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 1.0, commodityDailyLimitKg: 40,
    smiles: '[Na+].OC([O-])=O',
    tags: ['base', 'commodity'],
  },
  acetone: {
    id: 'acetone', name: 'Acetone', formula: 'C₃H₆O',
    molarMass: 58.08, state: 'liquid', color: '#6c71c4',
    description: 'Pure acetone (nail polish remover / hardware store grade). Common ketone solvent.',
    boilingPoint: 56.1, density: 0.791,
    marketAvailability: 'hardware_store',
    hardwareStore: {
      pricePerLiter: 9.0, dailyLimitLiters: 5,
      concentration: 1.0, density: 0.791,
      label: 'Acetone 100%', storeName: 'Hardware Store',
    },
    smiles: 'CC(C)=O',
    tags: ['solvent', 'local', 'ketone'],
  },
  acetic_acid: {
    id: 'acetic_acid', name: 'Acetic Acid', formula: 'CH₃COOH',
    molarMass: 60.052, state: 'liquid', color: '#839496',
    description: 'Esterification and synthesis feedstock. Available as 5% vinegar locally or ~50% industrial grade on ChemBay.',
    boilingPoint: 118.1, density: 1.049,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 18.0, commodityDailyLimitKg: 10,
    localStore: {
      pricePerLiter: 1.50, dailyLimitLiters: 20,
      concentration: 0.05, density: 1.005,
      label: 'White Vinegar (5%)', storeName: 'Grocery Store',
    },
    smiles: 'CC(O)=O',
    tags: ['acid', 'commodity', 'carboxylic'],
  },
  isopropanol: {
    id: 'isopropanol', name: 'Isopropanol (IPA)', formula: 'C₃H₈O',
    molarMass: 60.1, state: 'liquid', color: '#2aa198',
    description: '99% isopropanol from hardware/pharmacy. Common cleaning and extraction solvent.',
    boilingPoint: 82.6, density: 0.786,
    marketAvailability: 'hardware_store',
    hardwareStore: {
      pricePerLiter: 6.0, dailyLimitLiters: 10,
      concentration: 0.99, density: 0.786,
      label: 'IPA 99%', storeName: 'Hardware / Pharmacy',
    },
    smiles: 'CC(O)C',
    tags: ['solvent', 'local', 'alcohol'],
  },
  methanol: {
    id: 'methanol', name: 'Methanol', formula: 'CH₃OH',
    molarMass: 32.04, state: 'liquid', color: '#d33682',
    description: 'Pure methanol (camp fuel / HEET). Toxic — do not ingest.',
    boilingPoint: 64.7, density: 0.791,
    marketAvailability: 'hardware_store',
    hardwareStore: {
      pricePerLiter: 4.0, dailyLimitLiters: 5,
      concentration: 1.0, density: 0.791,
      label: 'Methanol 100% (Camp Fuel)', storeName: 'Hardware Store',
    },
    smiles: 'CO',
    tags: ['solvent', 'local', 'alcohol', 'toxic'],
  },
  vegetable_oil: {
    id: 'vegetable_oil', name: 'Vegetable Oil', formula: '(triglyceride mixture)',
    molarMass: 870, state: 'liquid', color: '#b58900',
    description: 'Mixed triglycerides. Primary feedstock for soap via saponification.',
    boilingPoint: 300, density: 0.92,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 2.5, commodityDailyLimitKg: 30,
    smiles: 'CCCCCCCC/C=C\\CCCCCCCC(=O)OCC(COC(=O)CCCCCCC/C=C\\CCCCCCCC)OC(=O)CCCCCCC/C=C\\CCCCCCCC',
    tags: ['natural', 'triglyceride', 'commodity'],
  },
  // Nitrates — only Ca and Mg allowed on ChemBay (reflects modern Amazon/eBay availability)
  calcium_nitrate: {
    id: 'calcium_nitrate', name: 'Calcium Nitrate', formula: 'Ca(NO₃)₂',
    molarMass: 164.09, state: 'solid', color: '#eee8d5',
    description: 'Garden fertiliser. Widely available. Key precursor to nitric acid synthesis.',
    meltingPoint: 561,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 3.5, commodityDailyLimitKg: 20,
    smiles: '[Ca+2].[O-][N+]([O-])=O.[O-][N+]([O-])=O',
    tags: ['nitrate', 'commodity', 'fertiliser'],
  },
  magnesium_nitrate: {
    id: 'magnesium_nitrate', name: 'Magnesium Nitrate', formula: 'Mg(NO₃)₂',
    molarMass: 148.31, state: 'solid', color: '#eee8d5',
    description: 'Fertiliser and desiccant. Alternate nitrate source for nitric acid synthesis.',
    meltingPoint: 89,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 4.0, commodityDailyLimitKg: 15,
    smiles: '[Mg+2].[O-][N+]([O-])=O.[O-][N+]([O-])=O',
    tags: ['nitrate', 'commodity', 'fertiliser'],
  },
  // Other commodity chemicals
  calcium_phosphate: {
    id: 'calcium_phosphate', name: 'Calcium Phosphate', formula: 'Ca₃(PO₄)₂',
    molarMass: 310.18, state: 'solid', color: '#93a1a1',
    description: 'Tribasic calcium phosphate. Fertiliser and food additive. Precursor to phosphoric acid.',
    meltingPoint: 1670,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 2.0, commodityDailyLimitKg: 25,
    smiles: '[Ca+2].[Ca+2].[Ca+2].[O-]P([O-])([O-])=O.[O-]P([O-])([O-])=O',
    tags: ['phosphate', 'commodity', 'fertiliser'],
  },
  ammonium_sulfate: {
    id: 'ammonium_sulfate', name: 'Ammonium Sulfate', formula: '(NH₄)₂SO₄',
    molarMass: 132.14, state: 'solid', color: '#eee8d5',
    description: 'Common nitrogen fertiliser. Key reactant for ammonium nitrate synthesis.',
    meltingPoint: 235,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 2.0, commodityDailyLimitKg: 30,
    smiles: '[NH4+].[NH4+].[O-]S([O-])(=O)=O',
    tags: ['ammonia', 'commodity', 'fertiliser'],
  },
  potassium_chloride: {
    id: 'potassium_chloride', name: 'Potassium Chloride', formula: 'KCl',
    molarMass: 74.55, state: 'solid', color: '#eee8d5',
    description: 'Salt substitute and fertiliser (muriate of potash). Precursor to potassium nitrate.',
    meltingPoint: 770,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 2.5, commodityDailyLimitKg: 20,
    smiles: '[K+].[Cl-]',
    tags: ['potassium', 'commodity', 'fertiliser'],
  },
  sulfur: {
    id: 'sulfur', name: 'Sulfur', formula: 'S₈',
    molarMass: 256.48, state: 'solid', color: '#b58900',
    description: 'Elemental sulfur. Garden fungicide; long-term route to sulfuric acid via contact process.',
    meltingPoint: 115.2, boilingPoint: 444.6,
    marketAvailability: 'chembay_commodity',
    commodityPricePerKg: 1.5, commodityDailyLimitKg: 20,
    smiles: 'S1SSSSSSS1',
    tags: ['element', 'commodity'],
  },
  isoamyl_alcohol: {
    id: 'isoamyl_alcohol', name: 'Isoamyl Alcohol', formula: 'C₅H₁₂O',
    molarMass: 88.15, state: 'liquid', color: '#839496',
    description: 'Fusel oil component. Reacts with acetic acid to produce banana-scented isoamyl acetate.',
    boilingPoint: 131.1, density: 0.813,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 8.0, priceMaxPerKg: 18.0,
    smiles: 'CC(C)CCO',
    tags: ['alcohol', 'fragrance', 'reagent'],
  },

  // ── Hardware store (local supplier, 10 L/day each) ────────────────────────
  hcl: {
    id: 'hcl', name: 'Hydrochloric Acid (anhydrous)', formula: 'HCl',
    molarMass: 36.461, state: 'gas', color: '#b58900',
    description: 'Pure anhydrous hydrogen chloride gas. In-game always encountered as aqueous solution.',
    density: 1.19,
    marketAvailability: 'hardware_store',
    hardwareStore: {
      pricePerLiter: 4.50,
      dailyLimitLiters: 10,
      concentration: 0.31,
      density: 1.15,
    },
    regulatoryNote: 'Muriatic acid (31 % HCl). Available from pool/hardware stores at ≤10 L/day.',
    smiles: 'Cl',
    tags: ['acid', 'mineral_acid', 'hardware_store'],
  },
  sulfuric_acid: {
    id: 'sulfuric_acid', name: 'Sulfuric Acid', formula: 'H₂SO₄',
    molarMass: 98.079, state: 'liquid', color: '#cb4b16',
    description: 'Concentrated strong acid. Highly corrosive.',
    boilingPoint: 337, density: 1.84,
    marketAvailability: 'hardware_store',
    hardwareStore: {
      pricePerLiter: 7.50,
      dailyLimitLiters: 10,
      concentration: 0.93,
      density: 1.83,
    },
    regulatoryNote: '93 % H₂SO₄ (drain cleaner / battery acid grade). Available from hardware stores at ≤10 L/day.',
    smiles: 'OS(O)(=O)=O',
    tags: ['acid', 'mineral_acid', 'hardware_store'],
  },

  // ── Non-commodity ChemBay reagents ────────────────────────────────────────
  salicylic_acid: {
    id: 'salicylic_acid', name: 'Salicylic Acid', formula: 'C₇H₆O₃',
    molarMass: 138.12, state: 'solid', color: '#b58900',
    description: 'Precursor to aspirin. White crystalline powder.',
    meltingPoint: 158.6,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 22, priceMaxPerKg: 38,
    smiles: 'OC(=O)c1ccccc1O',
    tags: ['reagent', 'pharmaceutical_precursor'],
  },
  aspirin: {
    id: 'aspirin', name: 'Aspirin (acetylsalicylic acid)', formula: 'C₉H₈O₄',
    molarMass: 180.16, state: 'solid', color: '#eee8d5',
    description: 'Common analgesic. Requires acetic anhydride (controlled) to synthesise.',
    meltingPoint: 135,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 65, priceMaxPerKg: 110,
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    tags: ['pharmaceutical', 'product'],
  },
  citric_acid: {
    id: 'citric_acid', name: 'Citric Acid', formula: 'C₆H₈O₇',
    molarMass: 192.12, state: 'solid', color: '#b58900',
    description: 'Food-grade acid from citrus. Used in cleaning and synthesis.',
    meltingPoint: 153,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 8, priceMaxPerKg: 18,
    smiles: 'OC(CC(=O)O)(CC(=O)O)C(=O)O',
    tags: ['acid', 'food_grade', 'reagent'],
  },
  lavender_eo: {
    id: 'lavender_eo', name: 'Lavender Essential Oil', formula: '(mixture)',
    molarMass: 160, state: 'liquid', color: '#6c71c4',
    description: 'Steam-distilled Lavandula angustifolia. ~40 % linalool, ~35 % linalyl acetate.',
    boilingPoint: 190, density: 0.878,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 180, priceMaxPerKg: 280,
    tags: ['essential_oil', 'mixture', 'natural'],
  },
  peppermint_eo: {
    id: 'peppermint_eo', name: 'Peppermint Essential Oil', formula: '(mixture)',
    molarMass: 155, state: 'liquid', color: '#2aa198',
    description: 'Steam-distilled Mentha × piperita. ~45 % menthol.',
    boilingPoint: 215, density: 0.896,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 80, priceMaxPerKg: 160,
    tags: ['essential_oil', 'mixture', 'natural'],
  },
  lemon_eo: {
    id: 'lemon_eo', name: 'Lemon Essential Oil', formula: '(mixture)',
    molarMass: 136, state: 'liquid', color: '#b58900',
    description: 'Cold-pressed lemon peel. ~60 % d-limonene.',
    density: 0.848,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 40, priceMaxPerKg: 80,
    tags: ['essential_oil', 'mixture', 'natural'],
  },

  // ── Products — player synthesises; can sell on ChemBay ───────────────────
  soap: {
    id: 'soap', name: 'Soap (sodium fatty acid salts)', formula: '(mixture)',
    molarMass: 280, state: 'solid', color: '#eee8d5',
    description: 'Saponified vegetable oil. Sold as cosmetic/industrial soap.',
    marketAvailability: 'sell_chembay',
    priceMinPerKg: 12, priceMaxPerKg: 22,
    smiles: 'CCCCCCCCCCCCCCCC(=O)[O-].[Na+]',
    tags: ['saponification', 'product'],
  },
  glycerol: {
    id: 'glycerol', name: 'Glycerol', formula: 'C₃H₈O₃',
    molarMass: 92.09, state: 'liquid', color: '#93a1a1',
    description: 'Saponification byproduct. Used in cosmetics and food.',
    boilingPoint: 290, density: 1.261,
    marketAvailability: 'sell_chembay',
    priceMinPerKg: 10, priceMaxPerKg: 18,
    smiles: 'OCC(O)CO',
    tags: ['byproduct', 'cosmetic'],
  },
  linalool: {
    id: 'linalool', name: 'Linalool', formula: 'C₁₀H₁₈O',
    molarMass: 154.25, state: 'liquid', color: '#6c71c4',
    description: 'Floral terpene alcohol from lavender distillation.',
    boilingPoint: 198, density: 0.862,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 350, priceMaxPerKg: 600,
    smiles: 'CC(=C)CCC(O)(C=C)C',
    tags: ['terpene', 'fragrance', 'product'],
  },
  linalyl_acetate: {
    id: 'linalyl_acetate', name: 'Linalyl Acetate', formula: 'C₁₂H₂₀O₂',
    molarMass: 196.29, state: 'liquid', color: '#6c71c4',
    description: 'Bergamot-like ester from lavender distillation.',
    boilingPoint: 220, density: 0.895,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 280, priceMaxPerKg: 450,
    smiles: 'CC(=C)CCC(OC(C)=O)(C=C)C',
    tags: ['ester', 'fragrance', 'product'],
  },
  menthol: {
    id: 'menthol', name: 'Menthol', formula: 'C₁₀H₂₀O',
    molarMass: 156.27, state: 'solid', color: '#2aa198',
    description: 'Cooling terpene alcohol from peppermint distillation.',
    meltingPoint: 43, boilingPoint: 212,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 200, priceMaxPerKg: 380,
    smiles: 'OC1CC(C(C)C)CCC1C',
    tags: ['terpene', 'cooling', 'product'],
  },
  limonene: {
    id: 'limonene', name: 'd-Limonene', formula: 'C₁₀H₁₆',
    molarMass: 136.23, state: 'liquid', color: '#b58900',
    description: 'Citrus-scented terpene from lemon oil distillation. Industrial solvent.',
    boilingPoint: 176, density: 0.841,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 18, priceMaxPerKg: 45,
    smiles: 'C=C1CCC(=CC1)C(=C)C',
    tags: ['terpene', 'citrus', 'product'],
  },
  ethyl_acetate: {
    id: 'ethyl_acetate', name: 'Ethyl Acetate', formula: 'C₄H₈O₂',
    molarMass: 88.11, state: 'liquid', color: '#839496',
    description: 'Fruity-smelling ester. Common lab solvent and perfume component.',
    boilingPoint: 77.1, density: 0.897,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 8, priceMaxPerKg: 20,
    smiles: 'CCOC(C)=O',
    tags: ['ester', 'solvent', 'product', 'fragrance'],
  },
  isoamyl_acetate: {
    id: 'isoamyl_acetate', name: 'Isoamyl Acetate', formula: 'C₇H₁₄O₂',
    molarMass: 130.19, state: 'liquid', color: '#b58900',
    description: 'Banana/pear ester. Used in artificial flavouring and fragrance.',
    boilingPoint: 142, density: 0.876,
    marketAvailability: 'chembay_reagent',
    priceMinPerKg: 35, priceMaxPerKg: 80,
    smiles: 'CC(C)CCOC(C)=O',
    tags: ['ester', 'fragrance', 'flavour', 'product'],
  },

  // ── Synthesis-only intermediates — can sell on ChemBay ───────────────────
  phosphoric_acid: {
    id: 'phosphoric_acid', name: 'Phosphoric Acid', formula: 'H₃PO₄',
    molarMass: 98.0, state: 'liquid', color: '#93a1a1',
    description: 'Food-grade acid. Made from calcium phosphate + HCl. Used in fertilisers and rust removal.',
    boilingPoint: 158, density: 1.885,
    marketAvailability: 'sell_chembay',
    priceMinPerKg: 15, priceMaxPerKg: 30,
    regulatoryNote: 'Cannot be purchased on ChemBay — synthesise from Ca₃(PO₄)₂ + HCl.',
    smiles: 'OP(O)(O)=O',
    tags: ['acid', 'mineral_acid', 'product'],
  },
  calcium_chloride: {
    id: 'calcium_chloride', name: 'Calcium Chloride', formula: 'CaCl₂',
    molarMass: 110.98, state: 'solid', color: '#eee8d5',
    description: 'Desiccant and road de-icer. Byproduct of phosphoric acid synthesis.',
    meltingPoint: 772,
    marketAvailability: 'sell_chembay',
    priceMinPerKg: 1.5, priceMaxPerKg: 4,
    smiles: '[Ca+2].[Cl-].[Cl-]',
    tags: ['byproduct', 'desiccant'],
  },
  calcium_sulfate: {
    id: 'calcium_sulfate', name: 'Calcium Sulfate (gypsum)', formula: 'CaSO₄',
    molarMass: 136.14, state: 'solid', color: '#eee8d5',
    description: 'Gypsum. Byproduct of nitric acid synthesis. Used in construction.',
    meltingPoint: 1460,
    marketAvailability: 'sell_chembay',
    priceMinPerKg: 0.8, priceMaxPerKg: 2,
    smiles: '[Ca+2].[O-]S([O-])(=O)=O',
    tags: ['byproduct', 'mineral'],
  },

  // ── Acids that must be synthesised — not on ChemBay to buy ───────────────
  nitric_acid: {
    id: 'nitric_acid', name: 'Nitric Acid', formula: 'HNO₃',
    molarMass: 63.01, state: 'liquid', color: '#cb4b16',
    description: 'Strong oxidising acid. Synthesised from nitrate salts + H₂SO₄. Key for nitrate production.',
    boilingPoint: 83, density: 1.51,
    marketAvailability: 'synthesis_only',
    regulatoryNote: 'Cannot be purchased — synthesise from Ca(NO₃)₂ or Mg(NO₃)₂ + concentrated H₂SO₄.',
    smiles: 'O[N+](=O)[O-]',
    tags: ['acid', 'mineral_acid', 'oxidiser'],
  },

  // ── Private-only (contracts/events) — cannot buy or sell on ChemBay ──────
  ammonium_nitrate: {
    id: 'ammonium_nitrate', name: 'Ammonium Nitrate', formula: 'NH₄NO₃',
    molarMass: 80.04, state: 'solid', color: '#eee8d5',
    description: 'High-nitrogen fertiliser and explosive precursor. Cannot be sold on ChemBay. Sell to farming contracts.',
    meltingPoint: 170,
    marketAvailability: 'private_only',
    regulatoryNote: 'Regulated. Must be synthesised and sold via Contracts only — not on ChemBay.',
    priceMinPerKg: 30, priceMaxPerKg: 55,
    smiles: '[NH4+].[O-][N+]([O-])=O',
    tags: ['nitrate', 'fertiliser', 'explosive_precursor', 'regulated'],
  },
  potassium_nitrate: {
    id: 'potassium_nitrate', name: 'Potassium Nitrate (saltpetre)', formula: 'KNO₃',
    molarMass: 101.1, state: 'solid', color: '#eee8d5',
    description: 'Oxidiser used in pyrotechnics, gunpowder, and fertilisers. Cannot be sold on ChemBay.',
    meltingPoint: 334,
    marketAvailability: 'private_only',
    regulatoryNote: 'Regulated. Sell via Contracts to pyrotechnics / defence suppliers only.',
    priceMinPerKg: 40, priceMaxPerKg: 80,
    smiles: '[K+].[O-][N+]([O-])=O',
    tags: ['nitrate', 'oxidiser', 'pyrotechnics', 'regulated'],
  },

  // ── Controlled (DEA/regulatory) ───────────────────────────────────────────
  acetic_anhydride: {
    id: 'acetic_anhydride', name: 'Acetic Anhydride', formula: '(CH₃CO)₂O',
    molarMass: 102.09, state: 'liquid', color: '#657b83',
    description: 'Acetylating agent. DEA List II controlled chemical. Cannot be purchased through normal channels.',
    boilingPoint: 139.8, density: 1.082,
    marketAvailability: 'controlled',
    regulatoryNote: 'DEA List II controlled substance. Obtain only via supplier random events.',
    priceMinPerKg: 80, priceMaxPerKg: 200,
    smiles: 'CC(=O)OC(C)=O',
    tags: ['controlled', 'dea_list2', 'acetylating'],
  },
};

export function getSubstance(id: string): SubstanceDef | undefined {
  return SUBSTANCES[id];
}

export function getAllSubstances(): SubstanceDef[] {
  return Object.values(SUBSTANCES);
}

export function getChemBayCommodities(): SubstanceDef[] {
  return getAllSubstances().filter(s => s.marketAvailability === 'chembay_commodity');
}

export function getChemBayReagents(): SubstanceDef[] {
  return getAllSubstances().filter(s => s.marketAvailability === 'chembay_reagent');
}

export function getHardwareStoreItems(): SubstanceDef[] {
  return getAllSubstances().filter(s => s.marketAvailability === 'hardware_store');
}

/** Substances that have a `localStore` variant (appear in Local tab AND ChemBay) */
export function getLocalStoreItems(): SubstanceDef[] {
  return getAllSubstances().filter(s => s.localStore != null);
}

// Legacy compat
export function getCommodities(): SubstanceDef[] { return getChemBayCommodities(); }
export function getNonCommodities(): SubstanceDef[] { return getChemBayReagents(); }
