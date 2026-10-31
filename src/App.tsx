import React, { useEffect, useRef, useState } from 'react';
import {
  Barcode,
  CloudLightning,
  Compass,
  Download,
  FileText,
  ListChecks,
  Moon,
  RefreshCcw,
  RotateCcw,
  Sun,
  Upload,
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
  StorageLocation,
  StormChecklistItem,
  WeatherWarningLevel,
} from './types';
import {
  DEFAULT_INVENTORY,
  DEFAULT_IRISH_PLAN,
  DEFAULT_POWER_DEVICES,
  DEFAULT_ROSTER,
  DEFAULT_STORM_CHECKLIST,
  DEFAULT_WEATHER_STATE,
  IRISH_COUNTIES_COORDS,
} from './data/defaultData';
import { DashboardTab } from './components/DashboardTab';
import { ChecklistTab } from './components/ChecklistTab';
import { ExpiryScannerChefTab } from './components/ExpiryScannerChefTab';
import { IrishActionPlanTab } from './components/IrishActionPlanTab';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';

const STORAGE_KEY = 'beready_household_state_v1';

type ActiveTab = 'dashboard' | 'checklist' | 'expiry' | 'irish';

interface PersistedState {
  roster: HouseholdMember[];
  tier: PreparednessTier;
  inventory: InventoryItem[];
  powerDevices: PowerDevice[];
  stormChecklist: StormChecklistItem[];
  irishPlan: IrishHouseholdPlan;
  rotationLogs: RotationLogEntry[];
  darkMode: boolean;
  onboardingCompleted: boolean;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        roster: Array.isArray(parsed.roster) && parsed.roster.length > 0 ? parsed.roster : DEFAULT_ROSTER,
        tier: parsed.tier === 'tier1_72h' || parsed.tier === 'tier2_10d' ? parsed.tier : 'tier2_10d',
        inventory:
          Array.isArray(parsed.inventory) && parsed.inventory.length > 0
            ? parsed.inventory
            : DEFAULT_INVENTORY,
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
        onboardingCompleted: Boolean(parsed.onboardingCompleted),
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return {
    roster: DEFAULT_ROSTER,
    tier: 'tier2_10d',
    inventory: DEFAULT_INVENTORY,
    powerDevices: DEFAULT_POWER_DEVICES,
    stormChecklist: DEFAULT_STORM_CHECKLIST,
    irishPlan: DEFAULT_IRISH_PLAN,
    rotationLogs: [],
    darkMode: true,
    onboardingCompleted: false,
  };
}

export default function App() {
  const initial = loadInitialState();
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(initial.darkMode);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeTab]);
  const [roster, setRoster] = useState<HouseholdMember[]>(initial.roster);
  const [tier, setTier] = useState<PreparednessTier>(initial.tier);
  const [inventory, setInventory] = useState<InventoryItem[]>(initial.inventory);
  const [powerDevices, setPowerDevices] = useState<PowerDevice[]>(initial.powerDevices);
  const [stormChecklist, setStormChecklist] = useState<StormChecklistItem[]>(
    initial.stormChecklist
  );
  const [irishPlan, setIrishPlan] = useState<IrishHouseholdPlan>(initial.irishPlan);
  const [rotationLogs, setRotationLogs] = useState<RotationLogEntry[]>(initial.rotationLogs);
  const [onboardingExpanded, setOnboardingExpanded] = useState<boolean>(
    !isAutostart && !initial.onboardingCompleted
  );

  // Storm Mode & 60-minute countdown timer
  const [stormModeActive, setStormModeActive] = useState<boolean>(false);
  const [stormSecondsRemaining, setStormSecondsRemaining] = useState<number>(3600);

  // Met Éireann Weather State
  const [weather, setWeather] = useState<MetEireannWeatherState>(DEFAULT_WEATHER_STATE);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
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

  // Persist state to localStorage
  useEffect(() => {
    try {
      const payload: PersistedState = {
        roster,
        tier,
        inventory,
        powerDevices,
        stormChecklist,
        irishPlan,
        rotationLogs,
        darkMode,
        onboardingCompleted: !onboardingExpanded,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [
    roster,
    tier,
    inventory,
    powerDevices,
    stormChecklist,
    irishPlan,
    rotationLogs,
    darkMode,
    onboardingExpanded,
  ]);

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

  // Simulate Met Éireann Weather Warning Level (and auto-trigger 60-min checklist on Red Warning)
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

  // Inventory Handlers
  const handleUpdateItem = (updated: InventoryItem) => {
    setInventory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleUpdateItemQty = (itemId: string, newQty: number, newExpiry?: string) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              currentQty: Math.max(0, newQty),
              expiryDate: newExpiry || item.expiryDate,
            }
          : item
      )
    );
  };

  const handleAddItem = (newItem: Omit<InventoryItem, 'id'>) => {
    const created: InventoryItem = {
      ...newItem,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setInventory((prev) => [created, ...prev]);
  };

  const handleRotateItem = (itemId: string, newExpiryDate: string) => {
    const targetItem = inventory.find((i) => i.id === itemId);
    if (!targetItem) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const logEntry: RotationLogEntry = {
      id: `rot-${Date.now()}`,
      itemId: targetItem.id,
      itemName: targetItem.name,
      quantityRotated: targetItem.currentQty,
      oldExpiryDate: targetItem.expiryDate,
      newExpiryDate,
      rotatedAt: todayIso,
    };

    setRotationLogs((prev) => [logEntry, ...prev]);
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              expiryDate: newExpiryDate,
              lastRotatedDate: todayIso,
            }
          : item
      )
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
          updated.unshift({
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
          });
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

    setBackupNotice(
      `Scanned ${payload.name} (+${payload.quantityToAdd} ${payload.unit}, ${payload.unitWeightKg} kg/unit, Exp ${payload.expiryDate})`
    );
    setTimeout(() => setBackupNotice(null), 5000);
  };

  // 90-Day Power Cadence Handlers
  const handleTopUpPowerDevice = (id: string) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    setPowerDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, lastChargedDate: todayIso } : d))
    );
  };

  const handleAddPowerDevice = (device: Omit<PowerDevice, 'id'>) => {
    setPowerDevices((prev) => [
      ...prev,
      { ...device, id: `pwr-${Date.now()}` },
    ]);
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
      roster,
      tier,
      inventory,
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
    setBackupNotice('Exported JSON backup file.');
    setTimeout(() => setBackupNotice(null), 4000);
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
        if (Array.isArray(parsed.inventory)) setInventory(parsed.inventory);
        if (Array.isArray(parsed.powerDevices)) setPowerDevices(parsed.powerDevices);
        if (parsed.irishPlan) setIrishPlan(parsed.irishPlan);
        setBackupNotice('Imported household backup successfully!');
        setTimeout(() => setBackupNotice(null), 4000);
      } catch {
        setBackupNotice('Invalid JSON backup file.');
        setTimeout(() => setBackupNotice(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 pb-20 md:pb-10">
      {/* Top Navigation Bar — 3-Zone Contract */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          Be Ready
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Dashboard &amp; Storm Mode
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'checklist'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Dynamic Checklist &amp; Shopping
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expiry')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'expiry'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Expiry, Scanner &amp; Blackout Chef
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('irish')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'irish'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Irish Action Plan
          </button>
        </nav>

        {/* Zone 3: 1 primary header action (Low-battery Dark Mode Toggle) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label={darkMode ? 'Switch to Daylight Mode' : 'Switch to Low-Battery Dark Mode'}
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Daylight Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dark Mode (Battery Saver)</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Workspace Utility Sub-Toolbar (JSON Export/Import Backup, Onboarding Guide, PWA Install) */}
      <div className="no-print border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-900/50 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400 font-mono">
            <span>Dynamic Household Emergency &amp; Rotation Manager</span>
            <span aria-hidden="true">·</span>
            <span>Eircode: {irishPlan.eircode}</span>
            {backupNotice && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {backupNotice}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setShowBarcodeModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Barcode className="w-3.5 h-3.5 text-emerald-500" />
              <span>Scan Barcode</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setOnboardingExpanded((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>{onboardingExpanded ? 'Hide Guide' : 'Onboarding Guide'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>Import JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportJson}
              className="sr-only"
              aria-label="Import household JSON backup"
            />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            roster={roster}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onRemoveMember={handleRemoveMember}
            tier={tier}
            onChangeTier={setTier}
            inventory={inventory}
            onUpdateItemQty={handleUpdateItemQty}
            powerDevices={powerDevices}
            onTopUpPowerDevice={handleTopUpPowerDevice}
            onAddPowerDevice={handleAddPowerDevice}
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
            onNavigateTab={setActiveTab}
            onboardingExpanded={onboardingExpanded}
            onToggleOnboarding={() => setOnboardingExpanded((prev) => !prev)}
            onCompleteOnboarding={() => setOnboardingExpanded(false)}
          />
        )}

        {activeTab === 'checklist' && (
          <ChecklistTab
            inventory={inventory}
            roster={roster}
            tier={tier}
            onChangeTier={setTier}
            onUpdateItem={handleUpdateItem}
            onAddItem={handleAddItem}
            onOpenBarcodeScanner={() => setShowBarcodeModal(true)}
          />
        )}

        {activeTab === 'expiry' && (
          <ExpiryScannerChefTab
            inventory={inventory}
            onRotateItem={handleRotateItem}
            onApplyScannedItems={handleApplyScannedItems}
            rotationLogs={rotationLogs}
            onOpenBarcodeScanner={() => setShowBarcodeModal(true)}
          />
        )}

        {activeTab === 'irish' && (
          <IrishActionPlanTab
            plan={irishPlan}
            roster={roster}
            onUpdatePlan={setIrishPlan}
          />
        )}
      </main>

      <BarcodeScannerModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        onAddOrUpdateBarcodeItem={handleAddOrUpdateBarcodeItem}
        existingInventory={inventory}
      />

      {/* Mobile Bottom Tab Bar (Thumb-Zone Ergonomics) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 items-center h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800"
      >
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full text-[11px] font-medium ${
            activeTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <CloudLightning className="w-4 h-4" />
          <span className="mt-0.5">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`flex flex-col items-center justify-center h-full text-[11px] font-medium ${
            activeTab === 'checklist'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span className="mt-0.5">Checklist</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expiry')}
          className={`flex flex-col items-center justify-center h-full text-[11px] font-medium ${
            activeTab === 'expiry'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="mt-0.5">FIFO &amp; AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('irish')}
          className={`flex flex-col items-center justify-center h-full text-[11px] font-medium ${
            activeTab === 'irish'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="mt-0.5">Irish Plan</span>
        </button>
      </nav>

      <OfflineIndicator />
    </div>
  );
}
