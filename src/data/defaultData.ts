import {
  HouseholdMember,
  InventoryItem,
  PowerDevice,
  StormChecklistItem,
  IrishHouseholdPlan,
  MetEireannWeatherState,
} from '../types';

function offsetDateIso(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const DEFAULT_ROSTER: HouseholdMember[] = [
  {
    id: 'member-adult-1',
    type: 'adult',
    name: 'Aoife Byrne (Parent 1)',
    medicalNotes: 'Salbutamol & Beclometasone inhalers (keep spare in Rucksack #1)',
  },
  {
    id: 'member-adult-2',
    type: 'adult',
    name: 'Cian Byrne (Parent 2)',
    medicalNotes: 'Corrective glasses (-2.50 D spare pair in Rucksack #2)',
  },
  {
    id: 'member-infant-1',
    type: 'infant',
    name: 'Fionn Byrne',
    birthDate: offsetDateIso(-36), // 1 month old (5 weeks)
  },
  {
    id: 'member-pet-1',
    type: 'pet',
    name: 'Bram',
    species: 'Cat',
    microchipNumber: '972274000841209',
  },
  {
    id: 'member-pet-2',
    type: 'pet',
    name: 'Macha',
    species: 'Cat',
    microchipNumber: '972274000841210',
  },
];

export const DEFAULT_INVENTORY: InventoryItem[] = [
  // 1. Water & Hydration
  {
    id: 'item-water-human',
    name: 'Bottled Drinking & Cooking Water (5L Drums)',
    category: 'Water & Hydration',
    currentQty: 45,
    baseQty: 3, // Handled by humanWaterComposite (3L/adult + 2L/child)
    unit: 'L',
    scalingRule: 'humanWaterComposite',
    storageLocation: 'Under Stairs',
    unitWeightKg: 1.0,
    expiryDate: offsetDateIso(240),
    isCritical: true,
    notes: '2.5L drinking + 0.5L cooking per adult/day',
  },
  {
    id: 'item-water-infant',
    name: 'Infant Hygiene & Washing Water',
    category: 'Water & Hydration',
    currentQty: 8,
    baseQty: 1, // 1L/day per Infant
    unit: 'L',
    scalingRule: 'perInfantPerDay',
    storageLocation: 'Kitchen Pantry',
    unitWeightKg: 1.0,
    expiryDate: offsetDateIso(180),
    isCritical: true,
    notes: '1L/day per infant for washing & bottle prep surface hygiene',
  },
  {
    id: 'item-water-pet',
    name: 'Dedicated Pet Drinking Water',
    category: 'Water & Hydration',
    currentQty: 10,
    baseQty: 0.5, // 0.5L/day per Pet
    unit: 'L',
    scalingRule: 'perPetPerDay',
    storageLocation: 'Under Stairs',
    unitWeightKg: 1.0,
    expiryDate: offsetDateIso(210),
    isCritical: true,
    notes: '0.5L/day per pet (2 cats x 10 days = 10L)',
  },

  // 2. Non-Perishable Food
  {
    id: 'item-food-tinned-meals',
    name: 'Tinned Lentil Stew, Chickpeas & Mackerel Fillets',
    category: 'Non-Perishable Food',
    currentQty: 56,
    baseQty: 4, // 4 tins/pouches per adult/day (~2,200 kcal)
    unit: 'tins/pouches',
    scalingRule: 'perAdultPerDay',
    storageLocation: 'Kitchen Pantry',
    unitWeightKg: 0.4,
    expiryDate: offsetDateIso(18), // Expiring <30 days -> Rotate Soon!
    isCritical: true,
    notes: '2,200 kcal/day adult baseline; ready-to-eat cold or heated in 4 mins',
  },
  {
    id: 'item-food-oats-grains',
    name: 'Quick-Cook Porridge Oats, Couscous & Nut Butter',
    category: 'Non-Perishable Food',
    currentQty: 14,
    baseQty: 1,
    unit: 'packs (500g)',
    scalingRule: 'perAdultPerDay',
    storageLocation: 'Kitchen Pantry',
    unitWeightKg: 0.5,
    expiryDate: offsetDateIso(14), // Expiring <30 days -> Rotate Soon!
    isCritical: false,
    notes: 'Couscous hydrates with minimal boiling water in 3 minutes on camping stove',
  },
  {
    id: 'item-food-child-rations',
    name: 'Child High-Energy Oat Bars & Fruit Pouches (1,500 kcal/day)',
    category: 'Non-Perishable Food',
    currentQty: 0,
    baseQty: 3, // 3 ration packs per child/day (0 when no child in roster)
    unit: 'packs',
    scalingRule: 'perChildPerDay',
    storageLocation: 'Kitchen Pantry',
    unitWeightKg: 0.3,
    expiryDate: offsetDateIso(120),
    isCritical: false,
    notes: 'Auto-scales when a Child (1-12 yrs) is added to Household Roster',
  },
  {
    id: 'item-food-grab-bars',
    name: 'High-Calorie Emergency Ration Bars (48h Grab Bag)',
    category: 'Non-Perishable Food',
    currentQty: 4,
    baseQty: 2,
    unit: 'boxes (2400 kcal)',
    scalingRule: 'perHumanFixed',
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    unitWeightKg: 0.52,
    expiryDate: offsetDateIso(-9), // Expired -> Coral Red alert!
    isCritical: true,
    notes: 'Compact 48h rations in Rucksack #1',
  },

  // 3. Infant Care (Critical)
  {
    id: 'item-infant-formula',
    name: 'Sterile Ready-to-Feed Liquid Infant Formula (200ml)',
    category: 'Infant Care (Critical)',
    currentQty: 64,
    baseQty: 8, // 8x 200ml bottles/day per Infant
    unit: 'bottles (200ml)',
    scalingRule: 'perInfantPerDay',
    storageLocation: 'Kitchen Pantry',
    unitWeightKg: 0.22,
    expiryDate: offsetDateIso(22), // Expiring <30 days!
    isCritical: true,
    notes: 'CRITICAL: Requires zero water or boiling during power/water outage',
  },
  {
    id: 'item-infant-teats',
    name: 'Pre-Sterilised Single-Use Teats (Size 1 Slow-Flow)',
    category: 'Infant Care (Critical)',
    currentQty: 70,
    baseQty: 8, // 8 teats/day per Infant
    unit: 'sterile teats',
    scalingRule: 'perInfantPerDay',
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    unitWeightKg: 0.015,
    expiryDate: offsetDateIso(320),
    isCritical: true,
    notes: 'Screw directly onto 200ml RTF bottles; no steam steriliser needed',
  },
  {
    id: 'item-infant-sleeping-bag',
    name: '3.5 TOG Winter Baby Sleeping Bag (Long-Sleeved)',
    category: 'Infant Care (Critical)',
    currentQty: 1,
    baseQty: 1, // 1 per Infant
    unit: 'bag',
    scalingRule: 'perInfantFixed',
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    unitWeightKg: 0.65,
    isCritical: true,
    notes: 'Rated for unheated rooms (10-14°C) during winter grid blackouts',
  },
  {
    id: 'item-infant-nappies',
    name: 'Infant Nappies (Size 1/2) & Zinc Barrier Cream',
    category: 'Infant Care (Critical)',
    currentQty: 85,
    baseQty: 10, // 10 nappies/day per Infant
    unit: 'nappies',
    scalingRule: 'perInfantPerDay',
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    unitWeightKg: 0.035,
    isCritical: true,
    notes: '10 nappies/day per infant + 2 tubs Sudocrem barrier cream',
  },

  // 4. Pet Supplies
  {
    id: 'item-pet-wet-food',
    name: 'Complete Wet Cat Food Pouches/Tins + Dry Kibble',
    category: 'Pet Supplies',
    currentQty: 32,
    baseQty: 2, // 2 pouches/tins per pet/day
    unit: 'pouches + 30g dry',
    scalingRule: 'perPetPerDay',
    storageLocation: 'Under Stairs',
    unitWeightKg: 0.12,
    expiryDate: offsetDateIso(19), // Expiring <30 days!
    isCritical: true,
    notes: 'High-moisture wet pouches keep cats hydrated when stressed',
  },
  {
    id: 'item-pet-carriers',
    name: 'Separate Hard/Structured Pet Carrier + Escape-Proof Harness',
    category: 'Pet Supplies',
    currentQty: 2,
    baseQty: 1, // 1 per Pet
    unit: 'carrier + harness',
    scalingRule: 'perPetFixed',
    storageLocation: 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
    unitWeightKg: 1.85,
    isCritical: true,
    notes: 'Keep unstacked under stairs; microchip tag & ID collar inside each',
  },
  {
    id: 'item-pet-litter',
    name: 'Lightweight Clumping Cat Litter & Collapsible Tray',
    category: 'Pet Supplies',
    currentQty: 2,
    baseQty: 2,
    unit: 'bags (5L)',
    scalingRule: 'fixedHousehold',
    storageLocation: 'Under Stairs',
    unitWeightKg: 2.2,
    isCritical: false,
    notes: 'Essential for indoor shelter-in-place during Status Red storms',
  },

  // 5. Medical & Hygiene
  {
    id: 'item-med-firstaid',
    name: 'DIN 13164 First Aid Kit, Prescription Inhalers & Rehydration Salts',
    category: 'Medical & Hygiene',
    currentQty: 1,
    baseQty: 1,
    unit: 'complete kit',
    scalingRule: 'fixedHousehold',
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    unitWeightKg: 1.4,
    expiryDate: offsetDateIso(-5), // Expired -> triggers alert to check sterile dressings/saline
    isCritical: true,
    notes: 'Includes spare Salbutamol inhaler, digital thermometer, infant paracetamol',
  },
  {
    id: 'item-med-wipes',
    name: 'Fragrance-Free Wet Wipes, 70% Alcohol Sanitiser & Heavy Bin Liners',
    category: 'Medical & Hygiene',
    currentQty: 6,
    baseQty: 6,
    unit: 'multipacks',
    scalingRule: 'fixedHousehold',
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    unitWeightKg: 0.45,
    expiryDate: offsetDateIso(400),
    isCritical: true,
    notes: 'Waterless personal hygiene when Uisce Eireann mains supply drops',
  },

  // 6. Light, Warmth & Cooking
  {
    id: 'item-warmth-grab-bags',
    name: '48-Hour Grab Bag Rucksack + 3-Season Sleeping Bag',
    category: 'Light, Warmth & Cooking',
    currentQty: 2,
    baseQty: 1, // 1 per Adult/Child
    unit: 'set',
    scalingRule: 'perHumanFixed',
    storageLocation: 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
    unitWeightKg: 1.95,
    isCritical: true,
    notes: '1x 48-hour Grab Bag + Sleeping Bag per Adult/Child',
  },
  {
    id: 'item-cooking-stove',
    name: 'Single-Burner Camping Gas Stove + 4x Spare Butane/Propane Cartridges',
    category: 'Light, Warmth & Cooking',
    currentQty: 1,
    baseQty: 1,
    unit: 'stove + 4 gas',
    scalingRule: 'fixedHousehold',
    storageLocation: 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
    unitWeightKg: 2.35,
    isCritical: true,
    notes: 'Use ONLY near open window; includes CO alarm next to cooking surface',
  },

  // 7. Comms, Power & Cash
  {
    id: 'item-comms-radio',
    name: 'Wind-Up / Solar FM Emergency Radio (RTÉ Radio 1 88.2–90.0 FM)',
    category: 'Comms, Power & Cash',
    currentQty: 1,
    baseQty: 1,
    unit: 'radio',
    scalingRule: 'fixedHousehold',
    storageLocation: 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
    unitWeightKg: 0.48,
    isCritical: true,
    notes: 'Pre-tuned to RTÉ Radio 1 (88.5 FM) & Kfm (97.6 FM)',
  },
  {
    id: 'item-comms-powerbanks',
    name: '2x 20,000mAh USB-C PD Portable Power Banks + Multi-Cables',
    category: 'Comms, Power & Cash',
    currentQty: 2,
    baseQty: 2,
    unit: 'power banks',
    scalingRule: 'fixedHousehold',
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    unitWeightKg: 0.42,
    isCritical: true,
    notes: 'Tracked on 90-Day Power Cadence; keep stored at 80-100% charge',
  },
  {
    id: 'item-comms-cash',
    name: 'Emergency Cash Reserve in Small Notes (€5, €10, €20) & Coins',
    category: 'Comms, Power & Cash',
    currentQty: 250,
    baseQty: 300,
    unit: 'EUR (€)',
    scalingRule: 'fixedHousehold',
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    unitWeightKg: 0.1,
    isCritical: true,
    notes: 'Card terminals & ATMs fail during regional ESB/telecoms blackouts',
  },

  // 8. Documents (Dokumentenmappe)
  {
    id: 'item-docs-folder',
    name: 'Fireproof/Waterproof Dokumentenmappe + Heavy-Duty Flood Plastic Bags',
    category: 'Documents (Dokumentenmappe)',
    currentQty: 1,
    baseQty: 1,
    unit: 'sealed folio',
    scalingRule: 'fixedHousehold',
    storageLocation: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    unitWeightKg: 0.75,
    isCritical: true,
    notes: 'Passports, Fionn Birth Cert, House Insurance, Pet Vaccination & Microchip Certs, Printed Irish Action Plan',
  },
];

export const DEFAULT_POWER_DEVICES: PowerDevice[] = [
  {
    id: 'pwr-bank-1',
    name: 'Anker 20,000mAh USB-C PD Power Bank #1 (Baby & Comms Bag)',
    deviceType: 'Power Bank',
    capacityOrSpecs: '20,000 mAh / 65W USB-C PD',
    lastChargedDate: offsetDateIso(-78), // 12 days remaining -> Amber warning!
    location: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
  },
  {
    id: 'pwr-torch-1',
    name: 'Fenix USB-C Rechargeable Headlamp + 2x Hand Torches',
    deviceType: 'Torch / Headlamp',
    capacityOrSpecs: '18650 Li-Ion 3400mAh (Red-light night mode)',
    lastChargedDate: offsetDateIso(-94), // Overdue -> 0 days remaining!
    location: 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
  },
  {
    id: 'pwr-radio-1',
    name: 'Midland Hand-Crank / Solar FM Emergency Radio (RTÉ 88.5 FM)',
    deviceType: 'Wind-up / Battery FM Radio',
    capacityOrSpecs: '2,600 mAh Internal Li-Ion + AAA Backup',
    lastChargedDate: offsetDateIso(-19), // 71 days remaining -> Good!
    location: 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
  },
];

export const DEFAULT_STORM_CHECKLIST: StormChecklistItem[] = [
  {
    id: 'storm-1',
    label: 'Charge all power banks and mobile phones to 100%.',
    detail: 'Plug in both 20,000mAh power banks, rechargeable headlamps, and enable Low Power Mode on phones.',
    completed: false,
  },
  {
    id: 'storm-2',
    label: 'Fill bathtubs and spare containers with backup tap water.',
    detail: 'Uisce Éireann treatment plants may lose pumping pressure during ESB outages. Fill bath for toilet flushing & collapsible jerrycans for drinking.',
    completed: false,
  },
  {
    id: 'storm-3',
    label: 'Turn fridge and freezer to coldest settings.',
    detail: 'Activate SuperCool / SuperFreeze(-24°C) now to maximize thermal inertia before grid lines trip.',
    completed: false,
  },
  {
    id: 'storm-4',
    label: 'Check torches, spare batteries, and wind-up radio.',
    detail: 'Place headlamps at bedside and kitchen; verify RTÉ Radio 1 (88.2–90.0 FM) reception.',
    completed: false,
  },
  {
    id: 'storm-5',
    label: 'Bring outdoor furniture/bins inside and unstack pet carriers for rapid access.',
    detail: 'Lock cat flaps immediately so Bram & Macha are safely indoors; place both hard carriers open with blankets.',
    completed: false,
  },
];

export const DEFAULT_IRISH_PLAN: IrishHouseholdPlan = {
  eircode: 'W23 F8K2',
  homeAddress: '14 Oaklawn Park, Naas, Co. Kildare',
  mprn: '10304829174',
  gprn: '4829103',
  wprn: '9104827361',
  gpAndOutOfHours: 'Naas Medical Practice (045 876 543) / KDOC Out-of-Hours (045 848 701)',
  vetClinic: 'Cottage Vet Clinic Newbridge (045 434 882) - 24h Emergency Line',
  utilities: {
    electricity: {
      location: 'Hallway Utility Cupboard (Eye-Level White Metal Consumer Unit)',
      steps: [
        'Flip Main Fuse Board red isolator switch (100A DP) to OFF position.',
        'Unplug high-draw heat appliances (immersion, electric oven, kettle, tumble dryer) to prevent surge damage.',
        'Leave 1 hallway light switch ON so you immediately see when ESB Networks restores grid power.',
      ],
      stepsVerified: [true, true, true],
      lastVerifiedDate: offsetDateIso(-14),
    },
    gas: {
      location: 'External White Meter Box on Left Gable Wall (Meter Key hung inside utility press)',
      steps: [
        'Open external meter box with triangular gas meter key.',
        'Turn Emergency Control Valve (ECV) lever a quarter-turn (90°) so lever sits perpendicular across the pipe.',
        'Do NOT turn gas back on yourself after a leak—await Gas Networks Ireland engineer (1800 20 50 50).',
      ],
      stepsVerified: [true, true, false],
      lastVerifiedDate: offsetDateIso(-14),
    },
    water: {
      location: 'Under Kitchen Sink (Behind lower removable kickboard, brass stopcock valve)',
      steps: [
        'Turn internal brass stopcock clockwise until snug to isolate household plumbing from mains.',
        'Open kitchen cold tap to drain residual pipe pressure and prevent burst pipes during freeze.',
        'Locate external Uisce Éireann boundary box outside front driveway gate for emergency street shut-off.',
      ],
      stepsVerified: [true, false, false],
      lastVerifiedDate: offsetDateIso(-14),
    },
  },
  evacuationRoles: {
    parent1Title: 'Parent 1 — Infant & Dokumentenmappe Lead',
    parent1LeadMember: 'Aoife Byrne',
    parent1Tasks: [
      'Secure Fionn (1m infant) into front ergonomic baby carrier/sling (keeps both hands completely free).',
      'Shoulder Rucksack #1 (Infant RTF formula, sterile teats, 3.5 TOG sleeping bag, Dokumentenmappe & cash).',
      'Proceed directly to vehicle / sheltered hallway exit and verify travel cot & blankets.',
    ],
    parent2Title: 'Parent 2 — Pet Carriers & 30-Second Utility Shut-Off Lead',
    parent2LeadMember: 'Cian Byrne',
    parent2Tasks: [
      'Place Bram & Macha into their 2 separate hard structured carriers (never share 1 carrier under stress).',
      'Execute 30-second Utility Shut-Off (Main ESB Isolator OFF, Gas ECV 90° perpendicular, Water Stopcock clockwise).',
      'Shoulder Rucksack #2 (Torches, FM radio, camping stove, adult sleeping bags) and load pet carriers.',
    ],
    localAssemblyPoint: 'Naas GAA Club Car Park, Sallins Road (300m uphill from flood zone)',
    regionalEvacDestination: 'Family Home — 28 Meadowvale, Kilkenny (Eircode R95 X4P1)',
  },
};

export const IRISH_COUNTIES_COORDS: Record<string, { lat: number; lon: number }> = {
  Kildare: { lat: 53.2158, lon: -6.6669 },
  Dublin: { lat: 53.3498, lon: -6.2603 },
  Cork: { lat: 51.8985, lon: -8.4756 },
  Galway: { lat: 53.2707, lon: -9.0568 },
  Kerry: { lat: 52.2713, lon: -9.6999 },
  Donegal: { lat: 54.9548, lon: -7.7342 },
  Mayo: { lat: 53.8543, lon: -9.2988 },
  Waterford: { lat: 52.2593, lon: -7.1101 },
  Limerick: { lat: 52.6638, lon: -8.6267 },
};

export const DEFAULT_WEATHER_STATE: MetEireannWeatherState = {
  county: 'Kildare',
  latitude: 53.2158,
  longitude: -6.6669,
  temperatureC: 9.4,
  windSpeedKmh: 38,
  windGustsKmh: 62,
  precipitationMm: 2.4,
  pressureHpa: 994,
  conditionLabel: 'Blustery Atlantic Frontal Trough',
  warningLevel: 'none',
  warningTitle: 'Met Éireann — No Active Severe Weather Warning',
  warningHeadline: 'Normal Atlantic autumn conditions. Monitor daily forecasts during storm season.',
  warningCounties: ['Kildare', 'Dublin', 'Wicklow'],
  warningValidUntil: offsetDateIso(1) + ' 18:00 IST',
  lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  isSimulatedOverride: false,
};
