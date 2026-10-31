import { ItemCategory, ScalingRule, StorageLocation } from '../types';

export interface BarcodeProductSuggestion {
  ean: string;
  name: string;
  brand: string;
  category: ItemCategory;
  unit: string;
  averageUnitWeightKg: number;
  standardShelfLifeDays: number;
  shelfLifeLabel: string;
  suggestedExpiryDate: string;
  defaultQty: number;
  scalingRule: ScalingRule;
  defaultLocation: StorageLocation;
  notes: string;
}

export function calculateSuggestedExpiryFromShelfLife(
  shelfLifeDays: number,
  referenceDate: Date = new Date()
): string {
  const target = new Date(
    Date.UTC(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate()
    )
  );
  target.setUTCDate(target.getUTCDate() + Math.max(0, Math.round(shelfLifeDays)));
  return target.toISOString().slice(0, 10);
}

interface RawCatalogEntry {
  ean: string;
  name: string;
  brand: string;
  category: ItemCategory;
  unit: string;
  averageUnitWeightKg: number;
  standardShelfLifeDays: number;
  shelfLifeLabel: string;
  defaultQty: number;
  scalingRule: ScalingRule;
  defaultLocation: StorageLocation;
  notes: string;
}

export const COMMON_PANTRY_BARCODES: RawCatalogEntry[] = [
  {
    ean: '5391516590128',
    name: 'Bottled Drinking & Cooking Water (5L Drums)',
    brand: 'Ballygowan / Irish Spring',
    category: 'Water & Hydration',
    unit: 'L',
    averageUnitWeightKg: 1.0,
    standardShelfLifeDays: 540,
    shelfLifeLabel: '18 Months (540 days) sealed cool/dark storage',
    defaultQty: 5,
    scalingRule: 'humanWaterComposite',
    defaultLocation: 'Under Stairs',
    notes: '5L HDPE drum (5.1 kg gross / 1.0 kg per litre)',
  },
  {
    ean: '5000157024671',
    name: 'Tinned Lentil Stew, Chickpeas & Mackerel Fillets',
    brand: 'Bachelor’s / Heinz',
    category: 'Non-Perishable Food',
    unit: 'tins/pouches',
    averageUnitWeightKg: 0.45,
    standardShelfLifeDays: 730,
    shelfLifeLabel: '24 Months (730 days) standard canned pulse shelf life',
    defaultQty: 6,
    scalingRule: 'perAdultPerDay',
    defaultLocation: 'Kitchen Pantry',
    notes: '400g net weight + 50g steel tin tare = 0.45 kg average unit weight',
  },
  {
    ean: '5391500914206',
    name: 'Quick-Cook Porridge Oats, Couscous & Nut Butter',
    brand: 'Flahavan’s / Roma',
    category: 'Non-Perishable Food',
    unit: 'packs (500g)',
    averageUnitWeightKg: 0.52,
    standardShelfLifeDays: 365,
    shelfLifeLabel: '12 Months (365 days) dry sealed grain shelf life',
    defaultQty: 2,
    scalingRule: 'perAdultPerDay',
    defaultLocation: 'Kitchen Pantry',
    notes: '500g dry pack + packaging = 0.52 kg; cooks in 3 mins on single burner',
  },
  {
    ean: '8712400112345',
    name: 'Sterile Ready-to-Feed Liquid Infant Formula (200ml)',
    brand: 'Aptamil / Cow & Gate Stage 1',
    category: 'Infant Care (Critical)',
    unit: 'bottles (200ml)',
    averageUnitWeightKg: 0.22,
    standardShelfLifeDays: 270,
    shelfLifeLabel: '9 Months (270 days) sterile UHT liquid infant formula',
    defaultQty: 8,
    scalingRule: 'perInfantPerDay',
    defaultLocation: 'Kitchen Pantry',
    notes: '200ml sterile bottle (0.22 kg); zero water or boiling required',
  },
  {
    ean: '5000187141225',
    name: 'Tinned Atlantic Mackerel Fillets in Olive Oil (125g)',
    brand: 'John West / Shines Irish Tuna & Mackerel',
    category: 'Non-Perishable Food',
    unit: 'tins',
    averageUnitWeightKg: 0.16,
    standardShelfLifeDays: 1095,
    shelfLifeLabel: '36 Months (1,095 days) oil-preserved fish tin',
    defaultQty: 4,
    scalingRule: 'perAdultPerDay',
    defaultLocation: 'Kitchen Pantry',
    notes: 'High-calorie omega-3 protein; zero cooking required in blackouts',
  },
  {
    ean: '4008429098123',
    name: 'Complete Wet Cat Food Pouches/Tins + Dry Kibble',
    brand: 'Whiskas / Felix Poultry Selection',
    category: 'Pet Supplies',
    unit: 'pouches + 30g dry',
    averageUnitWeightKg: 0.12,
    standardShelfLifeDays: 540,
    shelfLifeLabel: '18 Months (540 days) sealed foil pouch',
    defaultQty: 12,
    scalingRule: 'perPetPerDay',
    defaultLocation: 'Under Stairs',
    notes: '100g wet pouch + kibble portion = 0.12 kg average unit weight',
  },
  {
    ean: '3045320094503',
    name: 'EN417 / CP250 Self-Sealing Butane/Propane Gas Cartridge',
    brand: 'Campingaz / Kemper',
    category: 'Light, Warmth & Cooking',
    unit: 'cartridges',
    averageUnitWeightKg: 0.36,
    standardShelfLifeDays: 1825,
    shelfLifeLabel: '60 Months (5 years) corrosion-free cylinder storage',
    defaultQty: 4,
    scalingRule: 'fixedHousehold',
    defaultLocation: 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
    notes: '250g net gas + 110g steel canister = 0.36 kg per cartridge (~75 mins burn)',
  },
  {
    ean: '4015400567890',
    name: 'Infant Nappies (Size 1/2) & Zinc Barrier Cream',
    brand: 'Pampers New Baby / Sudocrem',
    category: 'Infant Care (Critical)',
    unit: 'nappies',
    averageUnitWeightKg: 0.035,
    standardShelfLifeDays: 1095,
    shelfLifeLabel: '36 Months (1,095 days) sealed dry pack',
    defaultQty: 30,
    scalingRule: 'perInfantPerDay',
    defaultLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    notes: '35g per nappy; keep sealed in waterproof dry-sack inside Rucksack #1',
  },
];

export function lookupBarcodeItem(
  rawCode: string,
  referenceDate: Date = new Date()
): BarcodeProductSuggestion {
  const cleanCode = rawCode.trim().replace(/\s+/g, '');
  const found = COMMON_PANTRY_BARCODES.find((item) => item.ean === cleanCode);

  if (found) {
    return {
      ...found,
      suggestedExpiryDate: calculateSuggestedExpiryFromShelfLife(
        found.standardShelfLifeDays,
        referenceDate
      ),
    };
  }

  // Heuristic fallback for custom EAN-13 / UPC barcodes not in the core list
  return {
    ean: cleanCode || '5390000000000',
    name: `Scanned Pantry Item (EAN ${cleanCode || 'Unknown'})`,
    brand: 'Standard Pantry Stock',
    category: 'Non-Perishable Food',
    unit: 'tins/packs',
    averageUnitWeightKg: 0.4,
    standardShelfLifeDays: 365,
    shelfLifeLabel: '12 Months (365 days) standard ambient pantry shelf life',
    suggestedExpiryDate: calculateSuggestedExpiryFromShelfLife(365, referenceDate),
    defaultQty: 2,
    scalingRule: 'perAdultPerDay',
    defaultLocation: 'Kitchen Pantry',
    notes: 'Standard 400g pantry item estimate (0.40 kg, 12-month shelf life)',
  };
}
