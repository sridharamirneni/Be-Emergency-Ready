import React, { useRef, useState } from 'react';
import {
  Backpack,
  Barcode,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  HouseholdMember,
  InventoryItem,
  ItemCategory,
  PreparednessTier,
  ScannedReceiptItem,
  StorageLocation,
} from '../types';
import {
  ALL_CATEGORIES,
  ALL_STORAGE_LOCATIONS,
  DEMO_SCANNED_RECEIPT_ITEMS,
} from '../data/defaultData';
import {
  calculateGrabBagWeights,
  calculateHouseholdReadiness,
  describeScalingTooltip,
  enrichInventoryItems,
  filterInventoryItems,
  formatMonthYear,
  formatShortLocationLabel,
  formatShortUnit,
  getRosterCounts,
  parseMultiItemSegments,
  StockStatusFilter,
} from '../utils/calculations';
import { ReadinessTrendChart } from './ReadinessTrendChart';

interface Phase1PlanStockProps {
  inventory: InventoryItem[];
  roster: HouseholdMember[];
  tier: PreparednessTier;
  storageLocations?: StorageLocation[];
  onChangeTier: (tier: PreparednessTier) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onApplyScannedItems: (items: ScannedReceiptItem[]) => void;
  onOpenBarcodeScanner: () => void;
  onOpenHouseholdSettings: () => void;
}

const SHORT_CATEGORY_LABELS: Record<ItemCategory, string> = {
  'Water & Hydration': 'Water',
  'Non-Perishable Food': 'Food',
  'Infant Care (Critical)': 'Infant',
  'Pet Supplies': 'Pets',
  'Medical & Hygiene': 'Medical',
  'Light, Warmth & Cooking': 'Light & Heat',
  'Comms, Power & Cash': 'Power & Cash',
  'Important Documents': 'Documents',
};

const STOCK_STATUS_OPTIONS: Array<{ value: StockStatusFilter; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Low Stock', label: 'Low Stock' },
  { value: 'Missing', label: 'Missing' },
  { value: 'Expiring Soon', label: 'Expiring Soon' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Stocked', label: 'Stocked' },
];

export const Phase1PlanStock: React.FC<Phase1PlanStockProps> = ({
  inventory,
  roster,
  tier,
  storageLocations = ALL_STORAGE_LOCATIONS,
  onUpdateItem,
  onAddItem,
  onApplyScannedItems,
  onOpenBarcodeScanner,
}) => {
  const [shoppingMode, setShoppingMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'ALL'>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | 'ALL'>('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState<StockStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBagDetails, setShowBagDetails] = useState(false);

  const [showHiddenUnassignedMembers, setShowHiddenUnassignedMembers] = useState(false);
  const counts = getRosterCounts(roster);

  // Active info tooltip & location popover per item card
  const [openInfoItemId, setOpenInfoItemId] = useState<string | null>(null);
  const [openLocationItemId, setOpenLocationItemId] = useState<string | null>(null);

  // "Edit Expiry / Mark Bought" Modal state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [modalQty, setModalQty] = useState<number>(0);
  const [modalExpiry, setModalExpiry] = useState<string>('');
  const [modalLocation, setModalLocation] = useState<StorageLocation>('Kitchen Pantry');

  // Add Custom Item Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ItemCategory>('Non-Perishable Food');
  const [customCurrentQty, setCustomCurrentQty] = useState('1');
  const [customBaseQty, setCustomBaseQty] = useState('1');
  const [customUnit, setCustomUnit] = useState('units');
  const [customWeight, setCustomWeight] = useState('0.5');
  const [customLocation, setCustomLocation] = useState<StorageLocation>('Kitchen Pantry');
  const [customExpiry, setCustomExpiry] = useState('');

  // Gemini Vision "Scan to Stock" Modal / Drawer State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedReceiptItem[]>([]);
  const [scanSourceLabel, setScanSourceLabel] = useState<string | null>(null);
  const [appliedScanSuccess, setAppliedScanSuccess] = useState(false);
  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);

  const grabBags = calculateGrabBagWeights(inventory, roster);

  const defaultFutureExpiry = (days = 365): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const openEditModal = (item: InventoryItem, suggestedQty?: number) => {
    setEditingItem(item);
    setModalQty(typeof suggestedQty === 'number' ? suggestedQty : item.currentQty);
    setModalExpiry(item.expiryDate || defaultFutureExpiry(365));
    setModalLocation(item.storageLocation);
  };

  const handleConfirmEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    onUpdateItem({
      ...editingItem,
      currentQty: Math.max(0, modalQty),
      expiryDate: modalExpiry || undefined,
      storageLocation: modalLocation,
    });
    setEditingItem(null);
  };

  const handleStepQuantity = (item: InventoryItem, delta: number) => {
    const nextQty = Math.max(0, item.currentQty + delta);
    // Auto-default standard shelf-life date if incrementing from 0 and item doesn't have an expiry yet
    const shouldAutoDefaultExpiry =
      delta > 0 &&
      !item.expiryDate &&
      item.category !== 'Important Documents' &&
      item.category !== 'Light, Warmth & Cooking' &&
      item.category !== 'Comms, Power & Cash';

    onUpdateItem({
      ...item,
      currentQty: nextQty,
      expiryDate: shouldAutoDefaultExpiry ? defaultFutureExpiry(365) : item.expiryDate,
    });
  };

  const handleAddCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onAddItem({
      name: customName.trim(),
      category: customCategory,
      currentQty: Math.max(0, Number(customCurrentQty) || 0),
      baseQty: Math.max(1, Number(customBaseQty) || 1),
      unit: customUnit.trim() || 'units',
      scalingRule: 'fixedHousehold',
      storageLocation: customLocation,
      unitWeightKg: Math.max(0, Number(customWeight) || 0.2),
      expiryDate: customExpiry || undefined,
      isCritical: false,
    });
    setCustomName('');
    setShowAddModal(false);
  };

  const handleSimulateReceiptScan = async () => {
    setScanningReceipt(true);
    setAppliedScanSuccess(false);
    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulate: true }),
      });
      if (res.ok) {
        const data = (await res.json()) as { source?: string; items?: ScannedReceiptItem[] };
        if (Array.isArray(data.items) && data.items.length > 0) {
          setScannedItems(data.items);
          setScanSourceLabel('Simulated Supermarket Receipt (Gemini 2.5 Flash)');
          return;
        }
      }
      setScannedItems(DEMO_SCANNED_RECEIPT_ITEMS);
      setScanSourceLabel('Simulated Supermarket Receipt');
    } catch {
      setScannedItems(DEMO_SCANNED_RECEIPT_ITEMS);
      setScanSourceLabel('Simulated Supermarket Receipt');
    } finally {
      setScanningReceipt(false);
    }
  };

  const handleReceiptPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningReceipt(true);
    setAppliedScanSuccess(false);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        const base64Image = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const res = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Image,
            mimeType: file.type || 'image/jpeg',
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { source?: string; items?: ScannedReceiptItem[] };
          if (Array.isArray(data.items) && data.items.length > 0) {
            setScannedItems(data.items);
            setScanSourceLabel(
              data.source === 'gemini-2.5-flash'
                ? 'Extracted via Gemini 2.5 Flash Vision'
                : 'Receipt Vision Fallback'
            );
            setScanningReceipt(false);
            return;
          }
        }
        setScannedItems(DEMO_SCANNED_RECEIPT_ITEMS);
        setScanSourceLabel('Receipt Vision Fallback');
      } catch {
        setScannedItems(DEMO_SCANNED_RECEIPT_ITEMS);
        setScanSourceLabel('Receipt Vision Fallback');
      } finally {
        setScanningReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyExtractedItems = () => {
    if (scannedItems.length === 0) return;
    onApplyScannedItems(scannedItems);
    setAppliedScanSuccess(true);
    setScannedItems([]);
  };

  // Enrich items with calculated target quantities, expiry status, and canonical stockStatus
  const enrichedItems = enrichInventoryItems(
    inventory,
    roster,
    tier,
    undefined,
    showHiddenUnassignedMembers
  );

  // Available categories based on active household members (hide Infant / Pet category tabs if 0 members in roster)
  const availableCategories = ALL_CATEGORIES.filter((cat) => {
    if (showHiddenUnassignedMembers) return true;
    if (cat === 'Infant Care (Critical)' && counts.infants === 0) return false;
    if (cat === 'Pet Supplies' && counts.pets === 0) return false;
    return true;
  });

  const activeCategory =
    !showHiddenUnassignedMembers &&
    ((selectedCategory === 'Infant Care (Critical)' && counts.infants === 0) ||
      (selectedCategory === 'Pet Supplies' && counts.pets === 0))
      ? 'ALL'
      : selectedCategory;

  // Category completion counts
  const totalCompletedCount = enrichedItems.filter((i) => i.isComplete).length;
  const missingItemsCount = enrichedItems.filter((i) => !i.isComplete).length;

  const filteredItems = filterInventoryItems(inventory, roster, tier, {
    searchQuery,
    category: activeCategory,
    storageLocation: shoppingMode ? 'ALL' : selectedLocation,
    stockStatus: shoppingMode ? 'ALL' : selectedStockStatus,
    shoppingMode,
    showHiddenUnassignedMembers,
  });

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    activeCategory !== 'ALL' ||
    selectedLocation !== 'ALL' ||
    selectedStockStatus !== 'ALL';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedLocation('ALL');
    setSelectedStockStatus('ALL');
  };

  const bag1Pct = Math.min(100, Math.round((grabBags.bag1Kg / grabBags.bag1CapKg) * 100));
  const bag2Pct = Math.min(100, Math.round((grabBags.bag2Kg / grabBags.bag2CapKg) * 100));
  const readiness = calculateHouseholdReadiness(inventory, roster, tier);

  return (
    <div className="space-y-4 min-w-0">
      {/* D3-Based 30-Day Readiness Trend Chart */}
      <ReadinessTrendChart
        overallScore={readiness.overallScore}
        waterScore={readiness.waterScore}
        foodScore={readiness.foodScore}
        tier={tier}
      />

      {/* Dynamic Household Member Filter Strip (shows when 0 infants or 0 pets in roster) */}
      {(counts.infants === 0 || counts.pets === 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Household Filter
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {counts.infants === 0 && counts.pets === 0
                ? 'Infant care and pet items hidden (0 infants, 0 pets in roster)'
                : counts.infants === 0
                ? 'Infant care items hidden (0 infants in household roster)'
                : 'Pet supplies hidden (0 pets in household roster)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHiddenUnassignedMembers((prev) => !prev)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline font-semibold cursor-pointer shrink-0 self-start sm:self-center"
          >
            {showHiddenUnassignedMembers ? 'Hide unassigned member supplies' : 'Show all supplies'}
          </button>
        </div>
      )}

      {/* Row 1: Category Filter Pills with Completion Counts */}
      <div
        role="tablist"
        aria-label="Inventory Category Filter"
        className="flex overflow-x-auto no-scrollbar whitespace-nowrap gap-2 pb-1 -mx-3 px-3 sm:mx-0 sm:px-0"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'ALL'}
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[38px] inline-flex items-center gap-1.5 ${
            activeCategory === 'ALL'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40'
          }`}
        >
          <span>All Items</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[11px] tabular-nums ${
              activeCategory === 'ALL'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {totalCompletedCount}/{enrichedItems.length}
          </span>
        </button>

        {availableCategories.map((cat) => {
          const catItems = enrichedItems.filter((i) => i.category === cat);
          const doneCount = catItems.filter((i) => i.isComplete).length;
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[38px] inline-flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40'
              }`}
            >
              <span>{SHORT_CATEGORY_LABELS[cat]}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] tabular-nums ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : doneCount === catItems.length && catItems.length > 0
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {doneCount}/{catItems.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Row 2: Sticky Global Search, Stock Status Filter & Grab-Bag Summary Bar */}
      <div className="sticky top-[53px] sm:top-[61px] z-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:px-4 shadow-xs space-y-2.5">
        {/* Top Line: Prominent Global Search Bar + Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              role="searchbox"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search by item name, category, or stock status (e.g. "Gas Stove", "Infant", "Low Stock")...'
              aria-label="Global inventory search by name, category, or stock status"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-24 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {filteredItems.length}/{enrichedItems.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenBarcodeScanner}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 transition-colors cursor-pointer shrink-0 min-h-[36px]"
              title="Scan Product Barcode"
            >
              <Barcode className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Barcode</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReceiptModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 transition-colors cursor-pointer shrink-0 min-h-[36px]"
              title="Scan Receipt or Best Before Stamp with AI Vision"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Scan Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer shrink-0 min-h-[36px]"
              aria-label="Add Custom Item"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Add Item</span>
            </button>
          </div>
        </div>

        {/* Second Line: Stock Status Quick-Filters + Grab-Bag Weight Summary + Shopping Mode */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800/80 min-w-0">
          {/* Left: Stock Status Quick-Filter Pills */}
          <div
            role="group"
            aria-label="Filter by current stock status"
            className="flex overflow-x-auto no-scrollbar items-center gap-1.5 max-w-full"
          >
            {STOCK_STATUS_OPTIONS.map((opt) => {
              const isSelected = selectedStockStatus === opt.value;
              const count =
                opt.value === 'ALL'
                  ? enrichedItems.length
                  : enrichedItems.filter((i) => i.stockStatus === opt.value).length;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStockStatus(opt.value)}
                  aria-pressed={isSelected}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:border-emerald-500/40'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`tabular-nums text-[10px] px-1 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Collapsible Grab-Bag Weight Summary & Shopping Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2 min-w-0 ml-auto">
            <button
              type="button"
              onClick={() => setShowBagDetails((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                grabBags.bag1Overweight || grabBags.bag2Overweight
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:border-emerald-500/40'
              }`}
              title="Tap to inspect Rucksack #1 & #2 weight breakdown"
            >
              <Backpack className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="tabular-nums font-semibold">
                Bag 1: {grabBags.bag1Kg}/{grabBags.bag1CapKg} kg
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span
                className={`tabular-nums font-semibold ${
                  grabBags.bag2Overweight ? 'text-rose-600 dark:text-rose-400' : ''
                }`}
              >
                Bag 2: {grabBags.bag2Kg}/{grabBags.bag2CapKg} kg
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  showBagDetails ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setShoppingMode((s) => !s)}
              aria-pressed={shoppingMode}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                shoppingMode
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:border-amber-500/40'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span>Shopping Mode</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] tabular-nums ${
                  shoppingMode
                    ? 'bg-slate-950/15 text-slate-950 font-bold'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                {missingItemsCount}
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible Grab-Bag Weight Balancer Detail Drawer */}
        {showBagDetails && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Rucksack #1 (Parent 1 — Baby &amp; Docs)
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    grabBags.bag1Overweight
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {grabBags.bag1Kg} / {grabBags.bag1CapKg} kg
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all ${
                    grabBags.bag1Overweight ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${bag1Pct}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedLocation(
                    selectedLocation === 'Rucksack #1 (Parent 1 - Baby & Docs Lead)'
                      ? 'ALL'
                      : 'Rucksack #1 (Parent 1 - Baby & Docs Lead)'
                  )
                }
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {selectedLocation === 'Rucksack #1 (Parent 1 - Baby & Docs Lead)'
                  ? 'Showing Rucksack #1 items only (Tap to show all)'
                  : 'Filter checklist to Rucksack #1 items'}
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Rucksack #2 (Parent 2 — Cats &amp; Utilities)
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    grabBags.bag2Overweight
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {grabBags.bag2Kg} / {grabBags.bag2CapKg} kg
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all ${
                    grabBags.bag2Overweight ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${bag2Pct}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedLocation(
                    selectedLocation === 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)'
                      ? 'ALL'
                      : 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)'
                  )
                }
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {selectedLocation === 'Rucksack #2 (Parent 2 - Pets & Utilities Lead)'
                  ? 'Showing Rucksack #2 items only (Tap to show all)'
                  : 'Filter checklist to Rucksack #2 items'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Supermarket Shopping Mode View (Ultra-compact 1-line check-off rows) */}
      {shoppingMode ? (
        <div className="space-y-3 pb-16">
          <div className="flex items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Supermarket &amp; Pharmacy Shopping Run ({filteredItems.length} needed)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fully stocked items are hidden. Tap any row to mark bought and confirm expiry.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShoppingMode(false)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
            >
              Exit Shopping Mode
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                All items in this view are fully stocked!
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800/80 overflow-hidden shadow-xs">
              {filteredItems.map((item) => {
                const deficit = Math.max(0, item.targetQty - item.currentQty);
                const shortUnit = formatShortUnit(item.unit);
                const shortLoc = formatShortLocationLabel(item.storageLocation);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
                  >
                    {/* Left: Checkbox + Full Item Name (Zero Truncation!) + Metadata Pills */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Accessible Quick-Checkoff Checkbox Button */}
                      <button
                        type="button"
                        onClick={() => handleStepQuantity(item, deficit)}
                        aria-label={`Mark all ${deficit} ${shortUnit} of ${item.name} as bought`}
                        title={`Quick check-off: mark ${deficit} ${shortUnit} bought`}
                        className="w-6 h-6 rounded-md border-2 border-slate-400 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer group"
                      >
                        <Check className="w-4 h-4 text-transparent group-hover:text-emerald-500 transition-colors" />
                      </button>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        {/* 100% Full Width Title, Wraps Naturally, Never Truncated with ellipsis */}
                        <button
                          type="button"
                          onClick={() => openEditModal(item, item.targetQty)}
                          className="text-left cursor-pointer group block w-full"
                        >
                          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug break-words group-hover:text-emerald-500 transition-colors">
                            {item.name}
                          </h3>
                        </button>

                        {/* Category & Storage Location Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className="px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {SHORT_CATEGORY_LABELS[item.category] || item.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{shortLoc}</span>
                          </span>
                          {item.notes && (
                            <span className="text-slate-500 dark:text-slate-400">
                              ({item.notes})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Deficit Pill + Progress + Mark Bought Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t border-slate-100 dark:border-slate-800/80 sm:border-t-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold tabular-nums text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full whitespace-nowrap">
                          Need {deficit} {shortUnit}
                        </span>
                        <span className="text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                          ({item.currentQty}/{item.targetQty})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditModal(item, item.targetQty)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Bought</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating "Scan Receipt / Label" Action Pill at the bottom of Shopping Mode */}
          <div className="fixed bottom-20 md:bottom-6 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-900/95 text-white px-4 py-2.5 shadow-xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Receipt / Label</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={onOpenBarcodeScanner}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
              >
                <Barcode className="w-4 h-4 text-emerald-400" />
                <span>Scan Barcode</span>
              </button>
            </div>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No inventory items match your search or status filter.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try searching for another item name, category, or stock status (e.g. &ldquo;Low Stock&rdquo;, &ldquo;Stocked&rdquo;, &ldquo;Gas Stove&rdquo;).
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        /* Standard View: Scannable Checklist Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const pct =
              item.targetQty > 0
                ? Math.min(100, Math.round((item.currentQty / item.targetQty) * 100))
                : 100;

            const isMissing = item.currentQty === 0 && item.targetQty > 0;
            const isExpiringSoon =
              item.currentQty > 0 &&
              (item.expiryInfo.status === 'expired' || item.expiryInfo.status === 'amber');
            const isStocked = item.currentQty >= item.targetQty && !isExpiringSoon;

            // Short Status Badge (Strictly status text only — never include quantity or unit)
            let statusText = 'Stocked';
            let statusClasses =
              'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
            let barColorClass = 'bg-emerald-500';

            if (isMissing) {
              statusText = 'Missing';
              statusClasses =
                'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
              barColorClass = 'bg-rose-500';
            } else if (item.expiryInfo.status === 'expired') {
              statusText = 'Expired';
              statusClasses =
                'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
              barColorClass = 'bg-rose-500';
            } else if (!item.isComplete) {
              statusText = 'Low Stock';
              statusClasses =
                'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
              barColorClass = 'bg-amber-500';
            } else if (isExpiringSoon) {
              statusText = 'Expiring Soon';
              statusClasses =
                'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
              barColorClass = 'bg-amber-500';
            }

            const shortUnit = formatShortUnit(item.unit);
            const shortLoc = formatShortLocationLabel(item.storageLocation);
            const isGrabBag =
              item.storageLocation.startsWith('Rucksack #1') ||
              item.storageLocation.startsWith('Rucksack #2');
            const locationBadgeLabel = isGrabBag
              ? `${shortLoc} · ${item.totalWeightKg} kg`
              : shortLoc;

            const formattedExpiry = formatMonthYear(item.expiryDate);
            const tooltipText = describeScalingTooltip(item, item.targetQty, roster, tier);
            const isInfoOpen = openInfoItemId === item.id;
            const isLocOpen = openLocationItemId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors min-w-0 bg-white dark:bg-slate-900 ${
                  isStocked
                    ? 'border-slate-200 dark:border-slate-800'
                    : isMissing || item.expiryInfo.status === 'expired'
                    ? 'border-rose-500/35'
                    : 'border-amber-500/35'
                }`}
              >
                {/* Stacked Card Header: Top Meta Row + 100% Full-Width Title + Progress Bar */}
                <div className="min-w-0">
                  {/* Top Meta Row: Short Status Badge on left, subtle Info icon on right */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${statusClasses}`}
                    >
                      {statusText}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenInfoItemId((prev) => (prev === item.id ? null : item.id))
                      }
                      aria-label={`Scaling formula and weight details for ${item.name}`}
                      title={tooltipText}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title Row: 100% Full Width of Card (Zero Side-by-Side Pill Collision) */}
                  <h3 className="w-full mb-2 text-base font-semibold text-slate-900 dark:text-white leading-snug break-words">
                    {item.name}
                  </h3>

                  {/* On-demand Progressive Disclosure Tooltip for Scaling Math, Package Size & Weight */}
                  {isInfoOpen && (
                    <div className="mb-2 rounded-lg bg-slate-100 dark:bg-slate-800/90 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 flex items-start justify-between gap-2">
                      <span>{tooltipText}</span>
                      <button
                        type="button"
                        onClick={() => setOpenInfoItemId(null)}
                        aria-label="Close formula info"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Slim 6px Horizontal Progress Bar */}
                  <div
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.name} stock progress`}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${barColorClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Balanced Footer Row: Location & Expiry Pills on Left, Compact Stepper on Right */}
                <div className="relative flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  {/* Left Side: Location Pill + Expiry Pill side-by-side */}
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenLocationItemId((prev) => (prev === item.id ? null : item.id))
                      }
                      aria-label={`Change storage location for ${item.name}`}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        isGrabBag
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="max-w-[160px] truncate tabular-nums">
                        {locationBadgeLabel}
                      </span>
                    </button>

                    {/* Hide expiry pill completely if currentQty === 0 */}
                    {item.currentQty > 0 && formattedExpiry && (
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        aria-label={`Edit expiry date for ${item.name}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                          item.expiryInfo.status === 'expired'
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : item.expiryInfo.status === 'amber'
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="tabular-nums">{formattedExpiry}</span>
                      </button>
                    )}

                    {item.currentQty > 0 && !formattedExpiry && (
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 cursor-pointer whitespace-nowrap"
                      >
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>Set Date</span>
                      </button>
                    )}
                  </div>

                  {/* Location Popover Selector when Location Pill is clicked */}
                  {isLocOpen && (
                    <div className="absolute left-0 bottom-12 z-30 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-xl space-y-1">
                      <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>Assign Storage Location</span>
                        <button
                          type="button"
                          onClick={() => setOpenLocationItemId(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {storageLocations.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            onUpdateItem({ ...item, storageLocation: loc });
                            setOpenLocationItemId(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                            item.storageLocation === loc
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{formatShortLocationLabel(loc)}</span>
                          {item.storageLocation === loc && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Right Side: Compact Stepper (- 14 / 10 packs +) */}
                  <div className="ml-auto shrink-0 inline-flex items-center h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(item, -1)}
                      aria-label={`Decrease ${item.name} quantity`}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      title="Tap to enter exact quantity or edit expiry date"
                      className="min-w-[80px] text-center px-2 text-xs font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap cursor-pointer inline-flex items-baseline justify-center gap-1"
                    >
                      <span>
                        {item.currentQty} / {item.targetQty}
                      </span>
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        {shortUnit}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStepQuantity(item, 1)}
                      aria-label={`Increase ${item.name} quantity`}
                      className="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Edit Stock, Expiry & Location (Mobile-Friendly Bottom Sheet) */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-item-modal-title"
        >
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Update Stock &amp; Expiry
                </span>
                <h3
                  id="edit-item-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white mt-0.5"
                >
                  {editingItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmEditModal} className="space-y-4">
              <div>
                <label
                  htmlFor="modal-item-qty"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Current Quantity ({editingItem.unit})
                </label>
                <input
                  id="modal-item-qty"
                  type="number"
                  min={0}
                  required
                  value={modalQty}
                  onChange={(e) => setModalQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-item-expiry"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Best Before / Expiry Date
                </label>
                <input
                  id="modal-item-expiry"
                  type="date"
                  value={modalExpiry}
                  onChange={(e) => setModalExpiry(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-item-location"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Storage Location
                </label>
                <select
                  id="modal-item-location"
                  value={modalLocation}
                  onChange={(e) => setModalLocation(e.target.value as StorageLocation)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  {storageLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Gemini Vision "Scan Receipt / Best Before Stamp" Modal */}
      {showReceiptModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scan-receipt-modal-title"
        >
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Gemini 2.5 Flash Vision
                </span>
                <h3
                  id="scan-receipt-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white mt-0.5"
                >
                  Scan Grocery Receipt or Expiry Stamp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close scan receipt modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Upload a photo of a supermarket receipt or product Best Before stamp to extract item
              names, quantities, and expiry dates directly into your inventory.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => receiptFileInputRef.current?.click()}
                disabled={scanningReceipt}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{scanningReceipt ? 'Scanning Image...' : 'Upload Receipt / Label Photo'}</span>
              </button>
              <input
                ref={receiptFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleReceiptPhotoUpload}
                className="sr-only"
                aria-label="Upload grocery receipt or expiry stamp photo"
              />

              <button
                type="button"
                onClick={handleSimulateReceiptScan}
                disabled={scanningReceipt}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Simulate Scan (Demo)</span>
              </button>
            </div>

            {appliedScanSuccess && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                Scanned items added to your household inventory!
              </div>
            )}

            {scannedItems.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {scanSourceLabel} ({scannedItems.length} items)
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyExtractedItems}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 cursor-pointer"
                  >
                    Merge All into Inventory
                  </button>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {scannedItems.map((sc, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{sc.name}</div>
                        <div className="text-slate-500 dark:text-slate-400">{sc.category}</div>
                      </div>
                      <div className="text-right tabular-nums shrink-0">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{sc.quantity} {sc.unit}
                        </div>
                        <div className="text-slate-500">Exp: {formatMonthYear(sc.expiryDate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Add Custom Item Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-custom-item-title"
        >
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3
                id="add-custom-item-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Add Custom Inventory Item
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="custom-item-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Item Title
                </label>
                <input
                  id="custom-item-name"
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Baby Paracetamol Suspension or Stove + 4x Fuel"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                {parseMultiItemSegments(customName).length > 1 && (
                  <p className="mt-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Multi-item detected: Will automatically split into{' '}
                    <strong>{parseMultiItemSegments(customName).length} separate entries</strong> (
                    {parseMultiItemSegments(customName)
                      .map((s) => s.name)
                      .join(' • ')}
                    ) for independent tracking.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
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
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  >
                    {storageLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label
                    htmlFor="custom-current-qty"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Current Qty
                  </label>
                  <input
                    id="custom-current-qty"
                    type="number"
                    min={0}
                    value={customCurrentQty}
                    onChange={(e) => setCustomCurrentQty(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="custom-target-qty"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Target Qty
                  </label>
                  <input
                    id="custom-target-qty"
                    type="number"
                    min={1}
                    value={customBaseQty}
                    onChange={(e) => setCustomBaseQty(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="custom-unit"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Unit
                  </label>
                  <input
                    id="custom-unit"
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="custom-weight"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Unit kg
                  </label>
                  <input
                    id="custom-weight"
                    type="number"
                    step="0.05"
                    min={0}
                    value={customWeight}
                    onChange={(e) => setCustomWeight(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="custom-expiry"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Expiry Date (Optional)
                </label>
                <input
                  id="custom-expiry"
                  type="date"
                  value={customExpiry}
                  onChange={(e) => setCustomExpiry(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
