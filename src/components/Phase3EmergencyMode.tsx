import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CloudLightning,
  Copy,
  Droplets,
  Edit3,
  Flame,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import {
  BlackoutRecipe,
  HouseholdMember,
  InventoryItem,
  IrishHouseholdPlan,
  MetEireannWeatherState,
  StormChecklistItem,
  WeatherWarningLevel,
} from '../types';
import { FALLBACK_STOVE_RECIPE, IRISH_COUNTIES_COORDS } from '../data/defaultData';
import { getRosterCounts } from '../utils/calculations';

export type EmergencySubView = 'storm' | 'evac' | 'sos';

interface Phase3EmergencyModeProps {
  plan: IrishHouseholdPlan;
  onUpdatePlan: (plan: IrishHouseholdPlan) => void;
  roster: HouseholdMember[];
  inventory: InventoryItem[];
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
}

const EMERGENCY_CONTACTS = [
  {
    name: 'Emergency Services (Garda / Ambulance / Fire)',
    numberDisplay: '112 / 999',
    telHref: 'tel:112',
    badge: '24/7 Life Safety',
    urgent: true,
  },
  {
    name: 'ESB Networks (Electricity Outages & Fallen Wires)',
    numberDisplay: '1800 372 999',
    telHref: 'tel:1800372999',
    badge: 'Quote 11-Digit MPRN',
    urgent: false,
  },
  {
    name: 'Gas Networks Ireland (24hr Gas Escapes)',
    numberDisplay: '1800 20 50 50',
    telHref: 'tel:1800205050',
    badge: 'Quote 7-Digit GPRN',
    urgent: true,
  },
  {
    name: 'Uisce Éireann (Mains Water Outages & Bursts)',
    numberDisplay: '1800 278 278',
    telHref: 'tel:1800278278',
    badge: 'Quote WPRN / Eircode',
    urgent: false,
  },
  {
    name: 'HSE Live & Midwifery / Infant Advice',
    numberDisplay: '1800 700 700',
    telHref: 'tel:1800700700',
    badge: 'Infant & GP Out-of-Hours',
    urgent: false,
  },
  {
    name: 'National Poisons Information Centre (Beaumont)',
    numberDisplay: '01 809 2166',
    telHref: 'tel:018092166',
    badge: '8am – 10pm Daily',
    urgent: false,
  },
];

export const Phase3EmergencyMode: React.FC<Phase3EmergencyModeProps> = ({
  plan,
  onUpdatePlan,
  roster,
  inventory,
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
}) => {
  const [activeSubTab, setActiveSubTab] = useState<EmergencySubView>('storm');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingIdentity, setEditingIdentity] = useState(false);

  // Accordion states for utility shut-offs in Sub-Tab 2
  const [openUtility, setOpenUtility] = useState<'electricity' | 'gas' | 'water' | null>('gas');
  const [editingUtilityLoc, setEditingUtilityLoc] = useState<
    'electricity' | 'gas' | 'water' | null
  >(null);

  // AI "Blackout Stove Chef" State in Sub-Tab 3
  const [generatingStoveMeal, setGeneratingStoveMeal] = useState(false);
  const [stoveRecipe, setStoveRecipe] = useState<BlackoutRecipe | null>(null);
  const [stoveRecipeSource, setStoveRecipeSource] = useState<string | null>(null);

  const pets = roster.filter((m) => m.type === 'pet');
  const completedStormCount = stormChecklist.filter((i) => i.completed).length;
  const counts = getRosterCounts(roster);

  const formatCountdown = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleCopyCode = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleGenerateStoveRecipe = async () => {
    setGeneratingStoveMeal(true);
    const stockedFood = inventory.filter(
      (i) => i.category === 'Non-Perishable Food' && i.currentQty > 0
    );
    try {
      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'blackout_stove',
          expiringItems: stockedFood.map((i) => ({
            name: i.name,
            qty: i.currentQty,
            unit: i.unit,
          })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { source?: string; recipes?: BlackoutRecipe[] };
        if (Array.isArray(data.recipes) && data.recipes.length > 0) {
          setStoveRecipe(data.recipes[0]);
          setStoveRecipeSource(
            data.source === 'gemini-2.5-flash'
              ? 'Generated with Gemini 2.5 Flash'
              : 'Blackout Stove Chef'
          );
          setGeneratingStoveMeal(false);
          return;
        }
      }
      setStoveRecipe(FALLBACK_STOVE_RECIPE);
      setStoveRecipeSource('Blackout Stove Chef');
    } catch {
      setStoveRecipe(FALLBACK_STOVE_RECIPE);
      setStoveRecipeSource('Blackout Stove Chef');
    } finally {
      setGeneratingStoveMeal(false);
    }
  };

  const updateUtilityLocation = (key: 'electricity' | 'gas' | 'water', newLocation: string) => {
    onUpdatePlan({
      ...plan,
      utilities: {
        ...plan.utilities,
        [key]: {
          ...plan.utilities[key],
          location: newLocation,
        },
      },
    });
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Top Row: 3 Panic-Proof Segmented Sub-Tabs */}
      <div
        role="tablist"
        aria-label="Emergency Mode Crisis Workflows"
        className="no-print grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'storm'}
          onClick={() => setActiveSubTab('storm')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer min-h-[48px] ${
            activeSubTab === 'storm'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CloudLightning className="w-4 h-4 shrink-0" />
          <span>Storm Pre-Flight</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] tabular-nums ${
              activeSubTab === 'storm'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {completedStormCount}/{stormChecklist.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'evac'}
          onClick={() => setActiveSubTab('evac')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer min-h-[48px] ${
            activeSubTab === 'evac'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>5-Min Evac &amp; Shut-Offs</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'sos'}
          onClick={() => setActiveSubTab('sos')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer min-h-[48px] ${
            activeSubTab === 'sos'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Phone className="w-4 h-4 shrink-0" />
          <span>Irish SOS &amp; IDs</span>
        </button>
      </div>

      {/* =====================================================================
          SUB-TAB 1: STORM PRE-FLIGHT (60-Min Red Warning Checklist)
         ===================================================================== */}
      {activeSubTab === 'storm' && (
        <section aria-label="Storm Pre-Flight Checklist" className="space-y-4">
          {/* Compact Met Éireann Weather & 60-Min Countdown Strip */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
              weather.warningLevel === 'red' || stormModeActive
                ? 'border-rose-500/60 bg-rose-500/10'
                : weather.warningLevel === 'orange'
                ? 'border-amber-500/60 bg-amber-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      weather.warningLevel === 'red'
                        ? 'bg-rose-600 text-white'
                        : weather.warningLevel === 'orange'
                        ? 'bg-amber-500 text-slate-950'
                        : weather.warningLevel === 'yellow'
                        ? 'bg-yellow-400 text-slate-950'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {weather.warningLevel === 'none'
                      ? 'Met Éireann: Normal'
                      : `Status ${weather.warningLevel.toUpperCase()}`}
                  </span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                    Co. {weather.county} • Wind {weather.windSpeedKmh} km/h (Gusts{' '}
                    {weather.windGustsKmh} km/h)
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {weather.warningTitle}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {weather.warningHeadline}
                </p>
              </div>

              {/* 60-Minute Storm Countdown Control */}
              <div className="flex items-center gap-3 shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 px-4 py-3">
                <Clock
                  className={`w-5 h-5 shrink-0 ${
                    stormModeActive ? 'text-rose-500 animate-pulse' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                    60-Min Window
                  </div>
                  <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatCountdown(stormSecondsRemaining)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={() => onToggleStormMode()}
                    className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                      stormModeActive
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-rose-600 text-white hover:bg-rose-500'
                    }`}
                  >
                    {stormModeActive ? 'Pause' : 'Start 60m'}
                  </button>
                  <button
                    type="button"
                    onClick={onResetStormTimer}
                    className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* County Selector & Test Alert Triggers */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <label htmlFor="storm-county-select" className="font-medium text-slate-500">
                  County:
                </label>
                <select
                  id="storm-county-select"
                  value={weather.county}
                  onChange={(e) => onRefreshWeather(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white"
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${weatherLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500">Test Drill:</span>
                {(['none', 'yellow', 'orange', 'red'] as WeatherWarningLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onSimulateWeatherWarning(lvl)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize cursor-pointer ${
                      weather.warningLevel === lvl
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lvl === 'none' ? 'Clear' : lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Large Full-Width Tap-Anywhere Checklist Rows (min-h-[56px], zero secondary clutter) */}
          <div className="space-y-2.5">
            {stormChecklist.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleStormChecklistItem(item.id)}
                aria-pressed={item.completed}
                className={`w-full min-h-[60px] rounded-xl border p-4 flex items-center gap-3.5 text-left transition-colors cursor-pointer ${
                  item.completed
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-slate-500 dark:text-slate-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-rose-500/40 text-slate-900 dark:text-white'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                    item.completed
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                  aria-hidden="true"
                >
                  {item.completed && <Check className="w-4 h-4 stroke-[3]" />}
                </span>

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm sm:text-base font-semibold leading-snug ${
                      item.completed ? 'line-through opacity-75' : ''
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
        </section>
      )}

      {/* =====================================================================
          SUB-TAB 2: 5-MIN EVAC & SHUT-OFFS (Roles & Utility Valves)
         ===================================================================== */}
      {activeSubTab === 'evac' && (
        <section aria-label="5-Minute Evacuation Roles and Utility Shut-Offs" className="space-y-5">
          {/* Two Distinct Numbered Step-by-Step Cards (Parent 1 & Parent 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parent 1 Card */}
            <div className="rounded-2xl border border-emerald-500/40 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {counts.infants > 0 ? 'Parent 1 — Baby & Docs' : 'Parent 1 — Grab Bag & Docs'}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {plan.evacuationRoles.parent1LeadMember}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {counts.infants > 0
                  ? plan.evacuationRoles.parent1Title
                  : 'Parent 1 — Rucksack #1 & Emergency Documents Lead'}
              </h3>
              <ol className="space-y-2.5 pt-1">
                {plan.evacuationRoles.parent1Tasks
                  .filter(
                    (task) =>
                      counts.infants > 0 ||
                      (!task.toLowerCase().includes('infant') &&
                        !task.toLowerCase().includes('baby'))
                  )
                  .map((task, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 leading-snug">{task}</span>
                    </li>
                  ))}
              </ol>
            </div>

            {/* Parent 2 Card */}
            <div className="rounded-2xl border border-amber-500/40 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  {counts.pets > 0
                    ? `Parent 2 — ${counts.pets === 1 ? '1 Pet' : `${counts.pets} Pets`} & Utilities`
                    : 'Parent 2 — Utilities & Perimeter'}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {plan.evacuationRoles.parent2LeadMember}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {counts.pets > 0
                  ? plan.evacuationRoles.parent2Title
                  : 'Parent 2 — 30-Second Utility Isolation & Perimeter Lead'}
              </h3>
              <ol className="space-y-2.5 pt-1">
                {plan.evacuationRoles.parent2Tasks
                  .filter(
                    (task) =>
                      counts.pets > 0 ||
                      (!task.toLowerCase().includes('carrier') &&
                        !task.toLowerCase().includes('pet') &&
                        !task.toLowerCase().includes('cat'))
                  )
                  .map((task, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 leading-snug">{task}</span>
                    </li>
                  ))}
              </ol>
            </div>
          </div>

          {/* Utility Shut-Off Accordion Cards (Electricity, Gas ECV, Mains Water) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Utility Isolation Valves &amp; Switches
            </h3>

            {(
              [
                {
                  key: 'electricity' as const,
                  title: 'Electricity (Main RCD / Consumer Unit)',
                  oneSentenceRule:
                    'Flip the main red isolator switch DOWN to OFF on the fuseboard.',
                  icon: Zap,
                  accent: 'text-amber-500',
                },
                {
                  key: 'gas' as const,
                  title: 'Natural Gas (Emergency Control Valve — ECV)',
                  oneSentenceRule: 'Turn the yellow gas lever 90° ACROSS the pipe to shut off flow.',
                  icon: Flame,
                  accent: 'text-rose-500',
                },
                {
                  key: 'water' as const,
                  title: 'Mains Water (Internal Stopcock)',
                  oneSentenceRule:
                    'Turn the brass stopcock tap CLOCKWISE until tight to stop flooding.',
                  icon: Droplets,
                  accent: 'text-sky-500',
                },
              ] as const
            ).map(({ key, title, oneSentenceRule, icon: Icon, accent }) => {
              const config = plan.utilities[key];
              const isOpen = openUtility === key;
              const isEditingLoc = editingUtilityLoc === key;

              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                >
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setOpenUtility(isOpen ? null : key)}
                      aria-expanded={isOpen}
                      className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${accent}`} />
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {title}
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {oneSentenceRule}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="max-w-[200px] truncate">{config.location}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setEditingUtilityLoc(isEditingLoc ? null : key)}
                        aria-label={`Edit ${title} location`}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpenUtility(isOpen ? null : key)}
                        aria-label={`Toggle ${title} steps`}
                        className="p-1.5 rounded-lg text-slate-400 cursor-pointer"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {isEditingLoc && (
                    <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/70 flex items-center gap-2">
                      <input
                        type="text"
                        value={config.location}
                        onChange={(e) => updateUtilityLocation(key, e.target.value)}
                        aria-label={`${title} location text`}
                        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingUtilityLoc(null)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  )}

                  {isOpen && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800/70 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {config.steps.map((step, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-2">
                          <span className="font-bold text-slate-400 tabular-nums">
                            {sIdx + 1}.
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          SUB-TAB 3: IRISH SOS & IDs (Tap-to-Call, Eircode/MPRN & Stove Chef)
         ===================================================================== */}
      {activeSubTab === 'sos' && (
        <section aria-label="Irish SOS Contacts and Utility Reference IDs" className="space-y-5">
          {/* 1. High-Visibility ID Strip (Strictly font-mono for Eircode, MPRN, GPRN, WPRN & Microchip #) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Emergency Dispatch Reference Codes
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-slate-900 dark:text-white">
                    {plan.eircode}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode('eircode', plan.eircode)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 cursor-pointer"
                  >
                    {copiedKey === 'eircode' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Eircode</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {plan.homeAddress}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingIdentity((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{editingIdentity ? 'Done Editing' : 'Edit IDs'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print 1-Page Plan</span>
                </button>
              </div>
            </div>

            {editingIdentity && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label
                    htmlFor="sos-edit-eircode"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Eircode
                  </label>
                  <input
                    id="sos-edit-eircode"
                    type="text"
                    value={plan.eircode}
                    onChange={(e) => onUpdatePlan({ ...plan, eircode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sos-edit-mprn"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    ESB MPRN (11-digit)
                  </label>
                  <input
                    id="sos-edit-mprn"
                    type="text"
                    value={plan.mprn}
                    onChange={(e) => onUpdatePlan({ ...plan, mprn: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sos-edit-gprn"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Gas GPRN (7-digit)
                  </label>
                  <input
                    id="sos-edit-gprn"
                    type="text"
                    value={plan.gprn}
                    onChange={(e) => onUpdatePlan({ ...plan, gprn: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sos-edit-wprn"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Uisce Éireann WPRN
                  </label>
                  <input
                    id="sos-edit-wprn"
                    type="text"
                    value={plan.wprn}
                    onChange={(e) => onUpdatePlan({ ...plan, wprn: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {/* Reference Codes Grid with 1-Tap Copy Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              {[
                { key: 'mprn', label: 'ESB MPRN', value: plan.mprn },
                { key: 'gprn', label: 'Gas GPRN', value: plan.gprn },
                { key: 'wprn', label: 'Water WPRN', value: plan.wprn },
                ...pets.map((p) => ({
                  key: `pet-${p.id}`,
                  label: `${p.name} Microchip #`,
                  value: p.microchipNumber || 'Not set',
                })),
              ].map((code) => (
                <div
                  key={code.key}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2.5 flex items-center justify-between gap-2 min-w-0"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {code.label}
                    </div>
                    <div className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white truncate mt-0.5">
                      {code.value}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(code.key, code.value)}
                    aria-label={`Copy ${code.label}`}
                    className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-emerald-500 shrink-0 cursor-pointer"
                  >
                    {copiedKey === code.key ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Tap-to-Call Grid (2-column full-width tel: buttons) */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tap Anywhere to Dial Irish Emergency &amp; Utility Desks
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EMERGENCY_CONTACTS.map((contact) => (
                <a
                  key={contact.name}
                  href={contact.telHref}
                  className={`w-full py-3.5 px-4 min-h-[60px] rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                    contact.urgent
                      ? 'border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/50 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        contact.urgent
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600/15 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{contact.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {contact.badge}
                      </div>
                    </div>
                  </div>

                  <span className="text-sm sm:text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                    {contact.numberDisplay}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* 3. AI Blackout Stove Chef (Single-Burner <10m Fuel & Minimal Water) */}
          <div className="no-print rounded-2xl border border-amber-500/40 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Grid-Down Rationing • Single-Burner Camping Stove
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  AI Blackout Stove Chef (&lt;10 Min Fuel Burn &amp; Minimal Water)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Generates a high-calorie one-pot hot meal from your stocked tins using minimal
                  butane gas and zero draining water.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateStoveRecipe}
                disabled={generatingStoveMeal}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {generatingStoveMeal ? 'Calculating Ration Meal...' : 'Generate Stove Meal'}
                </span>
              </button>
            </div>

            {stoveRecipe && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {stoveRecipe.title}
                  </h4>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                      Fuel burn: {stoveRecipe.fuelTimeMinutes} mins
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold">
                      Water: {stoveRecipe.waterNeededMl} ml
                    </span>
                  </div>
                </div>

                <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  {stoveRecipe.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300 font-medium">
                  Safety Tip: {stoveRecipe.safetyOrConservationTip} ({stoveRecipeSource})
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
