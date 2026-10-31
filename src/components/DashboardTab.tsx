import React, { useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Baby,
  CheckSquare,
  CloudLightning,
  Plus,
  RefreshCw,
  ShieldAlert,
  Square,
  Trash2,
  UserPlus,
  Wind,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import {
  HouseholdMember,
  InventoryItem,
  MemberType,
  MetEireannWeatherState,
  PowerDevice,
  PreparednessTier,
  StorageLocation,
  StormChecklistItem,
  WeatherWarningLevel,
} from '../types';
import {
  calculateHouseholdReadiness,
  calculateHouseholdScalingSummary,
  calculateInfantMilestones,
  calculatePowerCadence,
  formatCountdownMmSs,
  getRosterCounts,
} from '../utils/calculations';
import { IRISH_COUNTIES_COORDS } from '../data/defaultData';
import { OnboardingFlow } from './OnboardingFlow';

interface DashboardTabProps {
  roster: HouseholdMember[];
  onAddMember: (member: Omit<HouseholdMember, 'id'>) => void;
  onUpdateMember: (member: HouseholdMember) => void;
  onRemoveMember: (id: string) => void;
  tier: PreparednessTier;
  onChangeTier: (tier: PreparednessTier) => void;
  inventory: InventoryItem[];
  onUpdateItemQty: (itemId: string, newQty: number, newExpiry?: string) => void;
  powerDevices: PowerDevice[];
  onTopUpPowerDevice: (id: string) => void;
  onAddPowerDevice: (device: Omit<PowerDevice, 'id'>) => void;
  stormModeActive: boolean;
  onToggleStormMode: (forceState?: boolean) => void;
  stormSecondsRemaining: number;
  onResetStormTimer: () => void;
  stormChecklist: StormChecklistItem[];
  onToggleStormChecklistItem: (id: string) => void;
  weather: MetEireannWeatherState;
  weatherLoading: boolean;
  onRefreshWeather: (county: string) => void;
  onSimulateWeatherWarning: (level: WeatherWarningLevel) => void;
  onNavigateTab: (tab: 'dashboard' | 'checklist' | 'expiry' | 'irish') => void;
  onboardingExpanded: boolean;
  onToggleOnboarding: () => void;
  onCompleteOnboarding: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  roster,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  tier,
  onChangeTier,
  inventory,
  onUpdateItemQty,
  powerDevices,
  onTopUpPowerDevice,
  onAddPowerDevice,
  stormModeActive,
  onToggleStormMode,
  stormSecondsRemaining,
  onResetStormTimer,
  stormChecklist,
  onToggleStormChecklistItem,
  weather,
  weatherLoading,
  onRefreshWeather,
  onSimulateWeatherWarning,
  onNavigateTab,
  onboardingExpanded,
  onToggleOnboarding,
  onCompleteOnboarding,
}) => {
  // Add member form state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newType, setNewType] = useState<MemberType>('adult');
  const [newName, setNewName] = useState('');
  const [newMedical, setNewMedical] = useState('');
  const [newBirthDate, setNewBirthDate] = useState(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [newAgeYears, setNewAgeYears] = useState('6');
  const [newWeightKg, setNewWeightKg] = useState('20');
  const [newSpecies, setNewSpecies] = useState<'Cat' | 'Dog' | 'Other'>('Cat');
  const [newMicrochip, setNewMicrochip] = useState('');

  // Edit member state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDetail, setEditDetail] = useState('');

  // Add power device state
  const [showAddPower, setShowAddPower] = useState(false);
  const [newPowerName, setNewPowerName] = useState('');
  const [newPowerType, setNewPowerType] = useState<
    'Power Bank' | 'Torch / Headlamp' | 'Wind-up / Battery FM Radio'
  >('Power Bank');
  const [newPowerSpecs, setNewPowerSpecs] = useState('20,000mAh USB-C');

  const readiness = calculateHouseholdReadiness(inventory, roster, tier);
  const scalingSummary = calculateHouseholdScalingSummary(roster, tier);
  const counts = getRosterCounts(roster);
  const infants = roster.filter((m) => m.type === 'infant');

  const completedStormSteps = stormChecklist.filter((c) => c.completed).length;

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (newType === 'adult') {
      onAddMember({
        type: 'adult',
        name: newName.trim(),
        medicalNotes: newMedical.trim() || 'None recorded',
      });
    } else if (newType === 'child') {
      onAddMember({
        type: 'child',
        name: newName.trim(),
        ageYears: Number(newAgeYears) || 6,
        weightKg: Number(newWeightKg) || 20,
      });
    } else if (newType === 'infant') {
      onAddMember({
        type: 'infant',
        name: newName.trim(),
        birthDate: newBirthDate,
      });
    } else {
      onAddMember({
        type: 'pet',
        name: newName.trim(),
        species: newSpecies,
        microchipNumber: newMicrochip.trim() || '972274000551234',
      });
    }

    setNewName('');
    setNewMedical('');
    setNewMicrochip('');
    setShowAddMember(false);
  };

  const startEditingMember = (m: HouseholdMember) => {
    setEditingMemberId(m.id);
    setEditName(m.name);
    if (m.type === 'adult') setEditDetail(m.medicalNotes || '');
    else if (m.type === 'child') setEditDetail(String(m.weightKg || 20));
    else if (m.type === 'infant') setEditDetail(m.birthDate || '');
    else setEditDetail(m.microchipNumber || '');
  };

  const saveEditMember = (m: HouseholdMember) => {
    if (!editName.trim()) return;
    const updated: HouseholdMember = { ...m, name: editName.trim() };
    if (m.type === 'adult') updated.medicalNotes = editDetail;
    else if (m.type === 'child') updated.weightKg = Number(editDetail) || m.weightKg;
    else if (m.type === 'infant') updated.birthDate = editDetail || m.birthDate;
    else updated.microchipNumber = editDetail;
    onUpdateMember(updated);
    setEditingMemberId(null);
  };

  const handleAddPowerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPowerName.trim()) return;
    onAddPowerDevice({
      name: newPowerName.trim(),
      deviceType: newPowerType,
      capacityOrSpecs: newPowerSpecs.trim() || 'Rechargeable Li-Ion',
      lastChargedDate: new Date().toISOString().slice(0, 10),
      location: 'Rucksack #1 (Parent 1 - Baby & Docs Lead)' as StorageLocation,
    });
    setNewPowerName('');
    setShowAddPower(false);
  };

  return (
    <div className="space-y-6">
      {/* Interactive Onboarding Walkthrough */}
      <OnboardingFlow
        roster={roster}
        tier={tier}
        onChangeTier={onChangeTier}
        onAddMember={onAddMember}
        inventory={inventory}
        onUpdateItemQty={onUpdateItemQty}
        onNavigateTab={onNavigateTab}
        isExpanded={onboardingExpanded}
        onToggleExpand={onToggleOnboarding}
        onCompleteOnboarding={onCompleteOnboarding}
      />

      {/* Met Éireann Live Weather & Warning Telemetry Panel */}
      <section
        aria-label="Met Éireann Weather and Storm Warnings"
        className={`rounded-xl border p-5 transition-colors ${
          weather.warningLevel === 'red'
            ? 'border-rose-500 bg-rose-950/30 dark:bg-rose-950/40'
            : weather.warningLevel === 'orange'
            ? 'border-amber-500/70 bg-amber-950/20 dark:bg-amber-950/30'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${
                weather.warningLevel === 'red'
                  ? 'bg-rose-600 text-white'
                  : weather.warningLevel === 'orange'
                  ? 'bg-amber-500 text-slate-950'
                  : weather.warningLevel === 'yellow'
                  ? 'bg-yellow-400 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span
                  className={
                    weather.warningLevel === 'red'
                      ? 'font-bold text-rose-600 dark:text-rose-400'
                      : weather.warningLevel === 'orange'
                      ? 'font-bold text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }
                >
                  {weather.warningLevel === 'red'
                    ? 'STATUS RED SEVERE STORM WARNING'
                    : weather.warningLevel === 'orange'
                    ? 'STATUS ORANGE WEATHER WARNING'
                    : weather.warningLevel === 'yellow'
                    ? 'STATUS YELLOW WEATHER ADVISORY'
                    : 'MET ÉIREANN LIVE TELEMETRY'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Co. {weather.county} ({weather.latitude.toFixed(2)}°N, {weather.longitude.toFixed(2)}°W)
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Updated {weather.lastUpdated}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {weather.warningTitle}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {weather.warningHeadline}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="county-select" className="sr-only">
              Select Irish County
            </label>
            <select
              id="county-select"
              value={weather.county}
              onChange={(e) => onRefreshWeather(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              {Object.keys(IRISH_COUNTIES_COORDS).map((c) => (
                <option key={c} value={c}>
                  Co. {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onRefreshWeather(weather.county)}
              disabled={weatherLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin' : ''}`} />
              <span>Sync Live Weather</span>
            </button>
          </div>
        </div>

        {/* Weather Metrics Strip + Warning Simulation Controls */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 flex-1">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Temperature</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {weather.temperatureC}°C
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Mean Wind</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {weather.windSpeedKmh} km/h
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Peak Gusts</div>
              <div
                className={`text-base font-bold font-mono tabular-nums ${
                  weather.windGustsKmh >= 130
                    ? 'text-rose-600 dark:text-rose-400'
                    : weather.windGustsKmh >= 100
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {weather.windGustsKmh} km/h
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Rainfall (1h)</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {weather.precipitationMm} mm
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Pressure</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {weather.pressureHpa} hPa
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-lg">
            <span className="text-xs text-slate-500 dark:text-slate-400 px-2 font-medium">
              Test Alert Feed:
            </span>
            {(['none', 'yellow', 'orange', 'red'] as WeatherWarningLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => onSimulateWeatherWarning(lvl)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  weather.warningLevel === lvl
                    ? lvl === 'red'
                      ? 'bg-rose-600 text-white'
                      : lvl === 'orange'
                      ? 'bg-amber-500 text-slate-950'
                      : lvl === 'yellow'
                      ? 'bg-yellow-400 text-slate-950'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lvl === 'none'
                  ? 'Normal'
                  : lvl === 'yellow'
                  ? 'Status Yellow'
                  : lvl === 'orange'
                  ? 'Status Orange'
                  : 'Status Red Warning'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Met Éireann "Red Warning / Storm Incoming" Pre-Flight Toggle & 60-Minute Countdown */}
      <section
        aria-label="Storm Incoming Pre-Flight Mode"
        className={`rounded-xl border p-5 transition-all ${
          stormModeActive
            ? 'border-rose-500 bg-rose-950/25 dark:bg-rose-950/35'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                stormModeActive
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400'
              }`}
            >
              <CloudLightning className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
                MET ÉIREANN PRE-FLIGHT PROTOCOL · 60-MINUTE RAPID RESPONSE
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Red Warning / Storm Incoming Pre-Flight Checklist
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                {stormModeActive
                  ? `ACTIVE STORM PROTOCOL: Complete all 5 critical household actions before destructive winds hit grid lines.`
                  : `Activate manually or automatically when Met Éireann issues a Status Red Warning to start the 60-minute household lockdown checklist.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stormModeActive && (
              <div className="px-4 py-2 rounded-lg border border-rose-500/50 bg-slate-950 text-rose-400 font-mono tabular-nums text-lg font-bold">
                T-{formatCountdownMmSs(stormSecondsRemaining)}
              </div>
            )}
            <button
              type="button"
              onClick={() => onToggleStormMode()}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                stormModeActive
                  ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-600'
                  : 'bg-rose-600 text-white hover:bg-rose-500'
              }`}
            >
              {stormModeActive
                ? 'Deactivate Storm Pre-Flight Mode'
                : 'Activate Red Warning Pre-Flight (60m)'}
            </button>
          </div>
        </div>

        {stormModeActive && (
          <div className="mt-5 pt-5 border-t border-rose-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-mono font-semibold text-rose-600 dark:text-rose-300">
                PRE-FLIGHT PROGRESS: {completedStormSteps} / {stormChecklist.length} COMPLETED
              </span>
              <button
                type="button"
                onClick={onResetStormTimer}
                className="text-xs font-mono text-slate-600 dark:text-slate-300 underline hover:text-rose-400 cursor-pointer"
              >
                Reset 60:00 Countdown &amp; Uncheck All
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {stormChecklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggleStormChecklistItem(item.id)}
                  className={`w-full text-left rounded-lg border p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                    item.completed
                      ? 'border-emerald-500/40 bg-emerald-950/20 text-slate-700 dark:text-slate-300'
                      : 'border-rose-500/30 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 hover:border-rose-500'
                  }`}
                >
                  {item.completed ? (
                    <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div
                      className={`text-sm font-semibold ${
                        item.completed ? 'line-through text-slate-500 dark:text-slate-400' : ''
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.detail}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Readiness Score KPI Strip & Preparedness Tier Selector */}
      <section
        aria-label="Household Readiness Summary"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                HOUSEHOLD READINESS SCORE
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {tier === 'tier2_10d' ? '10-Day BBK Standard' : '72-Hour IE/UK Baseline'}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-4">
              <div
                className={`text-4xl font-bold font-mono tabular-nums ${
                  readiness.overallScore >= 85
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : readiness.overallScore >= 60
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {readiness.overallScore}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {readiness.stockedItemsCount} / {readiness.totalActiveItemsCount}
                </strong>{' '}
                categories at full target
              </div>
            </div>

            <div className="mt-3 w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  readiness.overallScore >= 85
                    ? 'bg-emerald-500'
                    : readiness.overallScore >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${readiness.overallScore}%` }}
              />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Expired Items</div>
              <button
                type="button"
                onClick={() => onNavigateTab('expiry')}
                className="mt-0.5 text-base font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                {readiness.expiredCount} Expired
              </button>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Rotate &lt;30d</div>
              <button
                type="button"
                onClick={() => onNavigateTab('expiry')}
                className="mt-0.5 text-base font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                {readiness.expiringSoonCount} Expiring
              </button>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Critical Shortfall</div>
              <button
                type="button"
                onClick={() => onNavigateTab('checklist')}
                className="mt-0.5 text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 hover:underline cursor-pointer"
              >
                {readiness.criticalMissingCount} Items
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Quantity Scaling Formula & Tier Switcher */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  AUTO-SCALING SUPPLY ENGINE
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Dynamic Quantity Scaling ({counts.adults} Adults · {counts.children} Children ·{' '}
                  {counts.infants} Infant · {counts.pets} Pets)
                </h3>
              </div>

              <div
                role="group"
                aria-label="Preparedness Tier Selection"
                className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
              >
                <button
                  type="button"
                  onClick={() => onChangeTier('tier1_72h')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    tier === 'tier1_72h'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Tier 1: 72-Hour (IE/UK)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTier('tier2_10d')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    tier === 'tier2_10d'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Tier 2: 10-Day BBK + 48h Bag
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Human Water</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {scalingSummary.humanDrinkingCookingWaterLiters} L
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  +{scalingSummary.infantWaterLiters}L infant hygiene
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Pet Water &amp; Food</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {scalingSummary.petWaterLiters} L
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {scalingSummary.petWetPouches} wet pouches/tins
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Infant RTF Formula</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {scalingSummary.infantFormulaBottles} x 200ml
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {scalingSummary.infantTeats} sterile teats · {scalingSummary.infantNappies} nappies
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Adult/Child Energy</div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {(scalingSummary.totalKcalRequired / 1000).toFixed(1)}k kcal
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {scalingSummary.humanGrabBags} grab bags · {scalingSummary.petCarriers} pet carriers
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>
              Formula: 3L/day Adult · 2L/day Child · 1L/day Infant · 0.5L/day Pet · 8x 200ml RTF Formula/day Infant
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('checklist')}
              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Inspect All Scaled Line Items &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* Main Two-Column Grid: Household Roster Manager + Right Column (Infant Milestones & 90-Day Power Cadence) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Household Roster Manager */}
        <section
          aria-label="Household Roster Manager"
          className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                DYNAMIC HOUSEHOLD ROSTER ({roster.length} MEMBERS)
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Adults, Children, Infants &amp; Pets
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowAddMember((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddMember ? 'Close Form' : 'Add Household Member'}</span>
            </button>
          </div>

          {showAddMember && (
            <form
              onSubmit={handleAddMemberSubmit}
              className="my-4 rounded-lg border border-emerald-500/40 bg-slate-50 dark:bg-slate-950 p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Add New Member to Auto-Scale Emergency Targets
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="roster-member-type"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="roster-member-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as MemberType)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="adult">Adult (3L water &amp; 2,200 kcal/day)</option>
                    <option value="child">Child 1–12 yrs (2L water &amp; 1,500 kcal/day)</option>
                    <option value="infant">Infant &lt;1 yr (8x RTF formula + 10 nappies/day)</option>
                    <option value="pet">Pet (0.5L water + 2 pouches/day + carrier)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="roster-member-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="roster-member-name"
                    type="text"
                    required
                    placeholder="Enter name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {newType === 'adult' && (
                <div>
                  <label
                    htmlFor="roster-adult-meds"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Medical / Prescription Notes
                  </label>
                  <input
                    id="roster-adult-meds"
                    type="text"
                    placeholder="e.g. Asthma preventer inhaler, insulin, glasses prescription"
                    value={newMedical}
                    onChange={(e) => setNewMedical(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {newType === 'child' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="roster-child-age"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Age (Years, 1–12)
                    </label>
                    <input
                      id="roster-child-age"
                      type="number"
                      min={1}
                      max={12}
                      value={newAgeYears}
                      onChange={(e) => setNewAgeYears(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="roster-child-weight"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Weight in kg (for Paracetamol/Ibuprofen Dosing)
                    </label>
                    <input
                      id="roster-child-weight"
                      type="number"
                      min={8}
                      max={65}
                      value={newWeightKg}
                      onChange={(e) => setNewWeightKg(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {newType === 'infant' && (
                <div>
                  <label
                    htmlFor="roster-infant-dob"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Infant Birth Date (Calculates Age in Months &amp; Growth Milestones)
                  </label>
                  <input
                    id="roster-infant-dob"
                    type="date"
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {newType === 'pet' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="roster-pet-species"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Species
                    </label>
                    <select
                      id="roster-pet-species"
                      value={newSpecies}
                      onChange={(e) => setNewSpecies(e.target.value as 'Cat' | 'Dog' | 'Other')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    >
                      <option value="Cat">Cat</option>
                      <option value="Dog">Dog</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="roster-pet-chip"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      15-Digit ISO Microchip Number
                    </label>
                    <input
                      id="roster-pet-chip"
                      type="text"
                      placeholder="e.g. 972274000841215"
                      value={newMicrochip}
                      onChange={(e) => setNewMicrochip(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                >
                  Save Member &amp; Recalculate
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-200 dark:divide-slate-800 mt-2">
            {roster.map((member) => {
              const isEditing = editingMemberId === member.id;

              return (
                <div
                  key={member.id}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  {isEditing ? (
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        aria-label={`Edit name for ${member.name}`}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-sm text-slate-900 dark:text-slate-100"
                      />
                      <input
                        type={member.type === 'infant' ? 'date' : 'text'}
                        value={editDetail}
                        onChange={(e) => setEditDetail(e.target.value)}
                        aria-label={`Edit details for ${member.name}`}
                        className="flex-1 min-w-[180px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-sm font-mono text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => saveEditMember(member)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                        aria-label={`Save changes for ${member.name}`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 cursor-pointer"
                        aria-label="Cancel member edit"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {member.name}
                          </span>
                          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                            · {member.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                          {member.type === 'adult' && (
                            <span>
                              3L water/day · 2,200 kcal/day · Notes: {member.medicalNotes || 'None'}
                            </span>
                          )}
                          {member.type === 'child' && (
                            <span>
                              Age: {member.ageYears} yrs · Weight: {member.weightKg} kg (Paracetamol 15mg/kg ={' '}
                              {Math.round((member.weightKg || 20) * 15)}mg dose) · 2L water/day
                            </span>
                          )}
                          {member.type === 'infant' && (
                            <span>
                              DOB: {member.birthDate} · 8x 200ml RTF formula + 8 teats + 10 nappies/day + 1L hygiene water
                            </span>
                          )}
                          {member.type === 'pet' && (
                            <span>
                              Species: {member.species} · Microchip: {member.microchipNumber} · 0.5L water + 2 pouches/day
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditingMember(member)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                          aria-label={`Edit ${member.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveMember(member.id)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                          aria-label={`Remove ${member.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Infant Growth Milestone Updater & 90-Day Power Cadence Tracker */}
        <div className="lg:col-span-5 space-y-6">
          {/* Infant Growth Milestone Updater */}
          <section
            aria-label="Infant Growth Milestone Updater"
            className="rounded-xl border border-amber-500/40 bg-white dark:bg-slate-900 p-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Baby className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
                    INFANT GROWTH MILESTONE UPDATER
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Automatic Grab-Bag Size &amp; Teat Alerts
                  </h3>
                </div>
              </div>
            </div>

            {infants.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-3">
                No infants (&lt;1 yr) currently in the household roster. Add an infant with a birth date to track automatic nappy, sleeping bag, and teat transitions.
              </p>
            ) : (
              <div className="pt-3 space-y-4">
                {infants.map((infant) => {
                  const m = calculateInfantMilestones(infant);
                  return (
                    <div key={infant.id} className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {m.infantName} — {m.stageLabel}
                        </span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          DOB: {infant.birthDate}
                        </span>
                      </div>

                      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-2">
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100">Nappies:</strong>{' '}
                          <span className="text-slate-600 dark:text-slate-300">{m.nappyGuidance}</span>
                        </div>
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100">
                            3.5 TOG Sleeping Bag:
                          </strong>{' '}
                          <span className="text-slate-600 dark:text-slate-300">
                            {m.sleepingBagGuidance}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100">
                            Sterile RTF &amp; Teats:
                          </strong>{' '}
                          <span className="text-slate-600 dark:text-slate-300">
                            {m.feedingAndTeatGuidance}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100">
                            Thermal Layers:
                          </strong>{' '}
                          <span className="text-slate-600 dark:text-slate-300">
                            {m.clothingLayerGuidance}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{m.nextTransitionAlert}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 90-Day Power & Battery Cadence Tracker */}
          <section
            aria-label="90-Day Power and Battery Cadence Tracker"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <BatteryCharging className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    90-DAY POWER &amp; BATTERY CADENCE
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Rechargeable Emergency Gear
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPower((p) => !p)}
                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Add rechargeable power device"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showAddPower && (
              <form
                onSubmit={handleAddPowerSubmit}
                className="my-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-2.5"
              >
                <input
                  type="text"
                  required
                  placeholder="Device name (e.g. GoalZero Lantern)"
                  value={newPowerName}
                  onChange={(e) => setNewPowerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
                <div className="flex gap-2">
                  <select
                    value={newPowerType}
                    onChange={(e) =>
                      setNewPowerType(
                        e.target.value as
                          | 'Power Bank'
                          | 'Torch / Headlamp'
                          | 'Wind-up / Battery FM Radio'
                      )
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Power Bank">Power Bank</option>
                    <option value="Torch / Headlamp">Torch / Headlamp</option>
                    <option value="Wind-up / Battery FM Radio">Wind-up / Battery FM Radio</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Capacity / Specs"
                    value={newPowerSpecs}
                    onChange={(e) => setNewPowerSpecs(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            <div className="pt-3 space-y-4">
              {powerDevices.map((dev) => {
                const cadence = calculatePowerCadence(dev.lastChargedDate);
                return (
                  <div
                    key={dev.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {dev.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {dev.deviceType} · {dev.capacityOrSpecs} · Last charged: {dev.lastChargedDate}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                          cadence.status === 'expired'
                            ? 'text-rose-600 dark:text-rose-400'
                            : cadence.status === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {cadence.daysRemaining === 0
                          ? 'OVERDUE (0d left)'
                          : `${cadence.daysRemaining}d / 90d`}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          cadence.status === 'expired'
                            ? 'bg-rose-500'
                            : cadence.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(4, cadence.progressPercent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {dev.location}
                      </span>
                      <button
                        type="button"
                        onClick={() => onTopUpPowerDevice(dev.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Mark Topped Up (80–100%) &amp; Tested
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
