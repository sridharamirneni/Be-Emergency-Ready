import React, { useEffect, useRef, useState } from 'react';
import {
  ListChecks,
  RotateCcw,
  Settings,
  Share2,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import {
  HouseholdMember,
  InventoryItem,
  IrishHouseholdPlan,
  ItemCategory,
  MetEireannWeatherState,
  PowerDevice,
  PreparednessTier,
  RotationLogEntry,
  ScalingRule,
  ScannedReceiptItem,
  SharedHouseholdData,
  StorageLocation,
  StormChecklistItem,
  WeatherWarningLevel,
} from './types';
import {
  ALL_STORAGE_LOCATIONS,
  DEFAULT_INVENTORY,
  DEFAULT_IRISH_PLAN,
  DEFAULT_POWER_DEVICES,
  DEFAULT_ROSTER,
  DEFAULT_STORM_CHECKLIST,
  DEFAULT_WEATHER_STATE,
  IRISH_COUNTIES_COORDS,
} from './data/defaultData';
import {
  addStorageLocationInState,
  calculateHouseholdReadiness,
  normalizeAndSplitInventory,
  removeStorageLocationInState,
  renameStorageLocationInState,
  splitMultiInventoryItem,
} from './utils/calculations';
import {
  AuthSystemStore,
  authenticateUserInStore,
  createDefaultHouseholdData,
  createNewIsolatedHouseholdForUserInStore,
  deleteUserAccountInStore,
  HOUSEHOLDS_STORAGE_KEY,
  inviteMemberToHouseholdInStore,
  joinHouseholdByCodeInStore,
  loadAuthSystemFromLocalStorage,
  registerUserInStore,
  saveAuthSystemToLocalStorage,
  updateHouseholdStateInStore,
  updateUserDisplayNameInStore,
} from './utils/authAndSharing';
import { HouseholdSetupAndSettings } from './components/HouseholdSetupAndSettings';
import { Phase1PlanStock } from './components/Phase1PlanStock';
import { Phase2MaintainRotate } from './components/Phase2MaintainRotate';
import { Phase3EmergencyMode } from './components/Phase3EmergencyMode';
import { OfflineIndicator } from './components/PWAInstallButton';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { AuthWelcomeScreen } from './components/AuthWelcomeScreen';
import { UserProfileAndShareModal } from './components/UserProfileAndShareModal';

const STORAGE_KEY = 'beready_household_state_v2';

export type ActivePhaseView = 'phase1' | 'phase2' | 'phase3';

interface PersistedState {
  roster: HouseholdMember[];
  tier: PreparednessTier;
  inventory: InventoryItem[];
  storageLocations: StorageLocation[];
  powerDevices: PowerDevice[];
  stormChecklist: StormChecklistItem[];
  irishPlan: IrishHouseholdPlan;
  rotationLogs: RotationLogEntry[];
  darkMode: boolean;
  setupCompleted: boolean;
}

function loadInitialState(): PersistedState {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) || localStorage.getItem('beready_household_state_v1');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState> & {
        onboardingCompleted?: boolean;
      };
      const validInventory =
        Array.isArray(parsed.inventory) && parsed.inventory.length > 0
          ? normalizeAndSplitInventory(parsed.inventory).items
          : DEFAULT_INVENTORY;

      const validLocations =
        Array.isArray(parsed.storageLocations) && parsed.storageLocations.length > 0
          ? parsed.storageLocations
          : ALL_STORAGE_LOCATIONS;

      return {
        roster:
          Array.isArray(parsed.roster) && parsed.roster.length > 0 ? parsed.roster : DEFAULT_ROSTER,
        tier: parsed.tier === 'tier1_72h' || parsed.tier === 'tier2_10d' ? parsed.tier : 'tier2_10d',
        inventory: validInventory,
        storageLocations: validLocations,
        powerDevices:
          Array.isArray(parsed.powerDevices) && parsed.powerDevices.length > 0
            ? parsed.powerDevices
            : DEFAULT_POWER_DEVICES,
        stormChecklist:
          Array.isArray(parsed.stormChecklist) && parsed.stormChecklist.length > 0
            ? parsed.stormChecklist
            : DEFAULT_STORM_CHECKLIST,
        irishPlan: parsed.irishPlan ? parsed.irishPlan : DEFAULT_IRISH_PLAN,
        rotationLogs: Array.isArray(parsed.rotationLogs) ? parsed.rotationLogs : [],
        darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : true,
        setupCompleted: Boolean(parsed.setupCompleted ?? parsed.onboardingCompleted),
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return {
    roster: DEFAULT_ROSTER,
    tier: 'tier2_10d',
    inventory: DEFAULT_INVENTORY,
    storageLocations: ALL_STORAGE_LOCATIONS,
    powerDevices: DEFAULT_POWER_DEVICES,
    stormChecklist: DEFAULT_STORM_CHECKLIST,
    irishPlan: DEFAULT_IRISH_PLAN,
    rotationLogs: [],
    darkMode: true,
    setupCompleted: false,
  };
}

export default function App() {
  const initial = loadInitialState();
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [authStore, setAuthStore] = useState<AuthSystemStore>(() =>
    loadAuthSystemFromLocalStorage(initial)
  );
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<'share' | 'profile'>('share');

  const activeUser = authStore.currentUser;
  const activeHousehold: SharedHouseholdData =
    (activeUser && authStore.households[activeUser.householdId]) ||
    Object.values(authStore.households)[0] ||
    createDefaultHouseholdData('usr-default', 'Household', { setupCompleted: true });

  const [setupCompleted, setSetupCompleted] = useState<boolean>(
    isAutostart ? true : activeHousehold.setupCompleted ?? initial.setupCompleted
  );
  const [activePhase, setActivePhase] = useState<ActivePhaseView>('phase1');
  const [showHouseholdDrawer, setShowHouseholdDrawer] = useState<boolean>(false);
  const [darkMode] = useState<boolean>(initial.darkMode);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activePhase, setupCompleted]);

  const [roster, setRoster] = useState<HouseholdMember[]>(activeHousehold.roster);
  const [tier, setTier] = useState<PreparednessTier>(activeHousehold.tier);
  const [inventory, setInventory] = useState<InventoryItem[]>(activeHousehold.inventory);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(
    activeHousehold.storageLocations
  );
  const [powerDevices, setPowerDevices] = useState<PowerDevice[]>(activeHousehold.powerDevices);
  const [stormChecklist, setStormChecklist] = useState<StormChecklistItem[]>(
    activeHousehold.stormChecklist
  );
  const [irishPlan, setIrishPlan] = useState<IrishHouseholdPlan>(activeHousehold.irishPlan);
  const [rotationLogs, setRotationLogs] = useState<RotationLogEntry[]>(
    activeHousehold.rotationLogs
  );

  const loadHouseholdIntoReactState = (hh: SharedHouseholdData) => {
    setRoster(hh.roster);
    setTier(hh.tier);
    setInventory(hh.inventory);
    setStorageLocations(
      Array.isArray(hh.storageLocations) && hh.storageLocations.length > 0
        ? hh.storageLocations
        : ALL_STORAGE_LOCATIONS
    );
    setPowerDevices(hh.powerDevices);
    setStormChecklist(hh.stormChecklist);
    setIrishPlan(hh.irishPlan);
    setRotationLogs(hh.rotationLogs || []);
    setSetupCompleted(isAutostart ? true : hh.setupCompleted ?? true);
  };

  // Storm Mode & 60-minute countdown timer
  const [stormModeActive, setStormModeActive] = useState<boolean>(false);
  const [stormSecondsRemaining, setStormSecondsRemaining] = useState<number>(3600);

  // Met Éireann Weather State
  const [weather, setWeather] = useState<MetEireannWeatherState>(DEFAULT_WEATHER_STATE);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Persist state to both legacy localStorage and SharedHouseholdData in authStore
  useEffect(() => {
    try {
      const payload: PersistedState = {
        roster,
        tier,
        inventory,
        storageLocations,
        powerDevices,
        stormChecklist,
        irishPlan,
        rotationLogs,
        darkMode,
        setupCompleted,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      if (activeUser) {
        setAuthStore((prev) => {
          const next = updateHouseholdStateInStore(
            prev,
            activeUser.householdId,
            {
              roster,
              tier,
              inventory,
              storageLocations,
              powerDevices,
              stormChecklist,
              irishPlan,
              rotationLogs,
              setupCompleted,
            },
            activeUser.name
          );
          saveAuthSystemToLocalStorage(next);
          return next;
        });
      }
    } catch {
      // Ignore quota errors
    }
  }, [
    roster,
    tier,
    inventory,
    storageLocations,
    powerDevices,
    stormChecklist,
    irishPlan,
    rotationLogs,
    darkMode,
    setupCompleted,
  ]);

  // Cross-tab Collaborative Sync listener for Shared Households
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === HOUSEHOLDS_STORAGE_KEY && e.newValue && activeUser) {
        try {
          const updatedHouseholds = JSON.parse(e.newValue) as Record<
            string,
            SharedHouseholdData
          >;
          const syncedHousehold = updatedHouseholds[activeUser.householdId];
          if (syncedHousehold) {
            setAuthStore((prev) => ({
              ...prev,
              households: updatedHouseholds,
            }));
            loadHouseholdIntoReactState(syncedHousehold);
          }
        } catch {
          // Ignore malformed storage sync event
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [activeUser?.householdId]);

  // 60-minute Storm Countdown interval
  useEffect(() => {
    if (!stormModeActive) return;
    const timer = setInterval(() => {
      setStormSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [stormModeActive]);

  // Fetch live Irish weather on mount
  const fetchWeatherForCounty = async (countyName: string) => {
    setWeatherLoading(true);
    const coords = IRISH_COUNTIES_COORDS[countyName] || IRISH_COUNTIES_COORDS.Kildare;
    try {
      const res = await fetch(
        `/api/weather?county=${encodeURIComponent(countyName)}&lat=${coords.lat}&lon=${coords.lon}`
      );
      if (res.ok) {
        const data = (await res.json()) as MetEireannWeatherState;
        setWeather(data);
        if (data.warningLevel === 'red') {
          setStormModeActive(true);
        }
      }
    } catch {
      setWeather((prev) => ({
        ...prev,
        county: countyName,
        latitude: coords.lat,
        longitude: coords.lon,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherForCounty('Kildare');
  }, []);

  const handleSimulateWeatherWarning = (level: WeatherWarningLevel) => {
    if (level === 'red') {
      setWeather((prev) => ({
        ...prev,
        warningLevel: 'red',
        windSpeedKmh: 92,
        windGustsKmh: 146,
        precipitationMm: 24.5,
        pressureHpa: 958,
        conditionLabel: 'Status Red Storm Cyclone — Destructive Gusts',
        warningTitle: `Met Éireann STATUS RED Wind & Rain Warning — Co. ${prev.county}`,
        warningHeadline:
          'Destructive gusts >140 km/h imminent. ESB grid faults and Uisce Éireann pumping outages expected. 60-Minute Pre-Flight Checklist automatically activated.',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSimulatedOverride: true,
      }));
      setStormModeActive(true);
    } else if (level === 'orange') {
      setWeather((prev) => ({
        ...prev,
        warningLevel: 'orange',
        windSpeedKmh: 72,
        windGustsKmh: 118,
        precipitationMm: 14.0,
        pressureHpa: 974,
        conditionLabel: 'Status Orange Severe Gale',
        warningTitle: `Met Éireann Status Orange Wind Warning — Co. ${prev.county}`,
        warningHeadline:
          'Severe gusts up to 118 km/h. Charge all power banks and secure outdoor furniture.',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSimulatedOverride: true,
      }));
    } else if (level === 'yellow') {
      setWeather((prev) => ({
        ...prev,
        warningLevel: 'yellow',
        windSpeedKmh: 54,
        windGustsKmh: 94,
        precipitationMm: 6.2,
        pressureHpa: 988,
        conditionLabel: 'Status Yellow Gusty Rain Band',
        warningTitle: `Met Éireann Status Yellow Wind Advisory — Co. ${prev.county}`,
        warningHeadline: 'Blustery conditions with gusts to 94 km/h. Check garden bins and carriers.',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSimulatedOverride: true,
      }));
    } else {
      setWeather({
        ...DEFAULT_WEATHER_STATE,
        county: weather.county,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  };

  // Roster Handlers
  const handleAddMember = (member: Omit<HouseholdMember, 'id'>) => {
    const newMember: HouseholdMember = {
      ...member,
      id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setRoster((prev) => [...prev, newMember]);
  };

  const handleUpdateMember = (updated: HouseholdMember) => {
    setRoster((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleRemoveMember = (id: string) => {
    setRoster((prev) => prev.filter((m) => m.id !== id));
  };

  // Storage Location Handlers
  const handleAddStorageLocation = (newLocation: string) => {
    const trimmed = newLocation.trim();
    if (!trimmed) return;
    setStorageLocations((prev) => addStorageLocationInState(trimmed, prev));
    setToastNotice(`Added storage location "${trimmed}".`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleRenameStorageLocation = (oldLocation: StorageLocation, newLocation: string) => {
    const trimmed = newLocation.trim();
    if (!trimmed) return;
    const result = renameStorageLocationInState(
      oldLocation,
      trimmed,
      storageLocations,
      inventory,
      powerDevices
    );
    setStorageLocations(result.locations);
    setInventory(result.inventory);
    setPowerDevices(result.powerDevices);
    setToastNotice(`Renamed "${oldLocation}" to "${trimmed}".`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleRemoveStorageLocation = (locationToRemove: StorageLocation) => {
    const result = removeStorageLocationInState(
      locationToRemove,
      storageLocations,
      inventory,
      powerDevices
    );
    setStorageLocations(result.locations);
    setInventory(result.inventory);
    setPowerDevices(result.powerDevices);
    setToastNotice(`Removed storage location "${locationToRemove}".`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  // Inventory Handlers
  const handleUpdateItem = (updated: InventoryItem) => {
    setInventory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleAddItem = (newItem: Omit<InventoryItem, 'id'>) => {
    const created: InventoryItem = {
      ...newItem,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const splitEntries = splitMultiInventoryItem(created);
    setInventory((prev) => [...splitEntries, ...prev]);
    if (splitEntries.length > 1) {
      setToastNotice(
        `Automatically split into ${splitEntries.length} individual items: ${splitEntries
          .map((i) => i.name)
          .join(', ')}`
      );
      setTimeout(() => setToastNotice(null), 4500);
    }
  };

  // Phase 2: "Move to Everyday Kitchen"
  const handleMoveToKitchenOrRotate = (
    itemId: string,
    mode: 'decrement' | 'replace',
    qtyMoved: number,
    newExpiryDate?: string
  ) => {
    const targetItem = inventory.find((i) => i.id === itemId);
    if (!targetItem) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const logEntry: RotationLogEntry = {
      id: `rot-${Date.now()}`,
      itemId: targetItem.id,
      itemName: targetItem.name,
      quantityRotated: mode === 'decrement' ? qtyMoved : targetItem.currentQty,
      oldExpiryDate: targetItem.expiryDate,
      newExpiryDate:
        mode === 'replace' && newExpiryDate
          ? newExpiryDate
          : `Moved ${qtyMoved} to Everyday Kitchen`,
      rotatedAt: todayIso,
    };

    setRotationLogs((prev) => [logEntry, ...prev]);
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (mode === 'decrement') {
          return {
            ...item,
            currentQty: Math.max(0, item.currentQty - qtyMoved),
            lastRotatedDate: todayIso,
          };
        }
        return {
          ...item,
          expiryDate: newExpiryDate || item.expiryDate,
          lastRotatedDate: todayIso,
        };
      })
    );
  };

  const handleApplyScannedItems = (scanned: ScannedReceiptItem[]) => {
    setInventory((prev) => {
      const updated = [...prev];
      for (const sc of scanned) {
        const existingIdx = updated.findIndex(
          (i) =>
            i.name.toLowerCase().includes(sc.name.toLowerCase().slice(0, 14)) ||
            sc.name.toLowerCase().includes(i.name.toLowerCase().slice(0, 14))
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            currentQty: updated[existingIdx].currentQty + sc.quantity,
            expiryDate: sc.expiryDate || updated[existingIdx].expiryDate,
          };
        } else {
          const candidate: InventoryItem = {
            id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: sc.name,
            category: sc.category,
            currentQty: sc.quantity,
            baseQty: Math.max(1, sc.quantity),
            unit: sc.unit,
            scalingRule: 'fixedHousehold',
            storageLocation: 'Kitchen Pantry',
            unitWeightKg: 0.35,
            expiryDate: sc.expiryDate,
            isCritical: false,
          };
          const splitCandidates = splitMultiInventoryItem(candidate);
          updated.unshift(...splitCandidates);
        }
      }
      return updated;
    });
  };

  const handleAddOrUpdateBarcodeItem = (payload: {
    ean: string;
    name: string;
    category: ItemCategory;
    quantityToAdd: number;
    unit: string;
    unitWeightKg: number;
    expiryDate: string;
    storageLocation: StorageLocation;
    scalingRule: ScalingRule;
    notes: string;
  }) => {
    setInventory((prev) => {
      const updated = [...prev];
      const existingIdx = updated.findIndex(
        (i) =>
          i.name.toLowerCase() === payload.name.toLowerCase() ||
          i.name.toLowerCase().includes(payload.name.toLowerCase().slice(0, 18))
      );

      if (existingIdx >= 0) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          currentQty: updated[existingIdx].currentQty + payload.quantityToAdd,
          unitWeightKg: payload.unitWeightKg,
          expiryDate: payload.expiryDate,
          storageLocation: payload.storageLocation,
          notes: payload.notes,
        };
      } else {
        updated.unshift({
          id: `barcode-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: payload.name,
          category: payload.category,
          currentQty: payload.quantityToAdd,
          baseQty: Math.max(1, payload.quantityToAdd),
          unit: payload.unit,
          scalingRule: payload.scalingRule,
          storageLocation: payload.storageLocation,
          unitWeightKg: payload.unitWeightKg,
          expiryDate: payload.expiryDate,
          isCritical: false,
          notes: payload.notes,
        });
      }
      return updated;
    });

    setToastNotice(`Added ${payload.name} (+${payload.quantityToAdd} ${payload.unit})`);
    setTimeout(() => setToastNotice(null), 4000);
  };

  // 90-Day Power Cadence Handlers
  const handleTopUpPowerDevice = (id: string) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    setPowerDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, lastChargedDate: todayIso } : d))
    );
  };

  const handleAddPowerDevice = (device: Omit<PowerDevice, 'id'>) => {
    setPowerDevices((prev) => [...prev, { ...device, id: `pwr-${Date.now()}` }]);
  };

  // Storm Mode Handlers
  const handleToggleStormMode = (forceState?: boolean) => {
    setStormModeActive((prev) => (typeof forceState === 'boolean' ? forceState : !prev));
  };

  const handleResetStormTimer = () => {
    setStormSecondsRemaining(3600);
    setStormChecklist((prev) => prev.map((c) => ({ ...c, completed: false })));
  };

  const handleToggleStormChecklistItem = (id: string) => {
    setStormChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // JSON Export & Import Backup Handlers
  const handleExportJson = () => {
    const backup = {
      app: 'Be Ready: Dynamic Household Emergency & Rotation Manager',
      exportedAt: new Date().toISOString(),
      user: activeUser
        ? {
            id: activeUser.id,
            name: activeUser.name,
            emailOrUsername: activeUser.emailOrUsername,
            role: activeUser.role,
          }
        : undefined,
      householdName: activeHousehold.name,
      shareCode: activeHousehold.shareCode,
      roster,
      tier,
      inventory,
      storageLocations,
      powerDevices,
      stormChecklist,
      irishPlan,
      rotationLogs,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `be-ready-household-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastNotice('Exported household JSON backup.');
    setTimeout(() => setToastNotice(null), 4000);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (Array.isArray(parsed.roster)) setRoster(parsed.roster);
        if (parsed.tier === 'tier1_72h' || parsed.tier === 'tier2_10d') setTier(parsed.tier);
        if (Array.isArray(parsed.storageLocations) && parsed.storageLocations.length > 0) {
          setStorageLocations(parsed.storageLocations);
        }
        if (Array.isArray(parsed.inventory)) {
          const normalized = normalizeAndSplitInventory(parsed.inventory);
          setInventory(normalized.items);
        }
        if (Array.isArray(parsed.powerDevices)) setPowerDevices(parsed.powerDevices);
        if (parsed.irishPlan) setIrishPlan(parsed.irishPlan);
        setToastNotice('Imported household backup successfully!');
        setTimeout(() => setToastNotice(null), 4000);
      } catch {
        setToastNotice('Invalid JSON backup file.');
        setTimeout(() => setToastNotice(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  // Authentication & Multi-User Household Sharing Handlers
  const handleSignIn = (emailOrUsername: string, password: string) => {
    const res = authenticateUserInStore(authStore, emailOrUsername, password);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    setAuthStore(res.store);
    saveAuthSystemToLocalStorage(res.store);
    loadHouseholdIntoReactState(res.household);
    setToastNotice(`Signed in as ${res.user.name} (${res.household.name}).`);
    setTimeout(() => setToastNotice(null), 3500);
    return { ok: true };
  };

  const handleCreateAccount = (params: {
    name: string;
    emailOrUsername: string;
    password: string;
    householdMode: 'create' | 'join';
    shareCode?: string;
    householdName?: string;
  }) => {
    const res = registerUserInStore(authStore, {
      ...params,
      setupCompleted: true,
    });
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    setAuthStore(res.store);
    saveAuthSystemToLocalStorage(res.store);
    loadHouseholdIntoReactState(res.household);
    setToastNotice(
      params.householdMode === 'join'
        ? `Account created! Joined shared household "${res.household.name}".`
        : `Account created! Started "${res.household.name}".`
    );
    setTimeout(() => setToastNotice(null), 4000);
    return { ok: true };
  };

  const handleLogout = () => {
    const nextStore: AuthSystemStore = {
      ...authStore,
      currentUser: null,
    };
    setAuthStore(nextStore);
    saveAuthSystemToLocalStorage(nextStore);
    setProfileModalOpen(false);
    setShowHouseholdDrawer(false);
  };

  const handleDeleteCurrentAccount = () => {
    if (!activeUser) return;
    const nextStore = deleteUserAccountInStore(authStore, activeUser.id);
    setAuthStore(nextStore);
    saveAuthSystemToLocalStorage(nextStore);
    setProfileModalOpen(false);
    setToastNotice(`Deleted account "${activeUser.name}".`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleUpdateDisplayName = (newName: string) => {
    if (!activeUser) return;
    const nextStore = updateUserDisplayNameInStore(authStore, activeUser.id, newName);
    setAuthStore(nextStore);
    saveAuthSystemToLocalStorage(nextStore);
    setToastNotice(`Updated profile name to "${newName}".`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleUpdateHouseholdName = (newHouseholdName: string) => {
    if (!activeUser) return;
    const nextStore = updateHouseholdStateInStore(
      authStore,
      activeUser.householdId,
      { name: newHouseholdName },
      activeUser.name
    );
    setAuthStore(nextStore);
    saveAuthSystemToLocalStorage(nextStore);
    setToastNotice(`Renamed household to "${newHouseholdName}".`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleInviteMember = (emailOrUsername: string) => {
    if (!activeUser) return { ok: false, error: 'Not signed in.' };
    const res = inviteMemberToHouseholdInStore(authStore, activeUser.id, emailOrUsername);
    if (!res.ok) return { ok: false, error: res.error };
    setAuthStore(res.store);
    saveAuthSystemToLocalStorage(res.store);
    return { ok: true };
  };

  const handleJoinHouseholdByCode = (shareCode: string) => {
    if (!activeUser) return { ok: false, error: 'Not signed in.' };
    const res = joinHouseholdByCodeInStore(authStore, activeUser.id, shareCode);
    if (!res.ok) return { ok: false, error: res.error };
    setAuthStore(res.store);
    saveAuthSystemToLocalStorage(res.store);
    loadHouseholdIntoReactState(res.household);
    setToastNotice(
      `Joined "${res.household.name}" (${res.household.shareCode})! Collaborative sync active.`
    );
    setTimeout(() => setToastNotice(null), 4000);
    return { ok: true };
  };

  const handleCreateSeparateHousehold = (newHouseholdName?: string) => {
    if (!activeUser) return;
    const res = createNewIsolatedHouseholdForUserInStore(
      authStore,
      activeUser.id,
      newHouseholdName
    );
    if (!res.ok) return;
    setAuthStore(res.store);
    saveAuthSystemToLocalStorage(res.store);
    loadHouseholdIntoReactState(res.household);
    setToastNotice(`Created separate household "${res.household.name}".`);
    setTimeout(() => setToastNotice(null), 3500);
  };

  // When no user is logged in, show the Welcome / Auth Screen
  if (!activeUser) {
    return (
      <AuthWelcomeScreen
        onSignIn={handleSignIn}
        onCreateAccount={handleCreateAccount}
      />
    );
  }

  const readiness = calculateHouseholdReadiness(inventory, roster, tier);
  const adultsCount = roster.filter((m) => m.type === 'adult').length;
  const childrenCount = roster.filter((m) => m.type === 'child').length;
  const infantsCount = roster.filter((m) => m.type === 'infant').length;
  const petsCount = roster.filter((m) => m.type === 'pet').length;

  // Build human-friendly Household Summary Pill text
  const summaryParts: string[] = [];
  if (adultsCount > 0) summaryParts.push(`${adultsCount} Adult${adultsCount === 1 ? '' : 's'}`);
  if (childrenCount > 0)
    summaryParts.push(`${childrenCount} Child${childrenCount === 1 ? '' : 'ren'}`);
  if (infantsCount > 0) summaryParts.push(`${infantsCount} Infant${infantsCount === 1 ? '' : 's'}`);
  if (petsCount > 0) summaryParts.push(`${petsCount} Cat${petsCount === 1 ? '' : 's'}`);
  summaryParts.push(tier === 'tier2_10d' ? '10-Day Tier' : '72h Tier');
  const householdSummaryText = summaryParts.join(' • ');

  const pendingInvitesCount = authStore.invites.filter(
    (inv) =>
      inv.status === 'pending' &&
      inv.householdId !== activeHousehold.id &&
      (inv.inviteeEmailOrUsername.toLowerCase() ===
        activeUser.emailOrUsername.toLowerCase() ||
        inv.inviteeEmailOrUsername.toLowerCase() === activeUser.name.toLowerCase())
  ).length;

  return (
    <div className="min-h-dvh overflow-x-hidden max-w-[100vw] flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Ultra-Clean Top Header */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 sm:px-6 lg:px-8 py-3">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 lg:gap-5">
          {/* 1. App Title */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setSetupCompleted(true);
              setActivePhase('phase1');
            }}
            className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 py-1"
          >
            Be Ready
          </a>

          {/* 2. Single Compact Readiness Pill */}
          <span
            className={`inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full text-xs font-semibold tabular-nums shrink-0 border ${
              readiness.overallScore >= 80
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : readiness.overallScore >= 50
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
            }`}
            title="Household Emergency Readiness Score"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                readiness.overallScore >= 80
                  ? 'bg-emerald-500'
                  : readiness.overallScore >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
            <span>{readiness.overallScore}% Ready</span>
          </span>

          {/* 3. Center (Desktop md+ only): 3 Phase Tabs */}
          <nav
            aria-label="Primary Phase Navigation"
            className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold shrink-0 border border-slate-200/70 dark:border-slate-800"
          >
            <button
              type="button"
              onClick={() => {
                setSetupCompleted(true);
                setActivePhase('phase1');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                setupCompleted && activePhase === 'phase1'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              1. Plan &amp; Stock
            </button>

            <button
              type="button"
              onClick={() => {
                setSetupCompleted(true);
                setActivePhase('phase2');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                setupCompleted && activePhase === 'phase2'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              2. Maintain &amp; Rotate
            </button>

            <button
              type="button"
              onClick={() => {
                setSetupCompleted(true);
                setActivePhase('phase3');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                setupCompleted && activePhase === 'phase3'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              3. Emergency Mode
            </button>
          </nav>

          {/* 4. Household & Settings Summary Badge — Opens Slide-Over / Modal (Logged-in user name moved to Settings) */}
          <button
            type="button"
            onClick={() => setShowHouseholdDrawer(true)}
            aria-label="Open Household Roster and Account Settings"
            title={`${householdSummaryText} — Click to open Household Roster, Account & Tier Settings`}
            className="relative inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 hover:border-emerald-500/40 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="xl:hidden">{tier === 'tier2_10d' ? '10d' : '72h'}</span>
            <span className="hidden xl:inline truncate max-w-[290px]">
              {householdSummaryText}
            </span>
            <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {pendingInvitesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            )}
          </button>

          {/* 5. Share Household Button (Desktop/Tablet) */}
          <button
            type="button"
            onClick={() => {
              setProfileModalTab('share');
              setProfileModalOpen(true);
            }}
            aria-label="Share Household"
            title={`Share Household (${activeHousehold.shareCode})`}
            className="hidden sm:inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">Share Household</span>
            <span className="lg:hidden">Share</span>
          </button>

          {/* 6. High-Contrast SOS Button */}
          <button
            type="button"
            onClick={() => {
              setSetupCompleted(true);
              setActivePhase('phase3');
            }}
            className={`inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 sm:px-4 rounded-full text-xs font-bold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              setupCompleted && activePhase === 'phase3'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-600 text-white hover:bg-rose-500 shadow-xs'
            }`}
            aria-label="Open SOS Emergency Mode"
          >
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>SOS</span>
          </button>
        </div>
      </header>

      {/* Subtle Toast Banner when items are scanned or exported */}
      {toastNotice && (
        <div className="no-print bg-emerald-600 text-white text-xs font-semibold text-center py-1.5 px-4">
          {toastNotice}
        </div>
      )}

      {/* Hidden JSON Import File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImportJson}
        className="sr-only"
        aria-label="Import household JSON backup"
      />

      {/* Main Content Container with pb-24 md:pb-8 so mobile bottom bar never covers buttons */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-5 pb-24 md:pb-8 min-w-0">
        {!setupCompleted ? (
          <HouseholdSetupAndSettings
            mode="initial-setup"
            roster={roster}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onRemoveMember={handleRemoveMember}
            tier={tier}
            onChangeTier={setTier}
            irishPlan={irishPlan}
            onUpdateIrishPlan={setIrishPlan}
            storageLocations={storageLocations}
            inventory={inventory}
            onAddStorageLocation={handleAddStorageLocation}
            onRenameStorageLocation={handleRenameStorageLocation}
            onRemoveStorageLocation={handleRemoveStorageLocation}
            currentUser={activeUser}
            householdName={activeHousehold.name}
            shareCode={activeHousehold.shareCode}
            onUpdateDisplayName={handleUpdateDisplayName}
            onOpenShareHousehold={() => {
              setProfileModalTab('share');
              setProfileModalOpen(true);
            }}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteCurrentAccount}
            onCompleteSetup={() => {
              setSetupCompleted(true);
              setActivePhase('phase1');
            }}
          />
        ) : activePhase === 'phase1' ? (
          <Phase1PlanStock
            inventory={inventory}
            roster={roster}
            tier={tier}
            onChangeTier={setTier}
            onUpdateItem={handleUpdateItem}
            onAddItem={handleAddItem}
            onApplyScannedItems={handleApplyScannedItems}
            onOpenBarcodeScanner={() => setShowBarcodeModal(true)}
            onOpenHouseholdSettings={() => setShowHouseholdDrawer(true)}
            storageLocations={storageLocations}
          />
        ) : activePhase === 'phase2' ? (
          <Phase2MaintainRotate
            inventory={inventory}
            roster={roster}
            powerDevices={powerDevices}
            onTopUpPowerDevice={handleTopUpPowerDevice}
            onAddPowerDevice={handleAddPowerDevice}
            onMoveToKitchenOrRotate={handleMoveToKitchenOrRotate}
            rotationLogs={rotationLogs}
            onOpenHouseholdSettings={() => setShowHouseholdDrawer(true)}
            storageLocations={storageLocations}
          />
        ) : (
          <Phase3EmergencyMode
            plan={irishPlan}
            onUpdatePlan={setIrishPlan}
            roster={roster}
            inventory={inventory}
            stormModeActive={stormModeActive}
            onToggleStormMode={handleToggleStormMode}
            stormSecondsRemaining={stormSecondsRemaining}
            onResetStormTimer={handleResetStormTimer}
            stormChecklist={stormChecklist}
            onToggleStormChecklistItem={handleToggleStormChecklistItem}
            weather={weather}
            weatherLoading={weatherLoading}
            onRefreshWeather={fetchWeatherForCounty}
            onSimulateWeatherWarning={handleSimulateWeatherWarning}
          />
        )}
      </main>

      {/* Slide-Over / Modal for Household Roster & Tier Settings (Triggered by Household Summary Pill) */}
      {showHouseholdDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Household Roster and Preparedness Tier Settings"
        >
          <div className="w-full max-w-4xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Household Roster, Tier &amp; Backup Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowHouseholdDrawer(false)}
                aria-label="Close Household Settings"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <HouseholdSetupAndSettings
              mode="settings"
              roster={roster}
              onAddMember={handleAddMember}
              onUpdateMember={handleUpdateMember}
              onRemoveMember={handleRemoveMember}
              tier={tier}
              onChangeTier={setTier}
              irishPlan={irishPlan}
              onUpdateIrishPlan={setIrishPlan}
              storageLocations={storageLocations}
              inventory={inventory}
              onAddStorageLocation={handleAddStorageLocation}
              onRenameStorageLocation={handleRenameStorageLocation}
              onRemoveStorageLocation={handleRemoveStorageLocation}
              currentUser={activeUser}
              householdName={activeHousehold.name}
              shareCode={activeHousehold.shareCode}
              onUpdateDisplayName={handleUpdateDisplayName}
              onOpenShareHousehold={() => {
                setShowHouseholdDrawer(false);
                setProfileModalTab('share');
                setProfileModalOpen(true);
              }}
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteCurrentAccount}
              onCompleteSetup={() => setShowHouseholdDrawer(false)}
              onExportJson={handleExportJson}
              onTriggerImportJson={() => fileInputRef.current?.click()}
              onReopenSetupWizard={() => {
                setShowHouseholdDrawer(false);
                setSetupCompleted(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Household Sharing & Account Settings Modal */}
      <UserProfileAndShareModal
        isOpen={profileModalOpen}
        initialTab={profileModalTab}
        onClose={() => setProfileModalOpen(false)}
        currentUser={activeUser}
        users={authStore.users}
        currentHousehold={activeHousehold}
        invites={authStore.invites}
        onUpdateDisplayName={handleUpdateDisplayName}
        onUpdateHouseholdName={handleUpdateHouseholdName}
        onInviteMember={handleInviteMember}
        onJoinHouseholdByCode={handleJoinHouseholdByCode}
        onCreateNewHousehold={handleCreateSeparateHousehold}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteCurrentAccount}
        onExportJson={handleExportJson}
        onTriggerImportJson={() => fileInputRef.current?.click()}
      />

      <BarcodeScannerModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        onAddOrUpdateBarcodeItem={handleAddOrUpdateBarcodeItem}
        existingInventory={inventory}
        storageLocations={storageLocations}
      />

      {/* Mobile-First Bottom Navigation Bar (fixed bottom-0 inset-x-0 z-40 flex md:hidden) */}
      <nav
        aria-label="Mobile Bottom Phase Navigation"
        className="no-print fixed bottom-0 inset-x-0 z-40 flex md:hidden items-center justify-around h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1"
      >
        <button
          type="button"
          onClick={() => {
            setSetupCompleted(true);
            setActivePhase('phase1');
          }}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 text-[11px] font-medium cursor-pointer ${
            setupCompleted && activePhase === 'phase1'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ListChecks className="w-4 h-4 shrink-0" />
          <span className="mt-0.5 truncate">1. Plan &amp; Stock</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSetupCompleted(true);
            setActivePhase('phase2');
          }}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 text-[11px] font-medium cursor-pointer ${
            setupCompleted && activePhase === 'phase2'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span className="mt-0.5 truncate">2. Maintain</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSetupCompleted(true);
            setActivePhase('phase3');
          }}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 text-[11px] font-medium cursor-pointer ${
            setupCompleted && activePhase === 'phase3'
              ? 'text-rose-600 dark:text-rose-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="mt-0.5 truncate">3. Emergency</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHouseholdDrawer(true)}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 text-[11px] font-medium cursor-pointer ${
            showHouseholdDrawer
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="mt-0.5 truncate">Household</span>
        </button>
      </nav>

      <OfflineIndicator />
    </div>
  );
}

