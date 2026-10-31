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

test('Dynamic Quantity Scaling Formula matches 10-day Extended Pantry & 72h Irish/UK standards', () => {
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

test('formatShortUnit normalizes units to a single short word and moves package details to tooltip', async () => {
  const { formatShortUnit, describeScalingTooltip } = await import('./calculations');
  assert.equal(formatShortUnit('packs (500g)'), 'packs');
  assert.equal(formatShortUnit('bottles (200ml)'), 'bottles');
  assert.equal(formatShortUnit('tins/pouches'), 'tins');
  assert.equal(formatShortUnit('boxes (2400 kcal)'), 'boxes');
  assert.equal(formatShortUnit('L'), 'L');

  const tooltip = describeScalingTooltip(
    {
      id: 'item-food-oats-grains',
      name: 'Quick-Cook Porridge Oats, Couscous & Nut Butter',
      category: 'Non-Perishable Food',
      currentQty: 14,
      baseQty: 1,
      unit: 'packs',
      scalingRule: 'perAdultPerDay',
      storageLocation: 'Kitchen Pantry',
      unitWeightKg: 0.5,
      notes: '500g packs',
    },
    20,
    defaultRoster,
    'tier2_10d'
  );
  assert.ok(tooltip.includes('Target: 20 packs'));
  assert.ok(tooltip.includes('500g packs'));
});

test('Multi-items are split into separate items and filterInventoryItems filters by name, category, and stock status', async () => {
  const { DEFAULT_INVENTORY } = await import('../data/defaultData');
  const { filterInventoryItems } = await import('./calculations');

  // Verify no combined "+" multi-items remain in DEFAULT_INVENTORY
  const combinedPlusItems = DEFAULT_INVENTORY.filter((item) => item.name.includes(' + '));
  assert.equal(combinedPlusItems.length, 0);

  // Verify Camping Gas Stove and Spare Gas Cartridges are separate distinct items
  const stoveResults = filterInventoryItems(DEFAULT_INVENTORY, defaultRoster, 'tier2_10d', {
    searchQuery: 'Camping Gas Stove',
  });
  assert.equal(stoveResults.length, 1);
  assert.equal(stoveResults[0].name, 'Single-Burner Camping Gas Stove');
  assert.equal(stoveResults[0].stockStatus, 'Stocked');

  const cartridgeResults = filterInventoryItems(DEFAULT_INVENTORY, defaultRoster, 'tier2_10d', {
    searchQuery: 'Butane/Propane Gas Cartridges',
  });
  assert.equal(cartridgeResults.length, 1);
  assert.equal(cartridgeResults[0].name, 'Spare Butane/Propane Gas Cartridges');
  assert.equal(cartridgeResults[0].stockStatus, 'Low Stock');

  // Verify global search by stock status text (e.g. "Low Stock" or "Expired")
  const lowStockSearch = filterInventoryItems(DEFAULT_INVENTORY, defaultRoster, 'tier2_10d', {
    searchQuery: 'Low Stock',
  });
  assert.ok(lowStockSearch.length > 0);
  assert.ok(lowStockSearch.every((item) => item.stockStatus === 'Low Stock'));

  // Verify global search combining keyword and stock status ("Infant Low Stock")
  const infantLowStock = filterInventoryItems(DEFAULT_INVENTORY, defaultRoster, 'tier2_10d', {
    searchQuery: 'Infant Low Stock',
  });
  assert.ok(infantLowStock.length > 0);
  assert.ok(infantLowStock.every((item) => item.stockStatus === 'Low Stock'));
  assert.ok(
    infantLowStock.some((item) => item.name.includes('Sterile Ready-to-Feed Liquid Infant Formula'))
  );

  // Verify stockStatus filter option
  const stockedOnly = filterInventoryItems(DEFAULT_INVENTORY, defaultRoster, 'tier2_10d', {
    stockStatus: 'Stocked',
  });
  assert.ok(stockedOnly.length > 0);
  assert.ok(stockedOnly.every((item) => item.stockStatus === 'Stocked'));
});

test('parseMultiItemSegments and splitMultiInventoryItem automatically split multi-item descriptions into distinct entries', async () => {
  const {
    parseMultiItemSegments,
    splitMultiInventoryItem,
    normalizeAndSplitInventory,
  } = await import('./calculations');

  // 1. "Stove + Fuel" splits into 2 distinct segments
  const stoveFuelSegments = parseMultiItemSegments('Stove + Fuel');
  assert.equal(stoveFuelSegments.length, 2);
  assert.equal(stoveFuelSegments[0].name, 'Stove');
  assert.equal(stoveFuelSegments[1].name, 'Fuel');

  // 2. "Single-Burner Camping Gas Stove + 4x Spare Butane/Propane Cartridges" extracts 4x multiplier
  const stoveCartridgeItem: InventoryItem = {
    id: 'item-heat-stove',
    name: 'Single-Burner Camping Gas Stove + 4x Spare Butane/Propane Cartridges',
    category: 'Light, Warmth & Cooking',
    currentQty: 1,
    baseQty: 1,
    unit: 'set',
    scalingRule: 'fixedHousehold',
    storageLocation: 'Under-Stairs',
    unitWeightKg: 2.2,
    isCritical: true,
  };
  const splitStoveEntries = splitMultiInventoryItem(stoveCartridgeItem);
  assert.equal(splitStoveEntries.length, 2);
  assert.equal(splitStoveEntries[0].name, 'Single-Burner Camping Gas Stove');
  assert.equal(splitStoveEntries[0].baseQty, 1);
  assert.equal(splitStoveEntries[0].currentQty, 1);
  assert.equal(splitStoveEntries[0].unit, 'stove');

  assert.equal(splitStoveEntries[1].name, 'Spare Butane/Propane Cartridges');
  assert.equal(splitStoveEntries[1].baseQty, 4);
  assert.equal(splitStoveEntries[1].currentQty, 4);
  assert.equal(splitStoveEntries[1].unit, 'cans');

  // 3. Comma-separated multi-item list splits into 3 separate items
  const oatsCombo: InventoryItem = {
    id: 'item-food-oats',
    name: 'Quick-Cook Porridge Oats, Couscous & Nut Butter',
    category: 'Non-Perishable Food',
    currentQty: 9,
    baseQty: 3,
    unit: 'packs',
    scalingRule: 'perAdultPerDay',
    storageLocation: 'Kitchen Pantry',
    unitWeightKg: 0.5,
  };
  const splitOats = splitMultiInventoryItem(oatsCombo);
  assert.equal(splitOats.length, 3);
  assert.equal(splitOats[0].name, 'Quick-Cook Porridge Oats');
  assert.equal(splitOats[1].name, 'Couscous');
  assert.equal(splitOats[2].name, 'Nut Butter');

  // 4. Single items with modifier "&" are NOT split
  const singleWater: InventoryItem = {
    id: 'item-water-1',
    name: 'Bottled Drinking & Cooking Water (5L Drums)',
    category: 'Water & Hydration',
    currentQty: 50,
    baseQty: 3,
    unit: 'L',
    scalingRule: 'perAdultPerDay',
    storageLocation: 'Kitchen Pantry',
    unitWeightKg: 1.0,
  };
  const unsplitWater = splitMultiInventoryItem(singleWater);
  assert.equal(unsplitWater.length, 1);
  assert.equal(unsplitWater[0].name, 'Bottled Drinking & Cooking Water (5L Drums)');

  // 5. normalizeAndSplitInventory migrates mixed lists cleanly
  const normalized = normalizeAndSplitInventory([stoveCartridgeItem, singleWater]);
  assert.equal(normalized.splitCount, 1);
  assert.equal(normalized.items.length, 3);
});

test('Storage location helpers add, rename (migrating items & power devices), and remove locations cleanly', async () => {
  const {
    addStorageLocationInState,
    renameStorageLocationInState,
    removeStorageLocationInState,
  } = await import('./calculations');

  const initialLocs = ['Kitchen Pantry', 'Under-Stairs'];
  const afterAdd = addStorageLocationInState('Garage Utility Shelf', initialLocs);
  assert.deepEqual(afterAdd, ['Kitchen Pantry', 'Under-Stairs', 'Garage Utility Shelf']);

  // Duplicate case-insensitive add is ignored
  const afterDup = addStorageLocationInState('kitchen pantry', afterAdd);
  assert.equal(afterDup.length, 3);

  // Rename updates locations, inventory items, and powerDevices
  const sampleInv: InventoryItem[] = [
    {
      id: 'i1',
      name: 'Camping Stove',
      category: 'Light, Warmth & Cooking',
      currentQty: 1,
      baseQty: 1,
      unit: 'stove',
      scalingRule: 'fixedHousehold',
      storageLocation: 'Under-Stairs',
      unitWeightKg: 1.4,
    },
  ];
  const renamedState = renameStorageLocationInState(
    'Under-Stairs',
    'Under-Stairs Cupboard',
    afterAdd,
    sampleInv,
    [
      {
        id: 'p1',
        name: 'Lantern',
        capacityMah: 5000,
        lastChargedDate: '2026-10-01',
        location: 'Under-Stairs',
      },
    ]
  );
  assert.ok(renamedState.locations.includes('Under-Stairs Cupboard'));
  assert.ok(!renamedState.locations.includes('Under-Stairs'));
  assert.equal(renamedState.inventory[0].storageLocation, 'Under-Stairs Cupboard');
  assert.equal(renamedState.powerDevices[0].location, 'Under-Stairs Cupboard');

  // Remove reassigns items at removed location to first remaining location
  const removedState = removeStorageLocationInState(
    'Under-Stairs Cupboard',
    renamedState.locations,
    renamedState.inventory,
    renamedState.powerDevices
  );
  assert.ok(!removedState.locations.includes('Under-Stairs Cupboard'));
  assert.equal(removedState.inventory[0].storageLocation, 'Kitchen Pantry');
  assert.equal(removedState.powerDevices[0].location, 'Kitchen Pantry');
});

test('User authentication, multi-user profile isolation, and household sharing collaboration sync accurately', async () => {
  const {
    createSeededAuthStore,
    registerUserInStore,
    authenticateUserInStore,
    inviteMemberToHouseholdInStore,
    joinHouseholdByCodeInStore,
    updateHouseholdStateInStore,
    updateUserDisplayNameInStore,
    deleteUserAccountInStore,
  } = await import('./authAndSharing');

  let store = createSeededAuthStore();
  assert.equal(store.users.length, 2);
  assert.equal(store.currentUser?.emailOrUsername, 'aoife@beready.ie');
  assert.equal(store.currentUser?.role, 'owner');

  // 1. Register Family B with an isolated household ("create" mode)
  const familyBReg = registerUserInStore(store, {
    name: "Niamh O'Connor",
    emailOrUsername: 'niamh@beready.ie',
    password: 'password123',
    householdMode: 'create',
    householdName: "O'Connor Family (Galway)",
  });
  assert.equal(familyBReg.ok, true);
  if (!familyBReg.ok) return;
  store = familyBReg.store;
  const niamhUser = familyBReg.user;
  assert.equal(niamhUser.role, 'owner');
  assert.notEqual(niamhUser.householdId, 'hh-byrne-maynooth');

  // Modify Niamh's tier to 72h and verify Aoife's Byrne household remains on 10d (strict profile isolation)
  store = updateHouseholdStateInStore(
    store,
    niamhUser.householdId,
    { tier: 'tier1_72h' },
    niamhUser.name
  );
  assert.equal(store.households[niamhUser.householdId].tier, 'tier1_72h');
  assert.equal(store.households['hh-byrne-maynooth'].tier, 'tier2_10d');

  // 2. Authenticate as Aoife and invite Partner 2 / new member
  const authAoife = authenticateUserInStore(store, 'aoife@beready.ie', 'beready123');
  assert.equal(authAoife.ok, true);
  if (!authAoife.ok) return;
  store = authAoife.store;

  const inviteRes = inviteMemberToHouseholdInStore(
    store,
    authAoife.user.id,
    'declan@beready.ie'
  );
  assert.equal(inviteRes.ok, true);
  if (!inviteRes.ok) return;
  store = inviteRes.store;
  assert.equal(inviteRes.invite.shareCode, 'BR-BYRNE-10D');
  assert.equal(inviteRes.invite.status, 'pending');

  // 3. Cian joins Aoife's household using share code BR-BYRNE-10D
  const cianUser = store.users.find((u) => u.emailOrUsername === 'cian@beready.ie')!;
  const joinRes = joinHouseholdByCodeInStore(store, cianUser.id, 'BR-BYRNE-10D');
  assert.equal(joinRes.ok, true);
  if (!joinRes.ok) return;
  store = joinRes.store;
  assert.equal(joinRes.user.householdId, 'hh-byrne-maynooth');
  assert.equal(joinRes.user.role, 'member');

  // 4. Collaborative sync: Cian updates stock in shared household -> Aoife sees the exact same updated state
  const sharedInv = [...store.households['hh-byrne-maynooth'].inventory];
  sharedInv[0] = { ...sharedInv[0], currentQty: 99 };
  store = updateHouseholdStateInStore(
    store,
    joinRes.user.householdId,
    { inventory: sharedInv },
    joinRes.user.name
  );
  const aoifeHousehold = store.households[authAoife.user.householdId];
  assert.equal(aoifeHousehold.inventory[0].currentQty, 99);
  assert.equal(aoifeHousehold.lastModifiedBy, 'Cian Byrne (Partner 2)');

  // 5. Update display name & delete account
  store = updateUserDisplayNameInStore(store, niamhUser.id, 'Niamh B. OConnor');
  assert.equal(
    store.users.find((u) => u.id === niamhUser.id)?.name,
    'Niamh B. OConnor'
  );
  store = deleteUserAccountInStore(store, niamhUser.id);
  assert.equal(store.users.some((u) => u.id === niamhUser.id), false);
});

test('generate30DayReadinessTrend and calculateReadinessTrendStats generate a valid 30-day readiness series synced to live score', async () => {
  const {
    generate30DayReadinessTrend,
    calculateReadinessTrendStats,
  } = await import('./calculations');

  const refDate = new Date('2026-10-31T12:00:00Z');
  const trend88 = generate30DayReadinessTrend(88, 92, 85, undefined, refDate);
  assert.equal(trend88.length, 30);
  assert.equal(trend88[0].date, '2026-10-02');
  assert.equal(trend88[29].date, '2026-10-31');
  assert.equal(trend88[29].score, 88);
  assert.equal(trend88[29].waterScore, 92);
  assert.equal(trend88[29].foodScore, 85);

  // Every point must be clamped within 0..100 and non-decreasing along the default progression
  for (let i = 0; i < trend88.length; i++) {
    assert.ok(trend88[i].score >= 0 && trend88[i].score <= 100);
    if (i > 0) {
      assert.ok(trend88[i].score >= trend88[i - 1].score);
    }
  }

  const stats88 = calculateReadinessTrendStats(trend88);
  assert.equal(stats88.currentScore, 88);
  assert.equal(stats88.startScore, 64);
  assert.equal(stats88.delta30d, 24);
  assert.equal(stats88.pointsTo100, 12);
  assert.ok(stats88.daysAtOrAbove80 > 0);

  // Live update: if user stocks more items and readiness rises to 95%, Day 30 reflects 95% while preserving earlier history
  const trend95 = generate30DayReadinessTrend(95, 98, 94, trend88, refDate);
  assert.equal(trend95[29].score, 95);
  assert.equal(trend95[0].score, 64);
  const stats95 = calculateReadinessTrendStats(trend95);
  assert.equal(stats95.currentScore, 95);
  assert.equal(stats95.delta30d, 31);
  assert.equal(stats95.pointsTo100, 5);
});

test('Shopping List View filters strictly by (currentQty < targetQty) and includes all needed items regardless of storage location assignment', async () => {
  const { filterInventoryItems } = await import('./calculations');

  const mixedLocationItems: InventoryItem[] = [
    {
      id: 'item-pantry-low',
      name: 'Oats & Grains',
      category: 'Non-Perishable Food',
      currentQty: 5,
      baseQty: 10,
      unit: 'packs',
      scalingRule: 'fixedHousehold',
      storageLocation: 'Kitchen Pantry',
      unitWeightKg: 0.5,
    },
    {
      id: 'item-pantry-full',
      name: 'Tinned Beans',
      category: 'Non-Perishable Food',
      currentQty: 10,
      baseQty: 10,
      unit: 'tins',
      scalingRule: 'fixedHousehold',
      storageLocation: 'Kitchen Pantry',
      unitWeightKg: 0.4,
    },
    {
      id: 'item-stairs-missing',
      name: 'Spare Propane Cartridges',
      category: 'Light, Warmth & Cooking',
      currentQty: 0,
      baseQty: 4,
      unit: 'cans',
      scalingRule: 'fixedHousehold',
      storageLocation: 'Under Stairs',
      unitWeightKg: 0.3,
    },
    {
      id: 'item-bag1-low',
      name: 'Sterile Infant RTF Formula',
      category: 'Infant Care (Critical)',
      currentQty: 10,
      baseQty: 24,
      unit: 'bottles',
      scalingRule: 'fixedHousehold',
      storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
      unitWeightKg: 0.22,
    },
    {
      id: 'item-bag2-low',
      name: 'Cat Wet Pouches',
      category: 'Pet Supplies',
      currentQty: 4,
      baseQty: 10,
      unit: 'pouches',
      scalingRule: 'fixedHousehold',
      storageLocation: 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
      unitWeightKg: 0.1,
    },
    {
      id: 'item-garage-low',
      name: 'Heavy Duty Bin Liners',
      category: 'Medical & Hygiene',
      currentQty: 1,
      baseQty: 2,
      unit: 'rolls',
      scalingRule: 'fixedHousehold',
      storageLocation: 'Garage Utility Shelf',
      unitWeightKg: 0.4,
    },
  ];

  // Even if options specifies a location like "Rucksack #1", in shoppingMode ALL items with currentQty < targetQty
  // across Kitchen Pantry, Under Stairs, Rucksack #1, Rucksack #2, and Garage must be returned
  const shoppingList = filterInventoryItems(mixedLocationItems, defaultRoster, 'tier2_10d', {
    shoppingMode: true,
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    stockStatus: 'Low Stock',
  });

  // Exactly 5 items have currentQty < targetQty:
  // Oats (5/10), Propane (0/4), Formula (10/24), Cat Food (4/10), Bin Liners (1/2)
  assert.equal(shoppingList.length, 5);
  assert.ok(shoppingList.some((i) => i.id === 'item-pantry-low'));
  assert.ok(shoppingList.some((i) => i.id === 'item-stairs-missing'));
  assert.ok(shoppingList.some((i) => i.id === 'item-bag1-low'));
  assert.ok(shoppingList.some((i) => i.id === 'item-bag2-low'));
  assert.ok(shoppingList.some((i) => i.id === 'item-garage-low'));

  // Fully stocked item (Tinned Beans 10/10) must NEVER be included in shopping list
  assert.ok(!shoppingList.some((i) => i.id === 'item-pantry-full'));

  // Category filter within shopping mode filters accurately across all locations
  const foodOnlyShopping = filterInventoryItems(mixedLocationItems, defaultRoster, 'tier2_10d', {
    shoppingMode: true,
    category: 'Non-Perishable Food',
  });
  assert.equal(foodOnlyShopping.length, 1);
  assert.equal(foodOnlyShopping[0].id, 'item-pantry-low');
});

test('hide or show infant and pet items dynamically based on household members', async () => {
  const {
    isInfantItem,
    isPetItem,
    isItemApplicableToHousehold,
    enrichInventoryItems,
    filterInventoryItems,
    calculateHouseholdReadiness,
  } = await import('./calculations');

  const infantItem: InventoryItem = {
    id: 'item-infant-formula',
    name: 'Sterile Ready-to-Feed Liquid Infant Formula (200ml)',
    category: 'Infant Care (Critical)',
    currentQty: 10,
    baseQty: 8,
    unit: 'bottles',
    scalingRule: 'perInfantPerDay',
    storageLocation: 'Kitchen Pantry',
    unitWeightKg: 0.22,
  };

  const petItem: InventoryItem = {
    id: 'item-pet-wet-food',
    name: 'Complete Wet Cat Food Pouches',
    category: 'Pet Supplies',
    currentQty: 5,
    baseQty: 2,
    unit: 'pouches',
    scalingRule: 'perPetPerDay',
    storageLocation: 'Under Stairs',
    unitWeightKg: 0.085,
  };

  const generalItem: InventoryItem = {
    id: 'item-water-human',
    name: 'Bottled Drinking Water (5L Drums)',
    category: 'Water & Hydration',
    currentQty: 40,
    baseQty: 3,
    unit: 'L',
    scalingRule: 'humanWaterComposite',
    storageLocation: 'Under Stairs',
    unitWeightKg: 1.0,
  };

  // 1. Detection verification
  assert.equal(isInfantItem(infantItem), true);
  assert.equal(isInfantItem(petItem), false);
  assert.equal(isInfantItem(generalItem), false);

  assert.equal(isPetItem(petItem), true);
  assert.equal(isPetItem(infantItem), false);
  assert.equal(isPetItem(generalItem), false);

  const adultsOnlyRoster: HouseholdMember[] = [
    { id: 'a1', type: 'adult', name: 'Aoife' },
    { id: 'a2', type: 'adult', name: 'Cian' },
  ];

  const fullFamilyRoster: HouseholdMember[] = [
    { id: 'a1', type: 'adult', name: 'Aoife' },
    { id: 'a2', type: 'adult', name: 'Cian' },
    { id: 'i1', type: 'infant', name: 'Baby Liam', birthDate: '2026-09-01' },
    { id: 'p1', type: 'pet', name: 'Whiskers', species: 'Cat' },
  ];

  // 2. Household applicability verification
  // In adults-only household (0 infants, 0 pets):
  assert.equal(isItemApplicableToHousehold(infantItem, adultsOnlyRoster), false);
  assert.equal(isItemApplicableToHousehold(petItem, adultsOnlyRoster), false);
  assert.equal(isItemApplicableToHousehold(generalItem, adultsOnlyRoster), true);

  // In full family household (1 infant, 1 pet):
  assert.equal(isItemApplicableToHousehold(infantItem, fullFamilyRoster), true);
  assert.equal(isItemApplicableToHousehold(petItem, fullFamilyRoster), true);
  assert.equal(isItemApplicableToHousehold(generalItem, fullFamilyRoster), true);

  // 3. enrichInventoryItems verification
  const testInventory = [infantItem, petItem, generalItem];
  const enrichedAdultsOnly = enrichInventoryItems(testInventory, adultsOnlyRoster, 'tier2_10d');
  assert.equal(enrichedAdultsOnly.length, 1);
  assert.equal(enrichedAdultsOnly[0].id, 'item-water-human');

  const enrichedFullFamily = enrichInventoryItems(testInventory, fullFamilyRoster, 'tier2_10d');
  assert.equal(enrichedFullFamily.length, 3);
  assert.ok(enrichedFullFamily.some((i) => i.id === 'item-infant-formula'));
  assert.ok(enrichedFullFamily.some((i) => i.id === 'item-pet-wet-food'));
  assert.ok(enrichedFullFamily.some((i) => i.id === 'item-water-human'));

  // 4. Shopping Mode verification: infant and pet supplies are omitted when members are absent
  const shoppingAdultsOnly = filterInventoryItems(testInventory, adultsOnlyRoster, 'tier2_10d', {
    shoppingMode: true,
  });
  // Water is 40/60 -> needs restock. Formula (10/0) and Pet food (5/0) are hidden completely!
  assert.equal(shoppingAdultsOnly.length, 1);
  assert.equal(shoppingAdultsOnly[0].id, 'item-water-human');

  // In full family: formula is 10/80 and pet wet food is 5/20 -> both appear in shopping list!
  const shoppingFullFamily = filterInventoryItems(testInventory, fullFamilyRoster, 'tier2_10d', {
    shoppingMode: true,
  });
  assert.equal(shoppingFullFamily.length, 3);

  // 5. Readiness score verification: adults-only score is not penalized by infant or pet items
  const readinessAdults = calculateHouseholdReadiness(testInventory, adultsOnlyRoster, 'tier2_10d');
  assert.equal(readinessAdults.totalActiveItemsCount, 1); // Only water
});




