export type MemberType = 'adult' | 'child' | 'infant' | 'pet';

export interface HouseholdMember {
  id: string;
  type: MemberType;
  name: string;
  medicalNotes?: string;
  birthDate?: string; // YYYY-MM-DD
  ageYears?: number;
  weightKg?: number;
  species?: 'Cat' | 'Dog' | 'Other';
  microchipNumber?: string;
}

export type PreparednessTier = 'tier1_72h' | 'tier2_10d';

export type ScalingRule =
  | 'perAdultPerDay'
  | 'perChildPerDay'
  | 'perInfantPerDay'
  | 'perPetPerDay'
  | 'perHumanFixed'
  | 'perInfantFixed'
  | 'perPetFixed'
  | 'humanWaterComposite'
  | 'fixedHousehold';

export type ItemCategory =
  | 'Water & Hydration'
  | 'Non-Perishable Food'
  | 'Infant Care (Critical)'
  | 'Pet Supplies'
  | 'Medical & Hygiene'
  | 'Light, Warmth & Cooking'
  | 'Comms, Power & Cash'
  | 'Important Documents';

export type StorageLocation =
  | 'Kitchen Pantry'
  | 'Under Stairs'
  | 'Rucksack #1 (Parent 1 - Baby & Docs Lead)'
  | 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)'
  | (string & {});

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  currentQty: number;
  baseQty: number;
  unit: string;
  scalingRule: ScalingRule;
  storageLocation: StorageLocation;
  unitWeightKg: number;
  expiryDate?: string; // YYYY-MM-DD
  isCritical?: boolean;
  notes?: string;
  lastRotatedDate?: string;
}

export interface PowerDevice {
  id: string;
  name: string;
  deviceType: 'Power Bank' | 'Torch / Headlamp' | 'Wind-up / Battery FM Radio';
  capacityOrSpecs: string;
  lastChargedDate: string; // YYYY-MM-DD
  location: StorageLocation;
}

export interface StormChecklistItem {
  id: string;
  label: string;
  detail: string;
  completed: boolean;
}

export interface UtilityShutoffConfig {
  location: string;
  steps: string[];
  stepsVerified: boolean[];
  lastVerifiedDate?: string;
}

export interface IrishHouseholdPlan {
  eircode: string;
  homeAddress: string;
  mprn: string; // 11-digit ESB Electricity
  gprn: string; // 7-digit Gas Networks Ireland
  wprn: string; // Uisce Éireann
  gpAndOutOfHours: string;
  vetClinic: string;
  utilities: {
    electricity: UtilityShutoffConfig;
    gas: UtilityShutoffConfig;
    water: UtilityShutoffConfig;
  };
  evacuationRoles: {
    parent1Title: string;
    parent1LeadMember: string;
    parent1Tasks: string[];
    parent2Title: string;
    parent2LeadMember: string;
    parent2Tasks: string[];
    localAssemblyPoint: string;
    regionalEvacDestination: string;
  };
}

export interface BlackoutRecipe {
  title: string;
  mode: 'Everyday Rotation Meal' | 'Single-Burner Camping Stove Blackout Meal';
  prepTimeMinutes: number;
  fuelTimeMinutes: number;
  waterNeededMl: number;
  ingredientsUsed: string[];
  steps: string[];
  safetyOrConservationTip: string;
}

export interface ScannedReceiptItem {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  category: ItemCategory;
}

export interface RotationLogEntry {
  id: string;
  itemId: string;
  itemName: string;
  quantityRotated: number;
  oldExpiryDate?: string;
  newExpiryDate: string;
  rotatedAt: string;
}

export type WeatherWarningLevel = 'none' | 'yellow' | 'orange' | 'red';

export interface MetEireannWeatherState {
  county: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  windSpeedKmh: number;
  windGustsKmh: number;
  precipitationMm: number;
  pressureHpa: number;
  conditionLabel: string;
  warningLevel: WeatherWarningLevel;
  warningTitle: string;
  warningHeadline: string;
  warningCounties: string[];
  warningValidUntil: string;
  stormName?: string;
  lastUpdated: string;
  isSimulatedOverride?: boolean;
}

export type HouseholdRole = 'owner' | 'member';

export interface UserAccount {
  id: string;
  name: string;
  emailOrUsername: string;
  passwordHash: string;
  householdId: string;
  role: HouseholdRole;
  createdAt: string;
}

export interface HouseholdInvite {
  id: string;
  householdId: string;
  householdName: string;
  shareCode: string;
  invitedByUserId: string;
  invitedByName: string;
  inviteeEmailOrUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface ReadinessTrendPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Oct 02"
  score: number; // 0-100 overall readiness score
  waterScore: number; // 0-100
  foodScore: number; // 0-100
  milestoneNote?: string;
}

export interface SharedHouseholdData {
  id: string;
  name: string;
  shareCode: string;
  ownerUserId: string;
  memberUserIds: string[];
  updatedAt: string;
  lastModifiedBy?: string;
  roster: HouseholdMember[];
  tier: PreparednessTier;
  inventory: InventoryItem[];
  storageLocations: StorageLocation[];
  powerDevices: PowerDevice[];
  stormChecklist: StormChecklistItem[];
  irishPlan: IrishHouseholdPlan;
  rotationLogs: RotationLogEntry[];
  readinessHistory?: ReadinessTrendPoint[];
  setupCompleted: boolean;
}


