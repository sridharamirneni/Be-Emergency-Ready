import React, { useState } from 'react';
import {
  AlertTriangle,
  Baby,
  BatteryCharging,
  Calendar,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock,
  MapPin,
  Plus,
  RotateCcw,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import {
  BlackoutRecipe,
  HouseholdMember,
  InventoryItem,
  PowerDevice,
  RotationLogEntry,
  StorageLocation,
} from '../types';
import { ALL_STORAGE_LOCATIONS, FALLBACK_EVERYDAY_RECIPES } from '../data/defaultData';
import {
  calculateInfantMilestones,
  evaluateExpiryStatus,
  evaluatePowerCadence,
  formatMonthYear,
  formatShortDate,
  formatShortLocationLabel,
  formatShortUnit,
  generateExpiryIcsContent,
  isItemApplicableToHousehold,
} from '../utils/calculations';

interface Phase2MaintainRotateProps {
  inventory: InventoryItem[];
  roster: HouseholdMember[];
  powerDevices: PowerDevice[];
  storageLocations?: StorageLocation[];
  onTopUpPowerDevice: (id: string) => void;
  onAddPowerDevice: (device: Omit<PowerDevice, 'id'>) => void;
  onMoveToKitchenOrRotate: (
    itemId: string,
    mode: 'decrement' | 'replace',
    qtyMoved: number,
    newExpiryDate?: string
  ) => void;
  rotationLogs: RotationLogEntry[];
  onOpenHouseholdSettings: () => void;
}

export const Phase2MaintainRotate: React.FC<Phase2MaintainRotateProps> = ({
  inventory,
  roster,
  powerDevices,
  storageLocations = ALL_STORAGE_LOCATIONS,
  onTopUpPowerDevice,
  onAddPowerDevice,
  onMoveToKitchenOrRotate,
  rotationLogs,
}) => {
  const [showGoodItemsAccordion, setShowGoodItemsAccordion] = useState(false);
  const [showAllBatteries, setShowAllBatteries] = useState(false);
  const [showFutureInfantMilestones, setShowFutureInfantMilestones] = useState(false);

  // "Move to Kitchen & Replace" 1-Step Modal State
  const [rotatingItem, setRotatingItem] = useState<InventoryItem | null>(null);
  const [rotationMode, setRotationMode] = useState<'replace' | 'decrement'>('replace');
  const [qtyToMove, setQtyToMove] = useState<number>(1);
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');

  // Add Power Device Modal State
  const [showAddPowerModal, setShowAddPowerModal] = useState(false);
  const [newPowerName, setNewPowerName] = useState('');
  const [newPowerSpecs, setNewPowerSpecs] = useState('20,000 mAh USB-C');
  const [newPowerType, setNewPowerType] = useState<PowerDevice['deviceType']>('Power Bank');
  const [newPowerLoc, setNewPowerLoc] = useState<StorageLocation>(
    'Rucksack #1 (Parent 1 - Baby & Docs Lead)'
  );

  // Contextual AI Pantry Chef State
  const [generatingRecipes, setGeneratingRecipes] = useState(false);
  const [recipes, setRecipes] = useState<BlackoutRecipe[]>([]);
  const [recipeSource, setRecipeSource] = useState<string | null>(null);
  const [recipesExpanded, setRecipesExpanded] = useState(true);

  const applicableInventory = inventory.filter((i) => isItemApplicableToHousehold(i, roster));

  const itemsWithExpiry = applicableInventory
    .filter((i) => Boolean(i.expiryDate))
    .map((item) => {
      const exp = evaluateExpiryStatus(item.expiryDate);
      return {
        ...item,
        expiryStatus: exp.status,
        daysRemaining: exp.daysRemaining,
        expiryLabel: exp.label,
      };
    })
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));

  const expiredItems = itemsWithExpiry.filter((i) => i.expiryStatus === 'expired');
  const amberItems = itemsWithExpiry.filter((i) => i.expiryStatus === 'amber');
  const actionRequiredItems = [...expiredItems, ...amberItems];
  const goodItems = itemsWithExpiry.filter((i) => i.expiryStatus === 'good');

  // Evaluate 90-day power bank & torch cadence
  const evaluatedPower = powerDevices.map((dev) => ({
    ...dev,
    cadence: evaluatePowerCadence(dev.lastChargedDate),
  }));
  const duePowerDevices = evaluatedPower.filter((d) => d.cadence.isDue);

  // Infant growth milestones
  const infants = roster.filter((m) => m.type === 'infant');

  const openRotateModal = (item: InventoryItem) => {
    setRotatingItem(item);
    setRotationMode('replace');
    setQtyToMove(Math.min(1, Math.max(1, item.currentQty)));
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setNewExpiryDate(nextYear.toISOString().slice(0, 10));
  };

  const handleConfirmRotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotatingItem) return;
    onMoveToKitchenOrRotate(rotatingItem.id, rotationMode, qtyToMove, newExpiryDate);
    setRotatingItem(null);
  };

  const handleDownloadIcs = () => {
    const icsText = generateExpiryIcsContent(applicableInventory);
    const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'be-ready-rotation-reminders.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddPowerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPowerName.trim()) return;
    onAddPowerDevice({
      name: newPowerName.trim(),
      deviceType: newPowerType,
      capacityOrSpecs: newPowerSpecs.trim() || 'Standard USB-C',
      lastChargedDate: new Date().toISOString().slice(0, 10),
      location: newPowerLoc,
    });
    setNewPowerName('');
    setShowAddPowerModal(false);
  };

  const handleGenerateEverydayRecipes = async () => {
    setGeneratingRecipes(true);
    setRecipesExpanded(true);
    const targetList =
      actionRequiredItems.length > 0 ? actionRequiredItems : itemsWithExpiry.slice(0, 4);
    try {
      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'everyday',
          expiringItems: targetList.map((i) => ({
            name: i.name,
            qty: i.currentQty,
            unit: i.unit,
            daysRemaining: i.daysRemaining,
          })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { source?: string; recipes?: BlackoutRecipe[] };
        if (Array.isArray(data.recipes) && data.recipes.length > 0) {
          setRecipes(data.recipes);
          setRecipeSource(
            data.source === 'gemini-2.5-flash'
              ? 'Generated with Gemini 2.5 Flash'
              : 'Everyday Pantry Chef'
          );
          setGeneratingRecipes(false);
          return;
        }
      }
      setRecipes(FALLBACK_EVERYDAY_RECIPES);
      setRecipeSource('Everyday Pantry Chef');
    } catch {
      setRecipes(FALLBACK_EVERYDAY_RECIPES);
      setRecipeSource('Everyday Pantry Chef');
    } finally {
      setGeneratingRecipes(false);
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Section 1: Compact "Upkeep Alerts" Strip (Batteries & Infant Growth Milestone) */}
      <section aria-label="Upkeep Alerts" className="space-y-3">
        {/* Infant Growth Milestone Friendly Banner */}
        {infants.map((infant) => {
          const milestone = calculateInfantMilestones(infant);
          const currentBracket =
            milestone.brackets.find((b) => b.status === 'current') || milestone.brackets[0];
          return (
            <div
              key={infant.id}
              className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <Baby className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {infant.name} is {milestone.ageMonths}{' '}
                    {milestone.ageMonths === 1 ? 'month' : 'months'} old: Stock{' '}
                    {currentBracket.nappySizeGuide}, {currentBracket.sleepingBagSize} &amp;{' '}
                    {currentBracket.feedingGuidance.toLowerCase()}.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Next size check due around {formatMonthYear(milestone.nextSizeSwapDate)} (
                    {currentBracket.clothingSize}).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFutureInfantMilestones((v) => !v)}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
              >
                {showFutureInfantMilestones ? 'Hide Growth Guide' : 'View Growth Stages'}
              </button>
            </div>
          );
        })}

        {showFutureInfantMilestones &&
          infants.map((infant) => {
            const milestone = calculateInfantMilestones(infant);
            return (
              <div
                key={`${infant.id}-stages`}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs"
              >
                {milestone.brackets.map((b) => (
                  <div
                    key={b.bracket}
                    className={`rounded-lg border p-3 ${
                      b.status === 'current'
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">{b.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {b.status === 'current' ? 'Current Stage' : 'Upcoming'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{b.nappySizeGuide}</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {b.sleepingBagSize}
                    </p>
                  </div>
                ))}
              </div>
            );
          })}

        {/* 90-Day Battery & Power Bank Upkeep Strip */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  duePowerDevices.length > 0
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  90-Day Battery &amp; Torch Top-Up Check
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {duePowerDevices.length > 0
                    ? `${duePowerDevices.length} device${
                        duePowerDevices.length === 1 ? ' is' : 's are'
                      } overdue for a 90-day charge top-up.`
                    : `All ${evaluatedPower.length} power banks and torches charged within the last 90 days.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowAllBatteries((v) => !v)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {showAllBatteries
                  ? 'Hide Charged Devices'
                  : `View All (${evaluatedPower.length})`}
              </button>
              <button
                type="button"
                onClick={() => setShowAddPowerModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Device</span>
              </button>
            </div>
          </div>

          {/* Highlight Due/Overdue batteries by default (or all when expanded) */}
          {(duePowerDevices.length > 0 || showAllBatteries) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {(showAllBatteries ? evaluatedPower : duePowerDevices).map((dev) => (
                <div
                  key={dev.id}
                  className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                    dev.cadence.isDue
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {dev.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span>{formatShortLocationLabel(dev.location)}</span>
                      <span>•</span>
                      <span
                        className={
                          dev.cadence.isDue
                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {dev.cadence.isDue
                          ? `Overdue (${dev.cadence.daysSinceCharge}d since charge)`
                          : `Charged ${dev.cadence.daysSinceCharge}d ago`}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onTopUpPowerDevice(dev.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      dev.cadence.isDue
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Mark Charged
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Exception-First FIFO Rotation Dashboard (Expired & Rotate Within 30 Days) */}
      <section aria-label="Items Requiring Rotation" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Action Required: Rotate Soon</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
                  actionRequiredItems.length > 0
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {actionRequiredItems.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing only expired items or supplies expiring within 30 days. Healthy stock is
              tucked below.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadIcs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export .ICS Calendar Alerts</span>
          </button>
        </div>

        {/* 1-Tap Rotation Cards Grid */}
        {actionRequiredItems.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Zero Expired or Urgent Items
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All dated supplies have more than 30 days of remaining shelf life.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actionRequiredItems.map((item) => {
              const isExpired = item.expiryStatus === 'expired';
              const shortDate = formatShortDate(item.expiryDate);
              const daysVal = item.daysRemaining ?? 0;
              const statusLine = isExpired
                ? `Expired ${Math.abs(daysVal)} days ago (${shortDate})`
                : `Expires in ${daysVal} days (${shortDate})`;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 bg-white dark:bg-slate-900 ${
                    isExpired ? 'border-rose-500/45' : 'border-amber-500/45'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
                          isExpired
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {isExpired ? 'Expired' : 'Expiring Soon'}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                        {item.currentQty} {formatShortUnit(item.unit)}
                      </span>
                    </div>

                    <h3 className="w-full mb-1.5 text-base font-semibold text-slate-900 dark:text-white leading-snug break-words">
                      {item.name}
                    </h3>

                    <p
                      className={`text-xs font-semibold tabular-nums flex items-center gap-1.5 ${
                        isExpired
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{statusLine}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="max-w-[160px] truncate">
                        {formatShortLocationLabel(item.storageLocation)}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => openRotateModal(item)}
                      className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>Move to Kitchen &amp; Replace</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Contextual AI Pantry Chef Card at the bottom of the Expiring Soon list */}
      <section aria-label="AI Everyday Pantry Chef">
        <div className="rounded-xl border border-emerald-500/35 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Have {actionRequiredItems.length > 0 ? actionRequiredItems.length : 'pantry'} items
                  expiring soon? Generate Everyday Recipe
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Use up expiring tins and pouches in tonight&apos;s family dinner so nothing goes to
                  waste when rotating stock.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateEverydayRecipes}
              disabled={generatingRecipes}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {generatingRecipes ? 'Creating Recipe...' : 'Generate Everyday Recipe'}
              </span>
            </button>
          </div>

          {recipes.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {recipeSource} ({recipes.length} meal ideas)
                </span>
                <button
                  type="button"
                  onClick={() => setRecipesExpanded((v) => !v)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {recipesExpanded ? 'Collapse Reader' : 'Expand Reader'}
                </button>
              </div>

              {recipesExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recipes.map((recipe, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4 space-y-2.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{recipe.title}</span>
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums shrink-0">
                          {recipe.prepTimeMinutes + recipe.fuelTimeMinutes} mins
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {recipe.ingredientsUsed.map((ing, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {ing}
                          </span>
                        ))}
                      </div>

                      <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                        {recipe.steps.map((st, sIdx) => (
                          <li key={sIdx}>{st}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Quiet Accordion at the Bottom for Healthy / Long-Dated Items (>30 Days) */}
      <section aria-label="Healthy Long-Dated Stock">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowGoodItemsAccordion((v) => !v)}
            aria-expanded={showGoodItemsAccordion}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                {goodItems.length} Items Good (&gt;30 Days) — Tap to view
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                showGoodItemsAccordion ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showGoodItemsAccordion && (
            <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
              {goodItems.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {formatShortLocationLabel(item.storageLocation)} • {item.currentQty} {item.unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                      Exp {formatMonthYear(item.expiryDate)} ({item.daysRemaining}d)
                    </span>
                    <button
                      type="button"
                      onClick={() => openRotateModal(item)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                    >
                      Rotate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Rotation Log (Only shown if entries exist) */}
      {rotationLogs.length > 0 && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recent Kitchen Rotations
          </h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {rotationLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="py-2 flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {log.itemName}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                  New Exp: {formatMonthYear(log.newExpiryDate)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal 1: 1-Step "Move to Kitchen & Replace" Modal */}
      {rotatingItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rotate-item-modal-title"
        >
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  FIFO Kitchen Rotation
                </span>
                <h3
                  id="rotate-item-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white mt-0.5"
                >
                  {rotatingItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRotatingItem(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close rotation modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRotation} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRotationMode('replace')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                    rotationMode === 'replace'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div>Replace with Fresh Batch</div>
                  <div className="text-[11px] font-normal opacity-80 mt-0.5">
                    Keep quantity &amp; set new expiry
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRotationMode('decrement')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                    rotationMode === 'decrement'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div>Move to Kitchen Only</div>
                  <div className="text-[11px] font-normal opacity-80 mt-0.5">
                    Deduct from emergency stock
                  </div>
                </button>
              </div>

              {rotationMode === 'replace' ? (
                <div>
                  <label
                    htmlFor="new-replacement-expiry"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    New Replacement Batch Expiry Date
                  </label>
                  <input
                    id="new-replacement-expiry"
                    type="date"
                    required
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="qty-moved-kitchen"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Quantity Moved to Everyday Kitchen ({rotatingItem.unit})
                  </label>
                  <input
                    id="qty-moved-kitchen"
                    type="number"
                    min={1}
                    max={rotatingItem.currentQty}
                    required
                    value={qtyToMove}
                    onChange={(e) => setQtyToMove(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRotatingItem(null)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                >
                  Confirm Rotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Power Device Modal */}
      {showAddPowerModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-power-modal-title"
        >
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3
                id="add-power-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Add Battery or Torch to 90-Day Tracker
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPowerModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPowerSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="power-device-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Device Name
                </label>
                <input
                  id="power-device-name"
                  type="text"
                  required
                  value={newPowerName}
                  onChange={(e) => setNewPowerName(e.target.value)}
                  placeholder="e.g. Anker 20,000 mAh USB-C Power Bank"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="power-device-type"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Type
                  </label>
                  <select
                    id="power-device-type"
                    value={newPowerType}
                    onChange={(e) =>
                      setNewPowerType(e.target.value as PowerDevice['deviceType'])
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                  >
                    <option value="Power Bank">Power Bank</option>
                    <option value="Torch / Headlamp">Torch / Headlamp</option>
                    <option value="Wind-up / Battery FM Radio">Wind-up / Battery FM Radio</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="power-device-specs"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Capacity / Specs
                  </label>
                  <input
                    id="power-device-specs"
                    type="text"
                    value={newPowerSpecs}
                    onChange={(e) => setNewPowerSpecs(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="power-device-location"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Storage Location
                </label>
                <select
                  id="power-device-location"
                  value={newPowerLoc}
                  onChange={(e) => setNewPowerLoc(e.target.value as StorageLocation)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                >
                  {storageLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPowerModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                >
                  Save Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
