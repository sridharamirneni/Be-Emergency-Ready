import React, { useEffect, useRef, useState } from 'react';
import {
  Barcode,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  PackagePlus,
  Scale,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  InventoryItem,
  ItemCategory,
  ScalingRule,
  StorageLocation,
} from '../types';
import {
  BarcodeProductSuggestion,
  COMMON_PANTRY_BARCODES,
  calculateSuggestedExpiryFromShelfLife,
  lookupBarcodeItem,
} from '../utils/barcodeCatalog';

const STORAGE_LOCATIONS: StorageLocation[] = [
  'Kitchen Pantry',
  'Under Stairs',
  'Rucksack #1 (Parent 1 - Baby & Docs Lead)',
  'Rucksack #2 (Parent 2 - Pets & Utilities Lead)',
];

const ALL_CATEGORIES: ItemCategory[] = [
  'Water & Hydration',
  'Non-Perishable Food',
  'Infant Care (Critical)',
  'Pet Supplies',
  'Medical & Hygiene',
  'Light, Warmth & Cooking',
  'Comms, Power & Cash',
  'Important Documents',
];

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrUpdateBarcodeItem: (payload: {
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
  }) => void;
  existingInventory?: InventoryItem[];
  storageLocations?: StorageLocation[];
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onAddOrUpdateBarcodeItem,
  storageLocations = STORAGE_LOCATIONS,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorIntervalRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStatusMessage, setCameraStatusMessage] = useState<string>(
    'Point camera at an EAN-13 / UPC barcode, enter a barcode below, or select a common pantry barcode.'
  );
  const [barcodeInput, setBarcodeInput] = useState<string>('5000157024671');
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<BarcodeProductSuggestion>(() => lookupBarcodeItem('5000157024671'));

  // Editable fields populated from the barcode suggestion
  const [itemName, setItemName] = useState<string>(selectedSuggestion.name);
  const [itemCategory, setItemCategory] = useState<ItemCategory>(selectedSuggestion.category);
  const [itemQty, setItemQty] = useState<string>(String(selectedSuggestion.defaultQty));
  const [itemUnit, setItemUnit] = useState<string>(selectedSuggestion.unit);
  const [itemWeightKg, setItemWeightKg] = useState<string>(
    String(selectedSuggestion.averageUnitWeightKg)
  );
  const [shelfLifeDays, setShelfLifeDays] = useState<string>(
    String(selectedSuggestion.standardShelfLifeDays)
  );
  const [itemExpiryDate, setItemExpiryDate] = useState<string>(
    selectedSuggestion.suggestedExpiryDate
  );
  const [itemLocation, setItemLocation] = useState<StorageLocation>(
    selectedSuggestion.defaultLocation
  );
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);

  const applySuggestion = (suggestion: BarcodeProductSuggestion) => {
    setSelectedSuggestion(suggestion);
    setBarcodeInput(suggestion.ean);
    setItemName(suggestion.name);
    setItemCategory(suggestion.category);
    setItemQty(String(suggestion.defaultQty));
    setItemUnit(suggestion.unit);
    setItemWeightKg(String(suggestion.averageUnitWeightKg));
    setShelfLifeDays(String(suggestion.standardShelfLifeDays));
    setItemExpiryDate(suggestion.suggestedExpiryDate);
    setItemLocation(suggestion.defaultLocation);
  };

  const stopCamera = () => {
    if (detectorIntervalRef.current) {
      window.clearInterval(detectorIntervalRef.current);
      detectorIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCameraStream = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatusMessage(
        'Camera API unavailable in this browser context. Use Quick-Scan Common Barcodes or manual EAN entry below.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setCameraStatusMessage('Camera active — scanning for EAN-13 / UPC-A barcodes...');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Use native BarcodeDetector if available in Chromium
      const BarcodeDetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => {
            detect: (
              source: HTMLVideoElement
            ) => Promise<Array<{ rawValue?: string }>>;
          };
        }
      ).BarcodeDetector;

      if (BarcodeDetectorCtor) {
        const detector = new BarcodeDetectorCtor({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });
        detectorIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results && results.length > 0 && results[0].rawValue) {
              const code = results[0].rawValue;
              handleBarcodeDetected(code);
              stopCamera();
              setCameraStatusMessage(`Detected barcode ${code} via camera!`);
            }
          } catch {
            // Ignore frame errors
          }
        }, 450);
      }
    } catch {
      setCameraStatusMessage(
        'Camera permission declined or no hardware camera detected. Select a common pantry barcode below or enter an EAN code.'
      );
      setCameraActive(false);
    }
  };

  const handleBarcodeDetected = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    const localMatch = COMMON_PANTRY_BARCODES.find((item) => item.ean === clean);
    if (localMatch) {
      const suggestion = lookupBarcodeItem(clean);
      applySuggestion(suggestion);
      return;
    }

    // Check OpenFoodFacts for unknown barcodes if online, with immediate local fallback
    setLookupLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json`,
        { signal: controller.signal }
      );
      clearTimeout(timer);

      if (res.ok) {
        const data = (await res.json()) as {
          status?: number;
          product?: {
            product_name?: string;
            brands?: string;
            product_quantity?: number | string;
            quantity?: string;
          };
        };
        if (data.status === 1 && data.product?.product_name) {
          const grams = Number(data.product.product_quantity) || 400;
          const weightKg = Math.max(0.05, Math.round((grams / 1000) * 1.1 * 100) / 100);
          const customSuggestion: BarcodeProductSuggestion = {
            ean: clean,
            name: `${data.product.product_name}${data.product.quantity ? ` (${data.product.quantity})` : ''}`,
            brand: data.product.brands || 'OpenFoodFacts Verified',
            category: 'Non-Perishable Food',
            unit: 'units',
            averageUnitWeightKg: weightKg,
            standardShelfLifeDays: 540,
            shelfLifeLabel: '18 Months (540 days) standard ambient shelf life',
            suggestedExpiryDate: calculateSuggestedExpiryFromShelfLife(540),
            defaultQty: 2,
            scalingRule: 'perAdultPerDay',
            defaultLocation: 'Kitchen Pantry',
            notes: `Identified via barcode ${clean} (${weightKg} kg avg unit weight)`,
          };
          applySuggestion(customSuggestion);
          setLookupLoading(false);
          return;
        }
      }
    } catch {
      // Fallback to local heuristic
    } finally {
      setLookupLoading(false);
    }

    applySuggestion(lookupBarcodeItem(clean));
  };

  const handleShelfLifeDaysChange = (daysVal: string) => {
    setShelfLifeDays(daysVal);
    const num = Number(daysVal);
    if (!Number.isNaN(num) && num >= 0) {
      setItemExpiryDate(calculateSuggestedExpiryFromShelfLife(num));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    onAddOrUpdateBarcodeItem({
      ean: barcodeInput.trim() || selectedSuggestion.ean,
      name: itemName.trim(),
      category: itemCategory,
      quantityToAdd: Math.max(1, Number(itemQty) || 1),
      unit: itemUnit.trim() || 'units',
      unitWeightKg: Math.max(0.01, Number(itemWeightKg) || 0.4),
      expiryDate: itemExpiryDate,
      storageLocation: itemLocation,
      scalingRule: selectedSuggestion.scalingRule,
      notes: `${selectedSuggestion.brand} · Barcode EAN ${barcodeInput} · Avg weight ${itemWeightKg} kg · Standard shelf life ${shelfLifeDays}d`,
    });
    onClose();
  };

  if (!isOpen) return null;

  const totalBatchWeightKg =
    Math.round((Number(itemQty) || 0) * (Number(itemWeightKg) || 0) * 100) / 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-scanner-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Camera Barcode Scanner • Auto Weight &amp; Shelf-Life Engine
              </div>
              <h3
                id="barcode-scanner-modal-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Scan Product Barcode (EAN-13 / UPC)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close Barcode Scanner Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder & Manual EAN Input Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-3 flex flex-col justify-between relative overflow-hidden min-h-[165px]">
            {cameraActive ? (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-32 object-cover rounded-lg border border-emerald-500/40"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-3">
                <Camera className="w-7 h-7 text-emerald-400 mb-1.5" />
                <span className="text-xs font-medium text-slate-300">
                  Device Camera Viewfinder
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Supports EAN-13, UPC-A &amp; Code-128
                </span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCameraStream}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Activate Device Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              )}
            </div>
          </div>

          {/* Manual EAN Lookup + Quick-Scan Common Irish Pantry Barcodes */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-3">
            <div>
              <label
                htmlFor="ean-barcode-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Enter or Scan EAN-13 / UPC Barcode
              </label>
              <div className="flex gap-2">
                <input
                  id="ean-barcode-input"
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="e.g. 5000157024671"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs tabular-nums text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleBarcodeDetected(barcodeInput)}
                  disabled={lookupLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{lookupLoading ? 'Looking up...' : 'Identify Barcode'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {cameraStatusMessage}
              </p>
            </div>

            {/* Quick-Scan Common Pantry Barcodes */}
            <div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Quick-Scan Common Pantry Barcodes (Instant Presets):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PANTRY_BARCODES.map((preset) => {
                  const isSelected = selectedSuggestion.ean === preset.ean;
                  return (
                    <button
                      key={preset.ean}
                      type="button"
                      onClick={() => applySuggestion(lookupBarcodeItem(preset.ean))}
                      className={`px-2.5 py-1 rounded-md text-xs tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      {preset.name.split('(')[0].trim().slice(0, 26)} ({preset.averageUnitWeightKg}kg ·{' '}
                      {Math.round(preset.standardShelfLifeDays / 30)}m)
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Weight & Standard Shelf Life Intelligence Banner */}
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Scale className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">
                Suggested Avg Weight
              </div>
              <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                {selectedSuggestion.averageUnitWeightKg} kg / unit
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                Batch ({itemQty}x): {totalBatchWeightKg} kg total
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">
                Standard Shelf Life
              </div>
              <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                {shelfLifeDays} days (~{Math.round(Number(shelfLifeDays) / 30)} mos)
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">
                {selectedSuggestion.shelfLifeLabel}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">
                Suggested Expiry Date
              </div>
              <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {itemExpiryDate}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                EAN: {selectedSuggestion.ean}
              </div>
            </div>
          </div>
        </div>

        {/* Editable Product Confirmation Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label
                htmlFor="scanned-item-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Identified Pantry Item Name
              </label>
              <input
                id="scanned-item-name"
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-5">
              <label
                htmlFor="scanned-item-category"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Category
              </label>
              <select
                id="scanned-item-category"
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value as ItemCategory)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3 flex flex-col justify-between">
              <label
                htmlFor="scanned-item-qty"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 truncate"
              >
                Quantity to Add
              </label>
              <input
                id="scanned-item-qty"
                type="number"
                min={1}
                step="1"
                required
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-3 flex flex-col justify-between">
              <label
                htmlFor="scanned-item-weight"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 truncate"
              >
                Avg Weight (kg)
              </label>
              <input
                id="scanned-item-weight"
                type="number"
                step="0.01"
                min={0.01}
                required
                value={itemWeightKg}
                onChange={(e) => setItemWeightKg(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-3 flex flex-col justify-between">
              <label
                htmlFor="scanned-item-shelflife"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 truncate"
              >
                Shelf Life (Days)
              </label>
              <input
                id="scanned-item-shelflife"
                type="number"
                min={1}
                value={shelfLifeDays}
                onChange={(e) => handleShelfLifeDaysChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-3 flex flex-col justify-between">
              <label
                htmlFor="scanned-item-expiry"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 truncate"
              >
                Suggested Expiry
              </label>
              <input
                id="scanned-item-expiry"
                type="date"
                required
                value={itemExpiryDate}
                onChange={(e) => setItemExpiryDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-12">
              <label
                htmlFor="scanned-item-location"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Assign Storage Location (Updates Grab-Bag Weight Tracker Automatically)
              </label>
              <select
                id="scanned-item-location"
                value={itemLocation}
                onChange={(e) => setItemLocation(e.target.value as StorageLocation)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                {storageLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedSuggestion.notes}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Add Scanned Item to Inventory</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
