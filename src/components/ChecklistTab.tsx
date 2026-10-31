import React, { useState } from 'react';
import {
  AlertTriangle,
  Backpack,
  Barcode,
  Check,
  Filter,
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
  X,
} from 'lucide-react';
import {
  HouseholdMember,
  InventoryItem,
  ItemCategory,
  PreparednessTier,
  ScalingRule,
  StorageLocation,
} from '../types';
import {
  calculateRucksackWeight,
  calculateTargetQuantity,
  getItemExpiryStatus,
} from '../utils/calculations';

const ALL_CATEGORIES: ItemCategory[] = [
  'Water & Hydration',
  'Non-Perishable Food',
  'Infant Care (Critical)',
  'Pet Supplies',
  'Medical & Hygiene',
  'Light, Warmth & Cooking',
  'Comms, Power & Cash',
  'Documents (Dokumentenmappe)',
];

const STORAGE_LOCATIONS: StorageLocation[] = [
  'Kitchen Pantry',
  'Under Stairs',
  'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
  'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
];

interface ChecklistTabProps {
  inventory: InventoryItem[];
  roster: HouseholdMember[];
  tier: PreparednessTier;
  onChangeTier: (tier: PreparednessTier) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onOpenBarcodeScanner: () => void;
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({
  inventory,
  roster,
  tier,
  onChangeTier,
  onUpdateItem,
  onAddItem,
  onOpenBarcodeScanner,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'ALL'>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | 'ALL'>('ALL');
  const [shoppingMode, setShoppingMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // "Mark Bought & Set Expiry" modal state
  const [buyingItem, setBuyingItem] = useState<InventoryItem | null>(null);
  const [boughtQty, setBoughtQty] = useState<string>('');
  const [boughtExpiry, setBoughtExpiry] = useState<string>(
    new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );

  // Add custom item modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<ItemCategory>('Non-Perishable Food');
  const [customBaseQty, setCustomBaseQty] = useState<string>('2');
  const [customCurrentQty, setCustomCurrentQty] = useState<string>('0');
  const [customUnit, setCustomUnit] = useState<string>('tins');
  const [customScaling, setCustomScaling] = useState<ScalingRule>('perAdultPerDay');
  const [customLocation, setCustomLocation] = useState<StorageLocation>('Kitchen Pantry');
  const [customWeight, setCustomWeight] = useState<string>('0.4');
  const [customExpiry, setCustomExpiry] = useState<string>(
    new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );

  const bag1Report = calculateRucksackWeight(
    inventory,
    'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
    roster,
    tier
  );
  const bag2Report = calculateRucksackWeight(
    inventory,
    'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
    roster,
    tier
  );

  const openMarkBoughtModal = (item: InventoryItem) => {
    const target = calculateTargetQuantity(item.baseQty, item.scalingRule, roster, tier);
    setBuyingItem(item);
    setBoughtQty(String(Math.max(target, item.currentQty + 1)));
    setBoughtExpiry(
      item.expiryDate && getItemExpiryStatus(item.expiryDate) === 'good'
        ? item.expiryDate
        : new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    );
  };

  const handleConfirmBought = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyingItem) return;
    const updated: InventoryItem = {
      ...buyingItem,
      currentQty: Math.max(0, Number(boughtQty) || buyingItem.currentQty),
      expiryDate: boughtExpiry || buyingItem.expiryDate,
    };
    onUpdateItem(updated);
    setBuyingItem(null);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onAddItem({
      name: customName.trim(),
      category: customCategory,
      baseQty: Math.max(0.1, Number(customBaseQty) || 1),
      currentQty: Math.max(0, Number(customCurrentQty) || 0),
      unit: customUnit.trim() || 'units',
      scalingRule: customScaling,
      storageLocation: customLocation,
      unitWeightKg: Math.max(0, Number(customWeight) || 0.2),
      expiryDate: customExpiry || undefined,
      isCritical: false,
    });
    setCustomName('');
    setShowAddModal(false);
  };

  const filteredItems = inventory.filter((item) => {
    const target = calculateTargetQuantity(item.baseQty, item.scalingRule, roster, tier);
    if (shoppingMode && item.currentQty >= target) {
      return false;
    }
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
      return false;
    }
    if (selectedLocation !== 'ALL' && item.storageLocation !== selectedLocation) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.category.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const shoppingShortfallCount = inventory.filter((item) => {
    const target = calculateTargetQuantity(item.baseQty, item.scalingRule, roster, tier);
    return item.currentQty < target;
  }).length;

  const renderBagMeter = (
    title: string,
    subtitle: string,
    report: ReturnType<typeof calculateRucksackWeight>
  ) => {
    const pct = Math.min(100, Math.round((report.currentWeightKg / 14) * 100));
    const isCritical = report.status === 'critical';
    const isWarning = report.status === 'warning';

    return (
      <div
        className={`rounded-xl border p-5 transition-colors ${
          isCritical
            ? 'border-rose-500 bg-rose-950/25 dark:bg-rose-950/35'
            : isWarning
            ? 'border-amber-500/70 bg-amber-950/20 dark:bg-amber-950/30'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Backpack
              className={`w-5 h-5 shrink-0 ${
                isCritical
                  ? 'text-rose-500'
                  : isWarning
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            />
            <div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                GRAB-BAG WEIGHT TRACKER ({report.itemCount} ITEMS)
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`text-2xl font-bold font-mono tabular-nums ${
                isCritical
                  ? 'text-rose-600 dark:text-rose-400'
                  : isWarning
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {report.currentWeightKg.toFixed(2)} kg
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {isCritical
                ? 'OVER 12 KG LIMIT (CRITICAL)'
                : isWarning
                ? 'OVER 10 KG WARNING'
                : 'OPTIMAL (<10 KG)'}
            </div>
          </div>
        </div>

        <div className="mt-3.5 w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>0 kg</span>
          <span>Amber Warning: &gt;10.0 kg</span>
          <span>Red Max: &gt;12.0 kg</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Live Grab-Bag Weight Meters (Rucksack #1 & Rucksack #2) */}
      <section
        aria-label="Grab-Bag Weight Calculator"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {renderBagMeter(
          'Rucksack #1 — Parent 1 (Baby & Docs Lead)',
          'Carried with front infant sling; keep <=10 kg for rapid mobility',
          bag1Report
        )}
        {renderBagMeter(
          'Rucksack #2 — Parent 2 (Pets & Utilities Lead)',
          'Carried alongside 2 structured pet carriers; max ceiling 12 kg',
          bag2Report
        )}
      </section>

      {/* Toolbar: Shopping Mode Toggle, Tier Switch, Search & Add Custom Item */}
      <section
        aria-label="Checklist Controls and Shopping Mode"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShoppingMode((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                shoppingMode
                  ? 'bg-amber-500 text-slate-950'
                  : 'border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>
                {shoppingMode
                  ? `Shopping List View Active (${shoppingShortfallCount} Under-Stocked)`
                  : `Toggle Shopping Mode (${shoppingShortfallCount} to Buy)`}
              </span>
            </button>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => onChangeTier('tier1_72h')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  tier === 'tier1_72h'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Tier 1: 72h (3d)
              </button>
              <button
                type="button"
                onClick={() => onChangeTier('tier2_10d')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  tier === 'tier2_10d'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Tier 2: 10d BBK
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="search"
              placeholder="Search water, formula, stove..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search checklist items"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 min-w-[200px]"
            />

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value as StorageLocation | 'ALL')}
              aria-label="Filter by storage location"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Storage Locations</option>
              {STORAGE_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onOpenBarcodeScanner}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Barcode className="w-4 h-4 text-emerald-500" />
              <span>Scan Barcode (Camera)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer whitespace-nowrap"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Add Custom Item</span>
            </button>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div
          role="group"
          aria-label="Filter by Supply Category"
          className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Categories ({inventory.length})
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Categorised Checklist Table / Cards */}
      <section aria-label="Dynamic Emergency Supply Checklist" className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
            <ShoppingBag className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {shoppingMode
                ? 'All Filtered Supplies Are Fully Stocked!'
                : 'No Matching Inventory Items'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {shoppingMode
                ? 'Every item in this category meets or exceeds your dynamic household target.'
                : 'Try clearing your search query or switching storage location filters.'}
            </p>
            {shoppingMode && (
              <button
                type="button"
                onClick={() => setShoppingMode(false)}
                className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
              >
                Return to Full Checklist
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {filteredItems.map((item) => {
              const targetQty = calculateTargetQuantity(
                item.baseQty,
                item.scalingRule,
                roster,
                tier
              );
              const shortfall = Math.max(0, Math.round((targetQty - item.currentQty) * 10) / 10);
              const expStatus = getItemExpiryStatus(item.expiryDate);
              const isFullyStocked = item.currentQty >= targetQty && expStatus !== 'expired';
              const totalItemWeight = Math.round(item.currentQty * item.unitWeightKg * 100) / 100;

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {item.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Unit wt: {item.unitWeightKg} kg (Total: {totalItemWeight} kg)
                      </span>
                      {item.expiryDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              expStatus === 'expired'
                                ? 'text-rose-600 dark:text-rose-400 font-bold'
                                : expStatus === 'expiring_soon'
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            Exp: {item.expiryDate}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </div>

                    {item.notes && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.notes}</div>
                    )}
                  </div>

                  {/* Storage Location Selector + Quantity Controls + Mark Bought Button */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label htmlFor={`loc-${item.id}`} className="sr-only">
                        Storage Location for {item.name}
                      </label>
                      <select
                        id={`loc-${item.id}`}
                        value={item.storageLocation}
                        onChange={(e) =>
                          onUpdateItem({
                            ...item,
                            storageLocation: e.target.value as StorageLocation,
                          })
                        }
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                      >
                        {STORAGE_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateItem({
                            ...item,
                            currentQty: Math.max(0, item.currentQty - 1),
                          })
                        }
                        className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        -
                      </button>

                      <div className="min-w-[115px] text-center">
                        <span
                          className={`text-sm font-bold ${
                            isFullyStocked
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : shortfall > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {item.currentQty} / {targetQty}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          {item.unit}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateItem({
                            ...item,
                            currentQty: item.currentQty + 1,
                          })
                        }
                        className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => openMarkBoughtModal(item)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        isFullyStocked
                          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                          : expStatus === 'expired'
                          ? 'bg-rose-600 text-white hover:bg-rose-500'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {isFullyStocked
                        ? 'Update Stock / Expiry'
                        : expStatus === 'expired' && shortfall === 0
                        ? 'Replace Expired Batch'
                        : `Mark Bought (+${shortfall} ${item.unit})`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* "Mark Bought & Set Expiry" Modal */}
      {buyingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mark-bought-title"
        >
          <form
            onSubmit={handleConfirmBought}
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3
                id="mark-bought-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Mark Bought &amp; Set Expiry Date
              </h3>
              <button
                type="button"
                onClick={() => setBuyingItem(null)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close Mark Bought modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300">
              Updating stock for <strong>{buyingItem.name}</strong> ({buyingItem.category}).
            </div>

            <div>
              <label
                htmlFor="modal-bought-qty"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                New Total Stocked Quantity ({buyingItem.unit})
              </label>
              <input
                id="modal-bought-qty"
                type="number"
                step="0.5"
                min={0}
                required
                value={boughtQty}
                onChange={(e) => setBoughtQty(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="modal-bought-expiry"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Batch Best-Before / Expiry Date
              </label>
              <input
                id="modal-bought-expiry"
                type="date"
                value={boughtExpiry}
                onChange={(e) => setBoughtExpiry(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBuyingItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
              >
                Confirm Purchase &amp; Save Expiry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Custom Item Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-custom-item-title"
        >
          <form
            onSubmit={handleAddCustomItem}
            className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3
                id="add-custom-item-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Add Custom Supply Item to Inventory
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close Add Custom Item modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="custom-item-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Item Name
                </label>
                <input
                  id="custom-item-name"
                  type="text"
                  required
                  placeholder="e.g. UHT Whole Milk (1L Cartons)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="custom-item-category"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Category
                </label>
                <select
                  id="custom-item-category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as ItemCategory)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="custom-item-location"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Storage Location
                </label>
                <select
                  id="custom-item-location"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value as StorageLocation)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  {STORAGE_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="custom-item-scaling"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Scaling Rule
                </label>
                <select
                  id="custom-item-scaling"
                  value={customScaling}
                  onChange={(e) => setCustomScaling(e.target.value as ScalingRule)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="perAdultPerDay">Per Adult Per Day</option>
                  <option value="perChildPerDay">Per Child Per Day</option>
                  <option value="perInfantPerDay">Per Infant Per Day</option>
                  <option value="perPetPerDay">Per Pet Per Day</option>
                  <option value="fixedHousehold">Fixed Household Target</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="custom-item-baseqty"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Base Qty (per rule) &amp; Unit
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom-item-baseqty"
                    type="number"
                    step="0.1"
                    value={customBaseQty}
                    onChange={(e) => setCustomBaseQty(e.target.value)}
                    className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="Unit (e.g. tins, L)"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    aria-label="Unit label"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="custom-item-weight"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Unit Weight (kg)
                </label>
                <input
                  id="custom-item-weight"
                  type="number"
                  step="0.01"
                  value={customWeight}
                  onChange={(e) => setCustomWeight(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="custom-item-expiry"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Expiry Date (Optional)
                </label>
                <input
                  id="custom-item-expiry"
                  type="date"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
              >
                Add to Inventory
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
