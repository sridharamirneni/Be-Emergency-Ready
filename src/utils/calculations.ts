import {
  HouseholdMember,
  InventoryItem,
  PowerDevice,
  PreparednessTier,
  ReadinessTrendPoint,
  ScalingRule,
  StorageLocation,
} from '../types';

export const TIER_DAYS: Record<PreparednessTier, number> = {
  tier1_72h: 3, // 72-Hour Baseline (Ireland/UK Standard)
  tier2_10d: 10, // 10-Day Extended Home Pantry + 48h Grab Bag
};

export interface RosterCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

export function getRosterCounts(roster: HouseholdMember[]): RosterCounts {
  return {
    adults: roster.filter((m) => m.type === 'adult').length,
    children: roster.filter((m) => m.type === 'child').length,
    infants: roster.filter((m) => m.type === 'infant').length,
    pets: roster.filter((m) => m.type === 'pet').length,
  };
}

/**
 * Calculates target quantity for an inventory item given the household roster and active tier.
 */
export function calculateTargetQuantity(
  itemOrBaseQty: InventoryItem | number,
  ruleOrRoster: ScalingRule | HouseholdMember[],
  rosterOrTier: HouseholdMember[] | PreparednessTier,
  maybeTier?: PreparednessTier
): number {
  let baseQty: number;
  let scalingRule: ScalingRule;
  let roster: HouseholdMember[];
  let tier: PreparednessTier;

  if (typeof itemOrBaseQty === 'object' && itemOrBaseQty !== null) {
    baseQty = itemOrBaseQty.baseQty;
    scalingRule = itemOrBaseQty.scalingRule;
    roster = ruleOrRoster as HouseholdMember[];
    tier = rosterOrTier as PreparednessTier;
  } else {
    baseQty = itemOrBaseQty;
    scalingRule = ruleOrRoster as ScalingRule;
    roster = rosterOrTier as HouseholdMember[];
    tier = maybeTier as PreparednessTier;
  }

  const counts = getRosterCounts(roster);
  const days = TIER_DAYS[tier];

  switch (scalingRule) {
    case 'humanWaterComposite': {
      // 3L/day per Adult (2.5L drinking + 0.5L cooking) + 2L/day per Child
      const dailyLiters = counts.adults * 3 + counts.children * 2;
      return Math.round(dailyLiters * days * 10) / 10;
    }
    case 'perAdultPerDay':
      return Math.round(baseQty * counts.adults * days * 10) / 10;
    case 'perChildPerDay':
      return Math.round(baseQty * counts.children * days * 10) / 10;
    case 'perInfantPerDay':
      return Math.round(baseQty * counts.infants * days * 10) / 10;
    case 'perPetPerDay':
      return Math.round(baseQty * counts.pets * days * 10) / 10;
    case 'perHumanFixed':
      return Math.round(baseQty * (counts.adults + counts.children));
    case 'perInfantFixed':
      return Math.round(baseQty * counts.infants);
    case 'perPetFixed':
      return Math.round(baseQty * counts.pets);
    case 'fixedHousehold':
    default:
      return baseQty;
  }
}

export interface ScalingSummaryMetrics {
  days: number;
  adultWaterLiters: number;
  childWaterLiters: number;
  infantWaterLiters: number;
  humanDrinkingCookingWaterLiters: number;
  totalHumanWaterLiters: number;
  petWaterLiters: number;
  adultKcalTotal: number;
  childKcalTotal: number;
  totalKcalRequired: number;
  infantFormulaBottles: number;
  infantTeats: number;
  infantNappies: number;
  petWetPouches: number;
  humanGrabBags: number;
  infantSleepingBags: number;
  petCarriers: number;
}

export function calculateHouseholdScalingSummary(
  roster: HouseholdMember[],
  tier: PreparednessTier
): ScalingSummaryMetrics {
  const counts = getRosterCounts(roster);
  const days = TIER_DAYS[tier];

  const adultWaterLiters = counts.adults * 3 * days;
  const childWaterLiters = counts.children * 2 * days;
  const infantWaterLiters = counts.infants * 1 * days;
  const humanDrinkingCookingWaterLiters = adultWaterLiters + childWaterLiters;
  const totalHumanWaterLiters = humanDrinkingCookingWaterLiters + infantWaterLiters;
  const petWaterLiters = Math.round(counts.pets * 0.5 * days * 10) / 10;

  const adultKcalTotal = counts.adults * 2200 * days;
  const childKcalTotal = counts.children * 1500 * days;
  const totalKcalRequired = adultKcalTotal + childKcalTotal;

  const infantFormulaBottles = counts.infants * 8 * days;
  const infantTeats = counts.infants * 8 * days;
  const infantNappies = counts.infants * 10 * days;
  const petWetPouches = counts.pets * 2 * days;

  const humanGrabBags = counts.adults + counts.children;
  const infantSleepingBags = counts.infants;
  const petCarriers = counts.pets;

  return {
    days,
    adultWaterLiters,
    childWaterLiters,
    infantWaterLiters,
    humanDrinkingCookingWaterLiters,
    totalHumanWaterLiters,
    petWaterLiters,
    adultKcalTotal,
    childKcalTotal,
    totalKcalRequired,
    infantFormulaBottles,
    infantTeats,
    infantNappies,
    petWetPouches,
    humanGrabBags,
    infantSleepingBags,
    petCarriers,
  };
}

export type WeightStatus = 'good' | 'warning' | 'critical';

export interface RucksackWeightReport {
  location: StorageLocation;
  currentWeightKg: number;
  targetWeightKg: number;
  itemCount: number;
  status: WeightStatus;
}

export function evaluateRucksackWeightStatus(weightKg: number): WeightStatus {
  if (weightKg > 12) return 'critical';
  if (weightKg > 10) return 'warning';
  return 'good';
}

export function calculateRucksackWeight(
  items: InventoryItem[],
  location: StorageLocation,
  roster: HouseholdMember[],
  tier: PreparednessTier
): RucksackWeightReport {
  const bagItems = items.filter((item) => item.storageLocation === location);
  let currentWeight = 0;
  let targetWeight = 0;

  for (const item of bagItems) {
    const targetQty = calculateTargetQuantity(item.baseQty, item.scalingRule, roster, tier);
    currentWeight += item.currentQty * item.unitWeightKg;
    targetWeight += targetQty * item.unitWeightKg;
  }

  const currentWeightKg = Math.round(currentWeight * 100) / 100;
  const targetWeightKg = Math.round(targetWeight * 100) / 100;

  return {
    location,
    currentWeightKg,
    targetWeightKg,
    itemCount: bagItems.length,
    status: evaluateRucksackWeightStatus(currentWeightKg),
  };
}

export type ExpiryStatus = 'expired' | 'expiring_soon' | 'good' | 'non_perishable';

export function getDaysUntilExpiry(expiryDate?: string, referenceDate: Date = new Date()): number | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate + 'T00:00:00');
  if (Number.isNaN(exp.getTime())) return null;
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const diffMs = exp.getTime() - ref.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function getItemExpiryStatus(expiryDate?: string, referenceDate: Date = new Date()): ExpiryStatus {
  const days = getDaysUntilExpiry(expiryDate, referenceDate);
  if (days === null) return 'non_perishable';
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'good';
}

export interface PowerCadenceMetrics {
  daysSinceCharged: number;
  daysRemaining: number;
  progressPercent: number;
  status: 'good' | 'warning' | 'expired';
}

export function calculatePowerCadence(
  lastChargedDate: string,
  referenceDate: Date = new Date()
): PowerCadenceMetrics {
  const last = new Date(lastChargedDate + 'T00:00:00');
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const diffDays = Math.max(0, Math.round((ref.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, 90 - diffDays);
  const progressPercent = Math.max(0, Math.min(100, Math.round((daysRemaining / 90) * 100)));

  let status: 'good' | 'warning' | 'expired' = 'good';
  if (daysRemaining === 0) {
    status = 'expired';
  } else if (daysRemaining <= 14) {
    status = 'warning';
  }

  return {
    daysSinceCharged: diffDays,
    daysRemaining,
    progressPercent,
    status,
  };
}

export interface InfantMilestoneAlert {
  infantId: string;
  infantName: string;
  ageMonths: number;
  ageWeeks: number;
  ageDays: number;
  stageLabel: string;
  severity: 'amber' | 'emerald' | 'coral';
  nappyGuidance: string;
  sleepingBagGuidance: string;
  feedingAndTeatGuidance: string;
  clothingLayerGuidance: string;
  nextTransitionAlert: string;
  currentNappySize: string;
  sleepingBagSize: string;
  feedingStage: string;
  alerts: string[];
  nextSizeSwapDate: string;
  brackets: Array<{
    bracket: string;
    label: string;
    status: 'current' | 'upcoming';
    nappySizeGuide: string;
    sleepingBagSize: string;
    feedingGuidance: string;
    clothingSize: string;
  }>;
}

export function calculateInfantMilestones(
  infantOrName: HouseholdMember | string,
  dobOrReferenceDate: Date | string = new Date()
): InfantMilestoneAlert {
  const infantId = typeof infantOrName === 'string' ? infantOrName : infantOrName.id;
  const infantName = typeof infantOrName === 'string' ? infantOrName : infantOrName.name;
  const birthDateStr =
    typeof infantOrName === 'string'
      ? typeof dobOrReferenceDate === 'string'
        ? dobOrReferenceDate
        : undefined
      : infantOrName.birthDate;
  const referenceDate =
    dobOrReferenceDate instanceof Date ? dobOrReferenceDate : new Date();

  const birth = birthDateStr ? new Date(birthDateStr + 'T00:00:00') : new Date(referenceDate);
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const diffDays = Math.max(0, Math.round((ref.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)));
  const ageMonths = Math.floor(diffDays / 30.4375);
  const ageWeeks = Math.floor(diffDays / 7);

  const swapDateObj = new Date(birth);
  swapDateObj.setDate(swapDateObj.getDate() + (ageMonths < 2 ? 60 : ageMonths < 6 ? 180 : 365));
  const nextSizeSwapDate = swapDateObj.toISOString().slice(0, 10);

  const brackets = [
    {
      bracket: '0-2m',
      label: '0–2 Months (Newborn)',
      status: (ageMonths < 2 ? 'current' : 'upcoming') as 'current' | 'upcoming',
      nappySizeGuide: 'Size 1–2 Nappies (3–6 kg)',
      sleepingBagSize: '0–6m 3.5 TOG Winter Sleeping Bag',
      feedingGuidance: 'Sterile Ready-to-Feed Liquid Formula & Size 1 Teats',
      clothingSize: '0–3m Thermal Sleepsuits',
    },
    {
      bracket: '2-6m',
      label: '2–6 Months',
      status: (ageMonths >= 2 && ageMonths < 6 ? 'current' : 'upcoming') as 'current' | 'upcoming',
      nappySizeGuide: 'Size 3 Nappies (6–10 kg)',
      sleepingBagSize: '0–6m 3.5 TOG Bag (Prep 6–18m)',
      feedingGuidance: 'Sterile RTF Formula & Size 2 Medium-Flow Teats',
      clothingSize: '3–6m Thermal Layers',
    },
    {
      bracket: '6-12m',
      label: '6–12 Months (Weaning)',
      status: (ageMonths >= 6 ? 'current' : 'upcoming') as 'current' | 'upcoming',
      nappySizeGuide: 'Size 4 / 4+ Nappies (9–15 kg)',
      sleepingBagSize: '6–18m 3.5 TOG Winter Sleeping Bag',
      feedingGuidance: 'Size 3 Teats + 6m+ Long-Life Weaning Pouches',
      clothingSize: '6–12m Thermal Base Layers',
    },
  ];

  if (ageMonths < 2) {
    const nappyGuidance = 'Size 1 -> Size 2 (3-6 kg) transition window active. Stock 50% Size 2 in Rucksack #1.';
    const sleepingBagGuidance = '0-6m 3.5 TOG winter sleeping bag (check neck opening fit so head cannot slip inside).';
    const feedingAndTeatGuidance = '8x 200ml Sterile Ready-to-Feed liquid formula/day + Size 1 Slow-Flow pre-sterilised teats.';
    const clothingLayerGuidance = '0-3m thermal merino/cotton vests + 3x sleepsuits sealed in waterproof dry-bag.';
    const nextTransitionAlert = 'Upcoming at 8-10 weeks: Upgrade Rucksack #1 spare clothing to 3-6m & Size 2 medium-flow teats.';
    return {
      infantId,
      infantName,
      ageMonths,
      ageWeeks,
      ageDays: diffDays,
      stageLabel: `Newborn / ${ageMonths}m (${ageWeeks} wks)`,
      severity: 'amber',
      nappyGuidance,
      sleepingBagGuidance,
      feedingAndTeatGuidance,
      clothingLayerGuidance,
      nextTransitionAlert,
      currentNappySize: 'Size 1 → Size 2 (3–6 kg)',
      sleepingBagSize: '0–6m 3.5 TOG Winter Bag',
      feedingStage: '8x 200ml Sterile RTF Formula + Size 1 Slow-Flow Teats',
      alerts: [nappyGuidance, clothingLayerGuidance, nextTransitionAlert],
      nextSizeSwapDate,
      brackets,
    };
  } else if (ageMonths < 6) {
    const nappyGuidance = 'Upgrade emergency stash to Size 3 (6-10 kg) nappies; rotate out remaining Size 1/2.';
    const sleepingBagGuidance = '0-6m 3.5 TOG winter bag active; prepare 6-18m 3.5 TOG bag before month 6.';
    const feedingAndTeatGuidance = '8x 200ml Ready-to-Feed bottles/day + Upgrade to Size 2 Medium-Flow pre-sterilised teats.';
    const clothingLayerGuidance = 'Replace 0-3m grab-bag layers with 3-6m fleece/thermal layers and warm hat.';
    const nextTransitionAlert = 'Upcoming at 6 months: Introduce 6m+ long-life weaning pouches, collapsible spoon & Size 4 nappies.';
    return {
      infantId,
      infantName,
      ageMonths,
      ageWeeks,
      ageDays: diffDays,
      stageLabel: `Infant ${ageMonths} Months`,
      severity: 'amber',
      nappyGuidance,
      sleepingBagGuidance,
      feedingAndTeatGuidance,
      clothingLayerGuidance,
      nextTransitionAlert,
      currentNappySize: 'Size 3 (6–10 kg)',
      sleepingBagSize: '0–6m 3.5 TOG (Prepare 6–18m Bag)',
      feedingStage: '8x 200ml Sterile RTF Formula + Size 2 Medium-Flow Teats',
      alerts: [nappyGuidance, clothingLayerGuidance, nextTransitionAlert],
      nextSizeSwapDate,
      brackets,
    };
  } else {
    const nappyGuidance = 'Upgrade to Size 4 / 4+ (9-15 kg) nappies across Rucksack #1 and Home Pantry.';
    const sleepingBagGuidance = 'Mandatory upgrade to 6-18m 3.5 TOG winter sleeping bag.';
    const feedingAndTeatGuidance = 'Transition from newborn teats to Size 3 Fast-Flow teats + 6m+ organic weaning pouches & sterile water.';
    const clothingLayerGuidance = 'Upgrade grab-bag clothing to 6-12m thermal base layers + waterproof outer suit.';
    const nextTransitionAlert = 'Verify Infant Paracetamol (120mg/5ml) weight-based syringe dosing & check expiry date.';
    return {
      infantId,
      infantName,
      ageMonths,
      ageWeeks,
      ageDays: diffDays,
      stageLabel: `Weaning Infant ${ageMonths} Months`,
      severity: 'coral',
      nappyGuidance,
      sleepingBagGuidance,
      feedingAndTeatGuidance,
      clothingLayerGuidance,
      nextTransitionAlert,
      currentNappySize: 'Size 4 / 4+ (9–15 kg)',
      sleepingBagSize: '6–18m 3.5 TOG Winter Bag',
      feedingStage: 'Size 3 Fast-Flow Teats + 6m+ Weaning Pouches',
      alerts: [nappyGuidance, feedingAndTeatGuidance, nextTransitionAlert],
      nextSizeSwapDate,
      brackets,
    };
  }
}

export interface ReadinessScoreBreakdown {
  overallScore: number;
  stockedItemsCount: number;
  totalActiveItemsCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  criticalMissingCount: number;
}

export function calculateHouseholdReadiness(
  items: InventoryItem[],
  roster: HouseholdMember[],
  tier: PreparednessTier,
  referenceDate: Date = new Date()
): ReadinessScoreBreakdown {
  let totalRatio = 0;
  let activeCount = 0;
  let stockedItemsCount = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  let criticalMissingCount = 0;

  for (const item of items) {
    if (!isItemApplicableToHousehold(item, roster)) continue;
    const targetQty = calculateTargetQuantity(item.baseQty, item.scalingRule, roster, tier);
    if (targetQty <= 0) continue;

    activeCount++;
    const status = getItemExpiryStatus(item.expiryDate, referenceDate);
    if (status === 'expired') {
      expiredCount++;
    } else if (status === 'expiring_soon') {
      expiringSoonCount++;
    }

    // Expired items do not count as usable stock
    const effectiveQty = status === 'expired' ? 0 : item.currentQty;
    const ratio = Math.min(1, effectiveQty / targetQty);
    totalRatio += ratio;

    if (effectiveQty >= targetQty) {
      stockedItemsCount++;
    } else if (item.isCritical) {
      criticalMissingCount++;
    }
  }

  const overallScore = activeCount > 0 ? Math.round((totalRatio / activeCount) * 100) : 100;

  return {
    overallScore,
    stockedItemsCount,
    totalActiveItemsCount: activeCount,
    expiredCount,
    expiringSoonCount,
    criticalMissingCount,
  };
}

function formatIcsDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function generateExpiryIcs(items: InventoryItem[], referenceDate: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Be Ready Household Emergency Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const stamp = formatIcsDate(referenceDate) + 'T090000Z';

  for (const item of items) {
    if (!item.expiryDate) continue;
    const expDate = new Date(item.expiryDate + 'T00:00:00Z');
    if (Number.isNaN(expDate.getTime())) continue;

    // Reminder event set 30 days prior to expiryDate
    const reminderDate = new Date(expDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startStr = formatIcsDate(reminderDate);
    const endDate = new Date(reminderDate.getTime() + 24 * 60 * 60 * 1000);
    const endStr = formatIcsDate(endDate);

    const safeTitle = item.name.replace(/[,;\\]/g, ' ');
    const safeLocation = item.storageLocation.replace(/[,;\\]/g, ' ');

    lines.push(
      'BEGIN:VEVENT',
      `UID:beready-rot-${item.id}-${startStr}@beready.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${startStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:Rotate Emergency Stock: ${safeTitle} (Expires ${item.expiryDate})`,
      `DESCRIPTION:FIFO Pantry Rotation Reminder: ${safeTitle} (${item.currentQty} ${item.unit}) in ${safeLocation} expires on ${item.expiryDate}. Move to everyday kitchen and replace with fresh stock.`,
      `LOCATION:${safeLocation}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT9H',
      'ACTION:DISPLAY',
      `DESCRIPTION:Rotate ${safeTitle} - 30 days until expiry`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function deriveWarningLevelFromMetrics(
  windSpeedKmh: number,
  windGustsKmh: number,
  precipitationMm: number
): 'none' | 'yellow' | 'orange' | 'red' {
  // Met Éireann thresholds:
  // Status Red: Mean wind > 80 km/h or gusts > 130 km/h or extreme rain
  if (windSpeedKmh >= 80 || windGustsKmh >= 130 || precipitationMm >= 50) {
    return 'red';
  }
  // Status Orange: Mean wind 65-80 km/h or gusts 110-130 km/h
  if (windSpeedKmh >= 65 || windGustsKmh >= 110 || precipitationMm >= 30) {
    return 'orange';
  }
  // Status Yellow: Mean wind 50-65 km/h or gusts 90-110 km/h
  if (windSpeedKmh >= 50 || windGustsKmh >= 90 || precipitationMm >= 15) {
    return 'yellow';
  }
  return 'none';
}

export function formatCountdownMmSs(secondsRemaining: number): string {
  const clamped = Math.max(0, Math.floor(secondsRemaining));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function calculateRosterSummary(
  roster: HouseholdMember[],
  tier: PreparednessTier
) {
  const counts = getRosterCounts(roster);
  const metrics = calculateHouseholdScalingSummary(roster, tier);
  return {
    adults: counts.adults,
    children: counts.children,
    infants: counts.infants,
    pets: counts.pets,
    days: metrics.days,
    humanDrinkingAndCookingWaterL: metrics.humanDrinkingCookingWaterLiters,
    infantHygieneWaterL: metrics.infantWaterLiters,
    petWaterL: metrics.petWaterLiters,
    totalKcal: metrics.totalKcalRequired,
    infantFormulaBottles: metrics.infantFormulaBottles,
    infantSterileTeats: metrics.infantTeats,
    infantNappies: metrics.infantNappies,
    petWetPouches: metrics.petWetPouches,
    grabBagsNeeded: metrics.humanGrabBags,
    petCarriersNeeded: metrics.petCarriers,
  };
}

export function calculateGrabBagWeights(items: InventoryItem[], roster?: HouseholdMember[]) {
  const applicableItems = roster
    ? items.filter((i) => isItemApplicableToHousehold(i, roster))
    : items;
  const r1Loc: StorageLocation = 'Rucksack #1 (Parent 1 - Baby & Docs Lead)';
  const r2Loc: StorageLocation = 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)';
  const rucksack1Items = applicableItems.filter((i) => i.storageLocation === r1Loc);
  const rucksack2Items = applicableItems.filter((i) => i.storageLocation === r2Loc);

  const rucksack1Kg =
    Math.round(
      rucksack1Items.reduce((sum, i) => sum + i.currentQty * i.unitWeightKg, 0) * 100
    ) / 100;
  const rucksack2Kg =
    Math.round(
      rucksack2Items.reduce((sum, i) => sum + i.currentQty * i.unitWeightKg, 0) * 100
    ) / 100;

  const mapStatus = (kg: number): 'good' | 'amber' | 'red' => {
    if (kg > 12) return 'red';
    if (kg > 10) return 'amber';
    return 'good';
  };

  return {
    rucksack1Kg,
    rucksack2Kg,
    rucksack1Status: mapStatus(rucksack1Kg),
    rucksack2Status: mapStatus(rucksack2Kg),
    rucksack1Items,
    rucksack2Items,
    bag1Kg: rucksack1Kg,
    bag2Kg: rucksack2Kg,
    bag1CapKg: 10,
    bag2CapKg: 10,
    bag1Overweight: rucksack1Kg > 10,
    bag2Overweight: rucksack2Kg > 10,
  };
}

export function evaluateExpiryStatus(
  expiryDate?: string,
  referenceDate: Date = new Date()
): {
  status: 'expired' | 'amber' | 'good';
  daysRemaining: number | null;
  label: string;
} {
  const days = getDaysUntilExpiry(expiryDate, referenceDate);
  if (days === null) {
    return { status: 'good', daysRemaining: null, label: 'Long-Life' };
  }
  if (days < 0) {
    return {
      status: 'expired',
      daysRemaining: days,
      label: `Expired (${Math.abs(days)}d ago)`,
    };
  }
  if (days <= 30) {
    return {
      status: 'amber',
      daysRemaining: days,
      label: `Rotate Soon (${days}d left)`,
    };
  }
  return {
    status: 'good',
    daysRemaining: days,
    label: `Good (${days}d left)`,
  };
}

export function evaluatePowerCadence(
  lastChargedDate: string,
  referenceDate: Date = new Date()
) {
  const metrics = calculatePowerCadence(lastChargedDate, referenceDate);
  const status: 'good' | 'amber' | 'red' =
    metrics.status === 'expired'
      ? 'red'
      : metrics.status === 'warning'
      ? 'amber'
      : 'good';
  return {
    daysSinceCharged: metrics.daysSinceCharged,
    daysSinceCharge: metrics.daysSinceCharged,
    daysUntilDue: metrics.daysRemaining,
    progressPercent: metrics.progressPercent,
    status,
    isDue: status !== 'good',
  };
}

export function generateExpiryIcsContent(
  items: InventoryItem[],
  referenceDate: Date = new Date()
): string {
  return generateExpiryIcs(items, referenceDate);
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatMonthYear(isoDate?: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(isoDate?: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatShortLocationLabel(loc: StorageLocation): string {
  if (loc.startsWith('Rucksack #1')) return 'Rucksack #1';
  if (loc.startsWith('Rucksack #2')) return 'Rucksack #2';
  return loc;
}

export function formatShortUnit(rawUnit: string): string {
  if (!rawUnit) return 'units';
  const lower = rawUnit.toLowerCase().trim();
  if (lower === 'l' || lower.startsWith('l ')) return 'L';
  if (lower.startsWith('eur')) return 'EUR';
  if (lower.includes('tins/pouches') || lower.startsWith('tin')) return 'tins';
  if (lower.startsWith('pack') || lower.includes('multipack')) return 'packs';
  if (lower.startsWith('box')) return 'boxes';
  if (lower.startsWith('bottle')) return 'bottles';
  if (lower.includes('teat')) return 'teats';
  if (lower.startsWith('napp')) return 'nappies';
  if (lower.startsWith('pouch')) return 'pouches';
  if (lower.startsWith('carrier')) return 'carriers';
  if (lower.startsWith('bag')) return lower === 'bag' ? 'bag' : 'bags';
  if (lower.includes('kit')) return 'kit';
  if (lower === 'stove' || lower.startsWith('stove')) return 'stove';
  if (lower.startsWith('can') || lower.includes('cartridge')) return 'cans';
  if (lower.startsWith('set')) return 'set';
  if (lower.includes('radio')) return 'radio';
  if (lower.includes('bank')) return 'banks';
  if (lower.includes('cable')) return 'cables';
  if (lower.includes('folio')) return 'folio';

  // Strip parenthetical details and take first short word
  const withoutParens = rawUnit.replace(/\([^)]*\)/g, '').trim();
  const firstWord = withoutParens.split(/[\s+/]+/)[0];
  return firstWord || 'units';
}

export type StockStatusLabel =
  | 'Stocked'
  | 'Low Stock'
  | 'Missing'
  | 'Expiring Soon'
  | 'Expired';

export type StockStatusFilter = 'ALL' | StockStatusLabel;

export function getItemStockStatusLabel(
  item: Pick<InventoryItem, 'currentQty' | 'expiryDate'>,
  targetQty: number,
  referenceDate: Date = new Date()
): StockStatusLabel {
  const expiryInfo = evaluateExpiryStatus(item.expiryDate, referenceDate);
  const isMissing = item.currentQty === 0 && targetQty > 0;
  if (isMissing) return 'Missing';
  if (expiryInfo.status === 'expired') return 'Expired';
  if (item.currentQty < targetQty) return 'Low Stock';
  if (expiryInfo.status === 'amber') return 'Expiring Soon';
  return 'Stocked';
}

const CATEGORY_SEARCH_ALIASES: Record<string, string> = {
  'Water & Hydration': 'water hydration drinking',
  'Non-Perishable Food': 'food pantry tins meals',
  'Infant Care (Critical)': 'infant baby formula nappies',
  'Pet Supplies': 'pets cat dog carrier kibble',
  'Medical & Hygiene': 'medical hygiene first aid pharmacy',
  'Light, Warmth & Cooking': 'light heat warmth cooking stove sleeping bag',
  'Comms, Power & Cash': 'power cash comms radio battery',
  'Important Documents': 'documents folder passports ids',
};

export interface EnrichedInventoryItem extends InventoryItem {
  targetQty: number;
  isComplete: boolean;
  totalWeightKg: number;
  expiryInfo: ReturnType<typeof evaluateExpiryStatus>;
  stockStatus: StockStatusLabel;
}

export function isInfantItem(
  item: InventoryItem | { category: string; scalingRule?: string; id?: string; name?: string }
): boolean {
  if (item.category === 'Infant Care (Critical)') return true;
  if (item.scalingRule === 'perInfantPerDay' || item.scalingRule === 'perInfantFixed') return true;
  const idLower = (item.id || '').toLowerCase();
  const nameLower = (item.name || '').toLowerCase();
  if (idLower.includes('infant') || idLower.includes('baby')) return true;
  if (
    nameLower.includes('infant') ||
    nameLower.includes('baby') ||
    nameLower.includes('formula') ||
    nameLower.includes('teat') ||
    nameLower.includes('nappies')
  ) {
    return true;
  }
  return false;
}

export function isPetItem(
  item: InventoryItem | { category: string; scalingRule?: string; id?: string; name?: string }
): boolean {
  if (item.category === 'Pet Supplies') return true;
  if (item.scalingRule === 'perPetPerDay' || item.scalingRule === 'perPetFixed') return true;
  const idLower = (item.id || '').toLowerCase();
  const nameLower = (item.name || '').toLowerCase();
  if (idLower.includes('pet-') || idLower.includes('cat-') || idLower.includes('dog-')) return true;
  if (
    nameLower.includes('pet ') ||
    nameLower.includes('pets') ||
    nameLower.includes('cat ') ||
    nameLower.includes('cats') ||
    nameLower.includes('dog ') ||
    nameLower.includes('dogs') ||
    nameLower.includes('kibble') ||
    nameLower.includes('litter')
  ) {
    return true;
  }
  return false;
}

/**
 * Determines whether an inventory item applies to the current household roster.
 * If a household has 0 infants, infant formula/nappies/teats are hidden.
 * If a household has 0 pets, pet supplies/food/carriers are hidden.
 */
export function isItemApplicableToHousehold(
  item: InventoryItem,
  roster: HouseholdMember[],
  showHiddenUnassignedMembers: boolean = false
): boolean {
  if (showHiddenUnassignedMembers) return true;
  const counts = getRosterCounts(roster);
  if (counts.infants === 0 && isInfantItem(item)) {
    return false;
  }
  if (counts.pets === 0 && isPetItem(item)) {
    return false;
  }
  return true;
}

export interface InventoryFilterOptions {
  searchQuery?: string;
  category?: InventoryItem['category'] | 'ALL';
  storageLocation?: StorageLocation | 'ALL';
  stockStatus?: StockStatusFilter;
  shoppingMode?: boolean;
  referenceDate?: Date;
  showHiddenUnassignedMembers?: boolean;
}

export function enrichInventoryItems(
  inventory: InventoryItem[],
  roster: HouseholdMember[],
  tier: PreparednessTier,
  referenceDate: Date = new Date(),
  showHiddenUnassignedMembers: boolean = false
): EnrichedInventoryItem[] {
  return inventory
    .filter((item) => isItemApplicableToHousehold(item, roster, showHiddenUnassignedMembers))
    .map((item) => {
      const targetQty = calculateTargetQuantity(item, roster, tier);
      const isComplete = item.currentQty >= targetQty;
      const totalWeightKg = Math.round(item.currentQty * item.unitWeightKg * 100) / 100;
      const expiryInfo = evaluateExpiryStatus(item.expiryDate, referenceDate);
      const stockStatus = getItemStockStatusLabel(item, targetQty, referenceDate);
      return {
        ...item,
        targetQty,
        isComplete,
        totalWeightKg,
        expiryInfo,
        stockStatus,
      };
    })
    .filter((item) => item.targetQty > 0 || item.currentQty > 0);
}

export function filterInventoryItems(
  inventory: InventoryItem[],
  roster: HouseholdMember[],
  tier: PreparednessTier,
  options: InventoryFilterOptions = {}
): EnrichedInventoryItem[] {
  const {
    searchQuery = '',
    category = 'ALL',
    storageLocation = 'ALL',
    stockStatus = 'ALL',
    shoppingMode = false,
    referenceDate = new Date(),
    showHiddenUnassignedMembers = false,
  } = options;

  const enriched = enrichInventoryItems(
    inventory,
    roster,
    tier,
    referenceDate,
    showHiddenUnassignedMembers
  );
  const query = searchQuery.trim().toLowerCase();

  return enriched.filter((item) => {
    // In shopping mode / shopping list view, strictly include all items needing restock
    // where (currentQty < targetQty), regardless of storage location assignment (Pantry, Under Stairs, Grab Bags, etc.)
    if (shoppingMode) {
      if (item.currentQty >= item.targetQty) return false;
      // Do NOT filter out items based on storageLocation in shoppingMode:
      // Shopping runs collect all supplies needed across the entire household.
    } else {
      if (storageLocation !== 'ALL' && item.storageLocation !== storageLocation) return false;
      if (stockStatus !== 'ALL' && item.stockStatus !== stockStatus) return false;
    }

    if (category !== 'ALL' && item.category !== category) return false;

    if (query) {
      const haystack = [
        item.name,
        item.category,
        CATEGORY_SEARCH_ALIASES[item.category] || '',
        item.stockStatus,
        item.storageLocation,
      ]
        .join(' ')
        .toLowerCase();

      // Support multi-word search tokens so e.g. "low stock food" or "gas stove" matches accurately
      const tokens = query.split(/\s+/).filter(Boolean);
      const matchesAllTokens = tokens.every((token) => haystack.includes(token));
      if (!matchesAllTokens) return false;
    }

    return true;
  });
}

export function describeScalingTooltip(
  item: InventoryItem,
  targetQty: number,
  roster: HouseholdMember[],
  tier: PreparednessTier
): string {
  const counts = getRosterCounts(roster);
  const days = TIER_DAYS[tier];
  const totalWeightKg = Math.round(item.currentQty * item.unitWeightKg * 100) / 100;
  const shortUnit = formatShortUnit(item.unit);

  let formula = `Fixed household target (${targetQty} ${shortUnit})`;
  switch (item.scalingRule) {
    case 'humanWaterComposite':
      formula = `3L/day × ${counts.adults} adults${
        counts.children > 0 ? ` + 2L/day × ${counts.children} children` : ''
      } × ${days} days`;
      break;
    case 'perAdultPerDay':
      formula = `${item.baseQty} ${shortUnit}/day × ${counts.adults} adults × ${days} days`;
      break;
    case 'perChildPerDay':
      formula = `${item.baseQty} ${shortUnit}/day × ${counts.children} children × ${days} days`;
      break;
    case 'perInfantPerDay':
      formula = `${item.baseQty} ${shortUnit}/day × ${counts.infants} infant × ${days} days`;
      break;
    case 'perPetPerDay':
      formula = `${item.baseQty} ${shortUnit}/day × ${counts.pets} pets × ${days} days`;
      break;
    case 'perHumanFixed':
      formula = `${item.baseQty} ${shortUnit} × ${counts.adults + counts.children} people`;
      break;
    case 'perInfantFixed':
      formula = `${item.baseQty} ${shortUnit} × ${counts.infants} infant`;
      break;
    case 'perPetFixed':
      formula = `${item.baseQty} ${shortUnit} × ${counts.pets} pets`;
      break;
  }

  const notesSuffix = item.notes ? ` • ${item.notes}` : '';
  return `Target: ${targetQty} ${shortUnit} (${formula}) • Total Weight: ${totalWeightKg} kg (${item.unitWeightKg} kg/${shortUnit})${notesSuffix}`;
}

export interface ParsedMultiItemSegment {
  name: string;
  quantityMultiplier: number | null;
}

/**
 * Splits a string on a delimiter only when outside parentheses.
 */
function splitOutsideParens(input: string, delimiterRegex: RegExp): string[] {
  const results: string[] = [];
  let depth = 0;
  let lastIndex = 0;

  const flags = delimiterRegex.flags.includes('g')
    ? delimiterRegex.flags
    : delimiterRegex.flags + 'g';
  const globalRegex = new RegExp(delimiterRegex.source, flags);

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(') depth++;
    else if (ch === ')' && depth > 0) depth--;
  }

  // Reset and scan matches while tracking parentheses depth
  depth = 0;
  let match: RegExpExecArray | null;
  while ((match = globalRegex.exec(input)) !== null) {
    const matchIndex = match.index;
    // Calculate depth at matchIndex
    let curDepth = 0;
    for (let i = 0; i < matchIndex; i++) {
      if (input[i] === '(') curDepth++;
      else if (input[i] === ')' && curDepth > 0) curDepth--;
    }
    if (curDepth === 0) {
      results.push(input.slice(lastIndex, matchIndex).trim());
      lastIndex = matchIndex + match[0].length;
    }
  }
  results.push(input.slice(lastIndex).trim());
  return results.filter(Boolean);
}

/**
 * Parses an inventory item name/description and extracts individual item segments
 * along with any embedded quantity multipliers (e.g. "4x Spare Butane Cartridges").
 */
export function parseMultiItemSegments(rawName: string): ParsedMultiItemSegment[] {
  const trimmed = (rawName || '').trim();
  if (!trimmed) return [];

  let rawParts: string[] = [trimmed];

  // 1. Primary split on " + " outside parentheses (e.g., "Stove + Fuel", "Gas Stove + 4x Cartridges")
  if (trimmed.includes('+')) {
    const plusSplit = splitOutsideParens(trimmed, /\s*\+\s*/g);
    if (plusSplit.length > 1) {
      rawParts = plusSplit;
    }
  }

  // 2. Secondary split for comma-separated multi-item lists (e.g., "Porridge Oats, Couscous & Nut Butter")
  if (rawParts.length === 1 && trimmed.includes(',')) {
    const commaAndSplit = splitOutsideParens(trimmed, /\s*,\s*|\s+(?:&|and)\s+/gi);
    if (commaAndSplit.length >= 2) {
      rawParts = commaAndSplit;
    }
  }

  // 3. Tertiary split for 2-part "&" compound items when clearly representing 2 separate physical items
  // (Avoids splitting modifier pairs like "Drinking & Cooking Water" or "Fireproof & Waterproof Folder")
  if (rawParts.length === 1 && /\s+&\s+/.test(trimmed)) {
    const ampParts = splitOutsideParens(trimmed, /\s+&\s+/g);
    if (ampParts.length === 2) {
      const [left, right] = ampParts;
      const leftEndsWithParen = /\)\s*$/.test(left);
      const rightStartsWithQty = /^\d+(?:\.\d+)?\s*[x×]\s+/i.test(right);
      const knownCompoundNouns =
        /\b(nappies|litter|bars|stew|wipes|kit|stove|carrier|rucksack|folder)\b/i.test(left) &&
        /\b(cream|tray|pouches|fillets|mackerel|sanitiser|liners|inhalers|salts|fuel|cartridges|harness|sleeping|bags)\b/i.test(
          right
        );

      if (leftEndsWithParen || rightStartsWithQty || knownCompoundNouns) {
        rawParts = ampParts;
      }
    }
  }

  // Parse each segment for leading/trailing quantity multipliers like "4x Spare Butane Cartridges"
  return rawParts.map((part) => {
    // Move any trailing parenthetical shared across a split (e.g. "(1,500 kcal/day)") if needed
    const cleanPart = part.trim();
    const prefixMatch = cleanPart.match(/^(\d+(?:\.\d+)?)\s*[x×]\s+(.+)$/i);
    if (prefixMatch) {
      return {
        quantityMultiplier: Number(prefixMatch[1]),
        name: prefixMatch[2].trim(),
      };
    }
    return {
      quantityMultiplier: null,
      name: cleanPart,
    };
  });
}

/**
 * Infers an appropriate short 1-word unit for a split inventory item segment.
 */
export function inferUnitForSplitSegment(segmentName: string, fallbackUnit: string): string {
  const lower = segmentName.toLowerCase();
  if (/\b(stove|burner)\b/.test(lower) && !/\b(cartridge|butane|propane|fuel|gas\s+can)\b/.test(lower)) {
    return 'stove';
  }
  if (/\b(cartridge|cartridges|butane|propane|fuel|canister|canisters|cans)\b/.test(lower)) {
    return 'cans';
  }
  if (/\b(sleeping\s+bag|rucksack|grab\s+bag|kibble|litter|plastic\s+bag|flood\s+bag)\b/.test(lower)) {
    return 'bags';
  }
  if (/\b(carrier|carriers)\b/.test(lower)) return 'carriers';
  if (/\b(harness|harnesses)\b/.test(lower)) return 'harnesses';
  if (/\b(tray)\b/.test(lower)) return 'tray';
  if (/\b(cream|sudocrem|ointment)\b/.test(lower)) return 'tubs';
  if (/\b(nappies|nappy)\b/.test(lower)) return 'nappies';
  if (/\b(butter|jam|honey)\b/.test(lower)) return 'jars';
  if (/\b(pouch|pouches)\b/.test(lower)) return 'pouches';
  if (/\b(tin|tins|stew|chickpeas|mackerel|tuna|beans)\b/.test(lower)) return 'tins';
  if (/\b(oats|porridge|couscous|bars|wipes)\b/.test(lower)) return 'packs';
  if (/\b(sanitiser|sanitizer|formula|liquid)\b/.test(lower)) return 'bottles';
  if (/\b(liners|bin\s+bags|rolls)\b/.test(lower)) return 'rolls';
  if (/\b(inhaler|inhalers)\b/.test(lower)) return 'inhalers';
  if (/\b(salts|sachets|ration\s+bars)\b/.test(lower)) return 'boxes';
  if (/\b(kit|first\s+aid)\b/.test(lower)) return 'kit';
  if (/\b(power\s+bank|power\s+banks)\b/.test(lower)) return 'banks';
  if (/\b(cable|cables|lead|leads)\b/.test(lower)) return 'cables';
  if (/\b(folder|folio|document)\b/.test(lower)) return 'folio';

  const normalizedFallback = formatShortUnit(fallbackUnit);
  if (normalizedFallback === 'set' || normalizedFallback === 'kit') {
    return 'units';
  }
  return normalizedFallback;
}

/**
 * Infers realistic unit weight (kg) for a split inventory item segment.
 */
function inferWeightForSplitSegment(
  segmentName: string,
  parentWeightKg: number,
  totalSegments: number,
  quantityMultiplier: number | null
): number {
  const lower = segmentName.toLowerCase();
  if (/\b(stove|burner)\b/.test(lower) && !/\b(cartridge|butane|propane|fuel)\b/.test(lower)) {
    return 1.15;
  }
  if (/\b(cartridge|cartridges|butane|propane|fuel)\b/.test(lower)) return 0.25;
  if (/\b(sleeping\s+bag)\b/.test(lower)) return 1.1;
  if (/\b(rucksack|grab\s+bag)\b/.test(lower)) return 0.85;
  if (/\b(carrier)\b/.test(lower)) return 1.4;
  if (/\b(harness)\b/.test(lower)) return 0.15;
  if (/\b(tray)\b/.test(lower)) return 0.35;
  if (/\b(cream|sudocrem)\b/.test(lower)) return 0.125;
  if (/\b(inhaler)\b/.test(lower)) return 0.08;
  if (/\b(rehydration|salts)\b/.test(lower)) return 0.1;
  if (/\b(cable|cables)\b/.test(lower)) return 0.08;
  if (/\b(flood.*bag|plastic.*bag)\b/.test(lower)) return 0.05;

  const divisor = Math.max(1, totalSegments * (quantityMultiplier || 1));
  return Math.max(0.05, Math.round((parentWeightKg / divisor) * 100) / 100);
}

/**
 * Splits a single InventoryItem into distinct, individual InventoryItem entries
 * if its name contains a multi-item description (e.g. "Stove + Fuel" or
 * "Single-Burner Camping Gas Stove + 4x Spare Butane/Propane Cartridges").
 * If the item is already a single item, returns `[item]`.
 */
export function splitMultiInventoryItem(item: InventoryItem): InventoryItem[] {
  const segments = parseMultiItemSegments(item.name);
  if (segments.length <= 1) {
    // Even if single segment, if it had a leading "2x " prefix, normalize its name and baseQty
    if (segments.length === 1 && segments[0].quantityMultiplier !== null) {
      const mult = segments[0].quantityMultiplier;
      const nextBase = item.baseQty === 1 ? mult : item.baseQty;
      return [
        {
          ...item,
          name: segments[0].name,
          baseQty: nextBase,
          unit: inferUnitForSplitSegment(segments[0].name, item.unit),
        },
      ];
    }
    return [item];
  }

  const parentRatio = item.baseQty > 0 ? item.currentQty / item.baseQty : 1;

  return segments.map((seg, idx) => {
    const slug = seg.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24);

    const splitId = `${item.id}-split-${idx + 1}-${slug || idx + 1}`;
    const inferredUnit = inferUnitForSplitSegment(seg.name, item.unit);

    // Determine independent baseQty and currentQty for this split component
    let nextBaseQty = item.baseQty;
    let nextCurrentQty = item.currentQty;

    if (seg.quantityMultiplier !== null && seg.quantityMultiplier > 0) {
      nextBaseQty = seg.quantityMultiplier;
      nextCurrentQty = Math.round(seg.quantityMultiplier * parentRatio);
    } else if (
      item.scalingRule === 'perAdultPerDay' &&
      item.baseQty >= segments.length &&
      segments.length >= 2
    ) {
      // Apportion daily food packs/tins across split items so total daily calories stay balanced
      nextBaseQty = Math.round((item.baseQty / segments.length) * 10) / 10;
      nextCurrentQty = Math.round(item.currentQty / segments.length);
    }

    const nextWeightKg = inferWeightForSplitSegment(
      seg.name,
      item.unitWeightKg,
      segments.length,
      seg.quantityMultiplier
    );

    return {
      ...item,
      id: splitId,
      name: seg.name,
      currentQty: Math.max(0, nextCurrentQty),
      baseQty: Math.max(0.5, nextBaseQty),
      unit: inferredUnit,
      unitWeightKg: nextWeightKg,
      notes: item.notes
        ? `${seg.name} (Split from: ${item.name}) • ${item.notes}`
        : `Independently tracked item (${seg.name})`,
    };
  });
}

/**
 * Parses an entire array of InventoryItems and automatically splits any items
 * containing multi-item descriptions into distinct, individual database entries.
 */
export function normalizeAndSplitInventory(items: InventoryItem[]): {
  items: InventoryItem[];
  splitCount: number;
} {
  const result: InventoryItem[] = [];
  let splitCount = 0;
  const seenIds = new Set<string>();

  for (const item of items) {
    const splitEntries = splitMultiInventoryItem(item);
    if (splitEntries.length > 1) {
      splitCount++;
    }
    for (const entry of splitEntries) {
      let uniqueId = entry.id;
      let counter = 2;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${entry.id}-${counter++}`;
      }
      seenIds.add(uniqueId);
      result.push(uniqueId === entry.id ? entry : { ...entry, id: uniqueId });
    }
  }

  return { items: result, splitCount };
}

export function addStorageLocationInState(
  newLocationName: string,
  locations: StorageLocation[]
): StorageLocation[] {
  const trimmed = newLocationName.trim();
  if (!trimmed) return locations;
  if (locations.some((loc) => loc.toLowerCase() === trimmed.toLowerCase())) {
    return locations;
  }
  return [...locations, trimmed];
}

export function renameStorageLocationInState(
  oldName: StorageLocation,
  newName: StorageLocation,
  locations: StorageLocation[],
  inventory: InventoryItem[],
  powerDevices: PowerDevice[] = []
): {
  locations: StorageLocation[];
  inventory: InventoryItem[];
  powerDevices: PowerDevice[];
} {
  const trimmedNew = newName.trim();
  if (!trimmedNew || trimmedNew === oldName) {
    return { locations, inventory, powerDevices };
  }

  // Avoid duplicate location names if renaming to an existing location
  const nextLocations: StorageLocation[] = [];
  for (const loc of locations) {
    const mapped = loc === oldName ? trimmedNew : loc;
    if (!nextLocations.some((existing) => existing.toLowerCase() === mapped.toLowerCase())) {
      nextLocations.push(mapped);
    }
  }

  const nextInventory = inventory.map((item) =>
    item.storageLocation === oldName ? { ...item, storageLocation: trimmedNew } : item
  );

  const nextPowerDevices = powerDevices.map((dev) =>
    dev.location === oldName ? { ...dev, location: trimmedNew } : dev
  );

  return {
    locations: nextLocations,
    inventory: nextInventory,
    powerDevices: nextPowerDevices,
  };
}

export function removeStorageLocationInState(
  targetLocation: StorageLocation,
  locations: StorageLocation[],
  inventory: InventoryItem[],
  powerDevices: PowerDevice[] = []
): {
  locations: StorageLocation[];
  inventory: InventoryItem[];
  powerDevices: PowerDevice[];
  fallbackLocation: StorageLocation;
} {
  if (locations.length <= 1) {
    return {
      locations,
      inventory,
      powerDevices,
      fallbackLocation: locations[0] || 'Kitchen Pantry',
    };
  }

  const nextLocations = locations.filter((loc) => loc !== targetLocation);
  const fallbackLocation = nextLocations[0] || 'Kitchen Pantry';

  const nextInventory = inventory.map((item) =>
    item.storageLocation === targetLocation
      ? { ...item, storageLocation: fallbackLocation }
      : item
  );

  const nextPowerDevices = powerDevices.map((dev) =>
    dev.location === targetLocation ? { ...dev, location: fallbackLocation } : dev
  );

  return {
    locations: nextLocations,
    inventory: nextInventory,
    powerDevices: nextPowerDevices,
    fallbackLocation,
  };
}

export interface ReadinessTrendStats {
  startScore: number;
  currentScore: number;
  delta30d: number;
  highScore: number;
  lowScore: number;
  daysAtOrAbove80: number;
  pointsTo100: number;
}

function formatShortMonthDay(dateObj: Date): string {
  const m = SHORT_MONTHS[dateObj.getMonth()] || 'Oct';
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${m} ${d}`;
}

/**
 * Generates or synchronizes a 30-day historical readiness score series ending on `referenceDate`.
 * The final day (Day 30 / Today) always reflects the live household readiness score, while the
 * preceding 29 days represent the household's realistic preparedness trajectory.
 */
export function generate30DayReadinessTrend(
  currentOverallScore: number,
  currentWaterScore = currentOverallScore,
  currentFoodScore = currentOverallScore,
  existingHistory?: ReadinessTrendPoint[],
  referenceDate: Date = new Date('2026-10-31T12:00:00Z')
): ReadinessTrendPoint[] {
  const clampedCurrent = Math.max(0, Math.min(100, Math.round(currentOverallScore)));
  const clampedWater = Math.max(0, Math.min(100, Math.round(currentWaterScore)));
  const clampedFood = Math.max(0, Math.min(100, Math.round(currentFoodScore)));

  const baseRef = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0
  );

  const existingByDate = new Map<string, ReadinessTrendPoint>();
  if (Array.isArray(existingHistory)) {
    for (const pt of existingHistory) {
      if (pt && typeof pt.date === 'string') {
        existingByDate.set(pt.date, pt);
      }
    }
  }

  // Deterministic progressive baseline starting ~24 points lower 29 days ago
  const startBaseline = Math.max(18, clampedCurrent - 24);
  const milestoneOffsets: Record<number, string> = {
    0: 'Initial household roster & 72h audit started',
    6: 'Added 5L water drums & purification tablets',
    13: 'Stocked sterile RTF infant formula & nappies',
    20: 'Completed 90-day power bank & torch top-up',
    25: 'Balanced Rucksack #1 & #2 grab-bag weights',
    29: 'Live household readiness status (Today)',
  };

  // Stepwise progression curve across 30 days (index 0 = 29 days ago, index 29 = today)
  const stepDeltas = [
    0, 1, 1, 2, 2, 3, 6, 6, 7, 8,
    9, 9, 10, 14, 14, 15, 15, 16, 17, 17,
    20, 20, 21, 21, 22, 23, 23, 23, 24, 24,
  ];

  const points: ReadinessTrendPoint[] = [];

  for (let i = 0; i < 30; i++) {
    const daysAgo = 29 - i;
    const d = new Date(baseRef);
    d.setDate(baseRef.getDate() - daysAgo);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const label = formatShortMonthDay(d);

    if (i === 29) {
      // Today's data point always reflects live calculated readiness
      points.push({
        date: isoDate,
        label,
        score: clampedCurrent,
        waterScore: clampedWater,
        foodScore: clampedFood,
        milestoneNote: milestoneOffsets[29],
      });
      continue;
    }

    const existing = existingByDate.get(isoDate);
    if (existing) {
      points.push({
        ...existing,
        label: existing.label || label,
        score: Math.max(0, Math.min(100, Math.round(existing.score))),
      });
      continue;
    }

    const totalSpan = clampedCurrent - startBaseline;
    const progressRatio = stepDeltas[i] / 24;
    const historicalScore = Math.max(
      0,
      Math.min(100, Math.round(startBaseline + totalSpan * progressRatio))
    );
    const historicalWater = Math.max(
      0,
      Math.min(100, Math.round(Math.max(15, clampedWater - 26) + 26 * progressRatio))
    );
    const historicalFood = Math.max(
      0,
      Math.min(100, Math.round(Math.max(20, clampedFood - 22) + 22 * progressRatio))
    );

    points.push({
      date: isoDate,
      label,
      score: historicalScore,
      waterScore: historicalWater,
      foodScore: historicalFood,
      milestoneNote: milestoneOffsets[i],
    });
  }

  return points;
}

export function calculateReadinessTrendStats(
  points: ReadinessTrendPoint[]
): ReadinessTrendStats {
  if (!Array.isArray(points) || points.length === 0) {
    return {
      startScore: 0,
      currentScore: 0,
      delta30d: 0,
      highScore: 0,
      lowScore: 0,
      daysAtOrAbove80: 0,
      pointsTo100: 100,
    };
  }

  const scores = points.map((p) => p.score);
  const startScore = scores[0];
  const currentScore = scores[scores.length - 1];
  const delta30d = currentScore - startScore;
  const highScore = Math.max(...scores);
  const lowScore = Math.min(...scores);
  const daysAtOrAbove80 = scores.filter((s) => s >= 80).length;
  const pointsTo100 = Math.max(0, 100 - currentScore);

  return {
    startScore,
    currentScore,
    delta30d,
    highScore,
    lowScore,
    daysAtOrAbove80,
    pointsTo100,
  };
}





