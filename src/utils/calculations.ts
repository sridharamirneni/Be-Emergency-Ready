import {
  HouseholdMember,
  InventoryItem,
  PreparednessTier,
  ScalingRule,
  StorageLocation,
} from '../types';

export const TIER_DAYS: Record<PreparednessTier, number> = {
  tier1_72h: 3, // 72-Hour Baseline (Ireland/UK Standard)
  tier2_10d: 10, // 10-Day Home Pantry + 48h Grab Bag (German BBK Standard)
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
  baseQty: number,
  scalingRule: ScalingRule,
  roster: HouseholdMember[],
  tier: PreparednessTier
): number {
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
  stageLabel: string;
  severity: 'amber' | 'emerald' | 'coral';
  nappyGuidance: string;
  sleepingBagGuidance: string;
  feedingAndTeatGuidance: string;
  clothingLayerGuidance: string;
  nextTransitionAlert: string;
}

export function calculateInfantMilestones(
  infant: HouseholdMember,
  referenceDate: Date = new Date()
): InfantMilestoneAlert {
  const birth = infant.birthDate ? new Date(infant.birthDate + 'T00:00:00') : new Date(referenceDate);
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const diffDays = Math.max(0, Math.round((ref.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)));
  const ageMonths = Math.floor(diffDays / 30.4375);
  const ageWeeks = Math.floor(diffDays / 7);

  if (ageMonths < 2) {
    return {
      infantId: infant.id,
      infantName: infant.name,
      ageMonths,
      ageWeeks,
      stageLabel: `Newborn / ${ageMonths}m (${ageWeeks} wks)`,
      severity: 'amber',
      nappyGuidance: 'Size 1 -> Size 2 (3-6 kg) transition window active. Stock 50% Size 2 in Rucksack #1.',
      sleepingBagGuidance: '0-6m 3.5 TOG winter sleeping bag (check neck opening fit so head cannot slip inside).',
      feedingAndTeatGuidance: '8x 200ml Sterile Ready-to-Feed liquid formula/day + Size 1 Slow-Flow pre-sterilised teats.',
      clothingLayerGuidance: '0-3m thermal merino/cotton vests + 3x sleepsuits sealed in waterproof dry-bag.',
      nextTransitionAlert: 'Upcoming at 8-10 weeks: Upgrade Rucksack #1 spare clothing to 3-6m & Size 2 medium-flow teats.',
    };
  } else if (ageMonths < 6) {
    return {
      infantId: infant.id,
      infantName: infant.name,
      ageMonths,
      ageWeeks,
      stageLabel: `Infant ${ageMonths} Months`,
      severity: 'amber',
      nappyGuidance: 'Upgrade emergency stash to Size 3 (6-10 kg) nappies; rotate out remaining Size 1/2.',
      sleepingBagGuidance: '0-6m 3.5 TOG winter bag active; prepare 6-18m 3.5 TOG bag before month 6.',
      feedingAndTeatGuidance: '8x 200ml Ready-to-Feed bottles/day + Upgrade to Size 2 Medium-Flow pre-sterilised teats.',
      clothingLayerGuidance: 'Replace 0-3m grab-bag layers with 3-6m fleece/thermal layers and warm hat.',
      nextTransitionAlert: 'Upcoming at 6 months: Introduce 6m+ long-life weaning pouches, collapsible spoon & Size 4 nappies.',
    };
  } else {
    return {
      infantId: infant.id,
      infantName: infant.name,
      ageMonths,
      ageWeeks,
      stageLabel: `Weaning Infant ${ageMonths} Months`,
      severity: 'coral',
      nappyGuidance: 'Upgrade to Size 4 / 4+ (9-15 kg) nappies across Rucksack #1 and Home Pantry.',
      sleepingBagGuidance: 'Mandatory upgrade to 6-18m 3.5 TOG winter sleeping bag.',
      feedingAndTeatGuidance: 'Transition from newborn teats to Size 3 Fast-Flow teats + 6m+ organic weaning pouches & sterile water.',
      clothingLayerGuidance: 'Upgrade grab-bag clothing to 6-12m thermal base layers + waterproof outer suit.',
      nextTransitionAlert: 'Verify Infant Paracetamol (120mg/5ml) weight-based syringe dosing & check expiry date.',
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

