import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHouseholdScalingSummary,
  calculateTargetQuantity,
  calculateRucksackWeight,
  evaluateRucksackWeightStatus,
  getItemExpiryStatus,
  calculatePowerCadence,
  calculateInfantMilestones,
  generateExpiryIcs,
} from './calculations';
import { HouseholdMember, InventoryItem } from '../types';

const defaultRoster: HouseholdMember[] = [
  { id: 'a1', type: 'adult', name: 'Aoife (Parent 1)', medicalNotes: 'Asthma preventer inhaler' },
  { id: 'a2', type: 'adult', name: 'Cian (Parent 2)', medicalNotes: 'None' },
  { id: 'i1', type: 'infant', name: 'Fionn', birthDate: '2026-09-30' },
  { id: 'p1', type: 'pet', name: 'Bram', species: 'Cat', microchipNumber: '972274000481920' },
  { id: 'p2', type: 'pet', name: 'Macha', species: 'Cat', microchipNumber: '972274000481921' },
];

test('Dynamic Quantity Scaling Formula matches 10-day German BBK & 72h Irish/UK standards', () => {
  // 2 adults + 2 cats for 10 days = 60L human drinking/cooking water + 10L pet water (+ 10L infant hygiene water)
  const tier2Summary = calculateHouseholdScalingSummary(defaultRoster, 'tier2_10d');
  assert.equal(tier2Summary.days, 10);
  assert.equal(tier2Summary.adultWaterLiters, 60);
  assert.equal(tier2Summary.humanDrinkingCookingWaterLiters, 60);
  assert.equal(tier2Summary.infantWaterLiters, 10);
  assert.equal(tier2Summary.petWaterLiters, 10);
  assert.equal(tier2Summary.infantFormulaBottles, 80); // 8 bottles/day * 10 days
  assert.equal(tier2Summary.infantNappies, 100); // 10 nappies/day * 10 days
  assert.equal(tier2Summary.petCarriers, 2);

  // Tier 1 (72-Hour Baseline = 3 days)
  const tier1Summary = calculateHouseholdScalingSummary(defaultRoster, 'tier1_72h');
  assert.equal(tier1Summary.days, 3);
  assert.equal(tier1Summary.adultWaterLiters, 18); // 2 adults * 3L * 3 days
  assert.equal(tier1Summary.petWaterLiters, 3); // 2 cats * 0.5L * 3 days
  assert.equal(tier1Summary.infantFormulaBottles, 24); // 8 * 3 days
});

test('Adding a child dynamically updates water, food kcal, and grab bag quantities', () => {
  const rosterWithChild: HouseholdMember[] = [
    ...defaultRoster,
    { id: 'c1', type: 'child', name: 'Saoirse', ageYears: 6, weightKg: 21 },
  ];
  const summary = calculateHouseholdScalingSummary(rosterWithChild, 'tier2_10d');
  assert.equal(summary.childWaterLiters, 20); // 2L/day * 10 days
  assert.equal(summary.humanDrinkingCookingWaterLiters, 80); // 60L adult + 20L child
  assert.equal(summary.childKcalTotal, 15000); // 1500 kcal * 10 days
  assert.equal(summary.humanGrabBags, 3); // 2 adults + 1 child
});

test('Grab-Bag Weight Calculator evaluates thresholds (>10kg amber, >12kg coral red)', () => {
  assert.equal(evaluateRucksackWeightStatus(8.5), 'good');
  assert.equal(evaluateRucksackWeightStatus(10.0), 'good');
  assert.equal(evaluateRucksackWeightStatus(10.5), 'warning');
  assert.equal(evaluateRucksackWeightStatus(12.0), 'warning');
  assert.equal(evaluateRucksackWeightStatus(12.4), 'critical');

  const sampleItems: InventoryItem[] = [
    {
      id: '1',
      name: 'Sterile RTF Formula',
      category: 'Infant Care (Critical)',
      currentQty: 24,
      baseQty: 8,
      unit: 'bottles (200ml)',
      scalingRule: 'perInfantPerDay',
      storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
      unitWeightKg: 0.22,
    },
    {
      id: '2',
      name: 'First Aid & Docs',
      category: 'Medical & Hygiene',
      currentQty: 1,
      baseQty: 1,
      unit: 'kit',
      scalingRule: 'fixedHousehold',
      storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
      unitWeightKg: 5.5,
    },
  ];

  const report = calculateRucksackWeight(
    sampleItems,
    'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    defaultRoster,
    'tier1_72h'
  );
  // 24 * 0.22 = 5.28 + 5.5 = 10.78 kg -> warning (>10kg)
  assert.equal(report.currentWeightKg, 10.78);
  assert.equal(report.status, 'warning');
});

test('FIFO Expiry Status and 90-Day Power Cadence calculate accurately', () => {
  const refDate = new Date('2026-10-31T12:00:00Z');
  assert.equal(getItemExpiryStatus('2026-10-15', refDate), 'expired');
  assert.equal(getItemExpiryStatus('2026-11-15', refDate), 'expiring_soon');
  assert.equal(getItemExpiryStatus('2027-06-01', refDate), 'good');
  assert.equal(getItemExpiryStatus(undefined, refDate), 'non_perishable');

  const powerFresh = calculatePowerCadence('2026-10-21', refDate);
  assert.equal(powerFresh.daysSinceCharged, 10);
  assert.equal(powerFresh.daysRemaining, 80);
  assert.equal(powerFresh.status, 'good');

  const powerOverdue = calculatePowerCadence('2026-07-01', refDate);
  assert.equal(powerOverdue.daysRemaining, 0);
  assert.equal(powerOverdue.status, 'expired');
});

test('Infant Milestone Calculator & iCalendar .ics Generator work properly', () => {
  const refDate = new Date('2026-10-31T12:00:00Z');
  const infant = defaultRoster.find((m) => m.type === 'infant')!;
  const milestone = calculateInfantMilestones(infant, refDate);
  assert.equal(milestone.ageMonths, 1);
  assert.ok(milestone.nappyGuidance.includes('Size 2'));

  const ics = generateExpiryIcs(
    [
      {
        id: 'test-item',
        name: 'Tinned Chickpeas',
        category: 'Non-Perishable Food',
        currentQty: 12,
        baseQty: 2,
        unit: 'tins',
        scalingRule: 'perAdultPerDay',
        storageLocation: 'Kitchen Pantry',
        unitWeightKg: 0.4,
        expiryDate: '2026-11-20',
      },
    ],
    refDate
  );
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('SUMMARY:Rotate Emergency Stock: Tinned Chickpeas'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261021')); // 30 days before 2026-11-20
});

test('Met Eireann wind/gust thresholds accurately classify Status Yellow, Orange, and Red warnings', async () => {
  const { deriveWarningLevelFromMetrics, formatCountdownMmSs } = await import('./calculations');
  assert.equal(deriveWarningLevelFromMetrics(24, 42, 0.5), 'none');
  assert.equal(deriveWarningLevelFromMetrics(55, 95, 2.0), 'yellow');
  assert.equal(deriveWarningLevelFromMetrics(70, 118, 8.0), 'orange');
  assert.equal(deriveWarningLevelFromMetrics(88, 142, 18.0), 'red');
  assert.equal(formatCountdownMmSs(3600), '60:00');
  assert.equal(formatCountdownMmSs(3545), '59:05');
});

test('Barcode catalog lookup suggests accurate average unit weight and standard shelf life expiry', async () => {
  const { lookupBarcodeItem, calculateSuggestedExpiryFromShelfLife } = await import(
    './barcodeCatalog'
  );
  const refDate = new Date('2026-10-31T12:00:00Z');

  // Heinz / Bachelor's Tinned Pulses (EAN 5000157024671): 0.45 kg average weight, 730 days (24m) shelf life
  const tinned = lookupBarcodeItem('5000157024671', refDate);
  assert.equal(tinned.averageUnitWeightKg, 0.45);
  assert.equal(tinned.standardShelfLifeDays, 730);
  assert.equal(tinned.suggestedExpiryDate, '2028-10-30');

  // Sterile RTF Infant Formula (EAN 8712400112345): 0.22 kg average weight, 270 days (9m) shelf life
  const formula = lookupBarcodeItem('8712400112345', refDate);
  assert.equal(formula.averageUnitWeightKg, 0.22);
  assert.equal(formula.standardShelfLifeDays, 270);
  assert.equal(formula.category, 'Infant Care (Critical)');

  // Custom unknown barcode falls back to 0.4 kg and 365 days shelf life
  const custom = lookupBarcodeItem('9991234567890', refDate);
  assert.equal(custom.averageUnitWeightKg, 0.4);
  assert.equal(custom.standardShelfLifeDays, 365);
  assert.equal(calculateSuggestedExpiryFromShelfLife(30, refDate), '2026-11-30');
});


