import React, { useState } from 'react';
import {
  Calendar,
  Camera,
  ChefHat,
  Flame,
  RefreshCcw,
  Sparkles,
  Upload,
  Utensils,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  BlackoutRecipe,
  InventoryItem,
  ItemCategory,
  RotationLogEntry,
  ScannedReceiptItem,
} from '../types';
import {
  generateExpiryIcs,
  getDaysUntilExpiry,
  getItemExpiryStatus,
} from '../utils/calculations';

interface ExpiryScannerChefTabProps {
  inventory: InventoryItem[];
  onRotateItem: (itemId: string, newExpiryDate: string) => void;
  onApplyScannedItems: (items: ScannedReceiptItem[]) => void;
  rotationLogs: RotationLogEntry[];
}

export const ExpiryScannerChefTab: React.FC<ExpiryScannerChefTabProps> = ({
  inventory,
  onRotateItem,
  onApplyScannedItems,
  rotationLogs,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'expired' | 'expiring_soon' | 'good'>(
    'ALL'
  );

  // Rotate / Consume modal state
  const [rotatingItem, setRotatingItem] = useState<InventoryItem | null>(null);
  const [replacementExpiry, setReplacementExpiry] = useState<string>(
    new Date(Date.now() + 240 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );

  // Gemini Vision Scanner modal state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannedPreview, setScannedPreview] = useState<ScannedReceiptItem[]>([]);
  const [scannerSource, setScannerSource] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // AI Blackout Chef state
  const [chefLoading, setChefLoading] = useState(false);
  const [recipes, setRecipes] = useState<BlackoutRecipe[]>([]);
  const [chefSource, setChefSource] = useState<string | null>(null);
  const [icsFeedback, setIcsFeedback] = useState<string | null>(null);

  const consumableItems = inventory.filter((i) => Boolean(i.expiryDate));
  const expiredCount = consumableItems.filter(
    (i) => getItemExpiryStatus(i.expiryDate) === 'expired'
  ).length;
  const rotateSoonCount = consumableItems.filter(
    (i) => getItemExpiryStatus(i.expiryDate) === 'expiring_soon'
  ).length;
  const goodCount = consumableItems.filter(
    (i) => getItemExpiryStatus(i.expiryDate) === 'good'
  ).length;

  const filteredItems = consumableItems
    .filter((item) => {
      if (statusFilter === 'ALL') return true;
      return getItemExpiryStatus(item.expiryDate) === statusFilter;
    })
    .sort((a, b) => {
      const da = getDaysUntilExpiry(a.expiryDate) ?? 9999;
      const db = getDaysUntilExpiry(b.expiryDate) ?? 9999;
      return da - db;
    });

  // Export Reminders (.ics)
  const handleDownloadIcs = () => {
    const icsContent = generateExpiryIcs(consumableItems);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `be-ready-pantry-reminders-${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIcsFeedback(`Exported ${consumableItems.length} reminders (set 30 days prior to expiry) to .ics`);
  };

  // Rotate / Consume Handler
  const handleConfirmRotate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotatingItem || !replacementExpiry) return;
    onRotateItem(rotatingItem.id, replacementExpiry);
    setRotatingItem(null);
  };

  // Gemini Vision Scan Handler
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = String(reader.result || '');
      await executeVisionScan(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const executeVisionScan = async (imageBase64?: string, mimeType?: string) => {
    setScannerLoading(true);
    try {
      const response = await fetch('/api/gemini/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          todayIso: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = (await response.json()) as {
        source: string;
        items: ScannedReceiptItem[];
      };
      setScannerSource(data.source);
      setScannedPreview(data.items || []);
    } catch {
      // Offline client fallback
      const nextMonth = new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      setScannerSource('offline-demo');
      setScannedPreview([
        {
          name: 'Sterile Ready-to-Feed Liquid Infant Formula (200ml)',
          quantity: 16,
          unit: 'bottles (200ml)',
          expiryDate: nextMonth,
          category: 'Infant Care (Critical)',
        },
        {
          name: 'Tinned Lentil Stew, Chickpeas & Mackerel Fillets',
          quantity: 12,
          unit: 'tins/pouches',
          expiryDate: new Date(Date.now() + 210 * 24 * 3600 * 1000).toISOString().slice(0, 10),
          category: 'Non-Perishable Food',
        },
      ]);
    } finally {
      setScannerLoading(false);
    }
  };

  const handleCommitScannedItems = () => {
    if (scannedPreview.length === 0) return;
    onApplyScannedItems(scannedPreview);
    setScannedPreview([]);
    setShowScannerModal(false);
  };

  // AI "Blackout Chef" Recipe Generator
  const handleGenerateRecipes = async () => {
    setChefLoading(true);
    const expiringItems = consumableItems.filter((i) => {
      const st = getItemExpiryStatus(i.expiryDate);
      return st === 'expiring_soon' || st === 'expired';
    });
    const pantryStaples = inventory.filter((i) => i.category === 'Non-Perishable Food');

    try {
      const response = await fetch('/api/gemini/blackout-chef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiringItems, pantryStaples }),
      });
      const data = (await response.json()) as {
        source: string;
        recipes: BlackoutRecipe[];
      };
      setChefSource(data.source);
      setRecipes(data.recipes || []);
    } catch {
      setChefSource('offline-fallback');
    } finally {
      setChefLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header: FIFO Filters, Vision Scanner, AI Blackout Chef & .ics Export */}
      <section
        aria-label="FIFO Pantry Controls and AI Tools"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
              FIFO LIVING PANTRY · ZERO-WASTE ROTATION ENGINE
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Expiry Tracker, Gemini Vision Scanner &amp; AI Blackout Chef
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenBarcodeScanner}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Barcode className="w-4 h-4" />
              <span>Scan Barcode (Weight &amp; Shelf Life)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Camera className="w-4 h-4 text-emerald-500" />
              <span>Scan Receipt (Gemini Vision)</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateRecipes}
              disabled={chefLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ChefHat className="w-4 h-4 text-amber-500" />
              <span>
                {chefLoading
                  ? 'Generating Recipes...'
                  : 'AI Blackout Chef (2 Rotation & Stove Meals)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadIcs}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Export Reminders (.ics)</span>
            </button>
          </div>
        </div>

        {icsFeedback && (
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{icsFeedback}</span>
          </div>
        )}

        {/* FIFO Status Filter Tabs */}
        <div
          role="group"
          aria-label="Filter by Expiry Status"
          className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800"
        >
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Consumables ({consumableItems.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('expired')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'expired'
                ? 'bg-rose-600 text-white'
                : 'border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            Expired ({expiredCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('expiring_soon')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'expiring_soon'
                ? 'bg-amber-500 text-slate-950'
                : 'border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            Rotate Soon / &lt;30 Days ({rotateSoonCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('good')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'good'
                ? 'bg-emerald-600 text-white'
                : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            Good / Fresh ({goodCount})
          </button>
        </div>
      </section>

      {/* AI "Blackout Chef" Recipe Cards (when generated) */}
      {recipes.length > 0 && (
        <section aria-label="AI Blackout Chef Recipes" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
                AI BLACKOUT CHEF · POWERED BY GEMINI 2.5 FLASH ({chefSource})
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Dual-Mode Pantry Rotation &amp; Single-Burner Blackout Recipes
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setRecipes([])}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Dismiss Recipes
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recipes.map((recipe, idx) => {
              const isBlackout = recipe.mode.toLowerCase().includes('blackout');
              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-5 space-y-4 ${
                    isBlackout
                      ? 'border-amber-500/60 bg-amber-950/15 dark:bg-amber-950/25'
                      : 'border-emerald-500/50 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        {recipe.mode.toUpperCase()}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {recipe.title}
                      </h4>
                    </div>
                    {isBlackout ? (
                      <Flame className="w-5 h-5 text-amber-500 shrink-0" />
                    ) : (
                      <Utensils className="w-5 h-5 text-emerald-500 shrink-0" />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-slate-500 block">Prep Time</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {recipe.prepTimeMinutes} mins
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Stove Gas Burn</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {recipe.fuelTimeMinutes} mins
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Water Required</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {recipe.waterNeededMl} ml
                      </strong>
                    </div>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Expiring Stock &amp; Staple Ingredients:
                    </div>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
                      {recipe.ingredientsUsed.map((ing, i) => (
                        <li key={i}>{ing}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Method:
                    </div>
                    <ol className="list-decimal list-inside text-slate-600 dark:text-slate-300 space-y-1">
                      {recipe.steps.map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
                    <strong>Tactical Note:</strong> {recipe.safetyOrConservationTip}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FIFO Consumable Items List */}
      <section
        aria-label="FIFO Consumable Inventory List"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800"
      >
        {filteredItems.map((item) => {
          const daysLeft = getDaysUntilExpiry(item.expiryDate) ?? 0;
          const status = getItemExpiryStatus(item.expiryDate);

          return (
            <div
              key={item.id}
              className="p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span
                    className={`font-bold ${
                      status === 'expired'
                        ? 'text-rose-600 dark:text-rose-400'
                        : status === 'expiring_soon'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {status === 'expired'
                      ? `EXPIRED (${Math.abs(daysLeft)}d ago)`
                      : status === 'expiring_soon'
                      ? `ROTATE SOON (${daysLeft}d remaining)`
                      : `GOOD (${daysLeft}d remaining)`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Best Before: {item.expiryDate}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.storageLocation}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {item.name}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Current Stock: {item.currentQty} {item.unit}
                  {item.lastRotatedDate ? ` · Last rotated: ${item.lastRotatedDate}` : ''}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRotatingItem(item);
                  setReplacementExpiry(
                    new Date(Date.now() + 240 * 24 * 3600 * 1000).toISOString().slice(0, 10)
                  );
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  status === 'expired'
                    ? 'bg-rose-600 text-white hover:bg-rose-500'
                    : status === 'expiring_soon'
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Rotate / Consume &amp; Set New Expiry</span>
              </button>
            </div>
          );
        })}
      </section>

      {/* Recent Rotation Log */}
      {rotationLogs.length > 0 && (
        <section
          aria-label="Recent FIFO Rotation Log"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
        >
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
            Recent Kitchen Rotation Log ({rotationLogs.length})
          </h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-mono">
            {rotationLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-800 dark:text-slate-200">
                  Moved <strong>{log.itemName}</strong> ({log.quantityRotated} units) to everyday kitchen
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Old Exp: {log.oldExpiryDate || 'N/A'} &rarr; New Batch Exp: {log.newExpiryDate}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rotate / Consume Modal */}
      {rotatingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rotate-modal-title"
        >
          <form
            onSubmit={handleConfirmRotate}
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3
                id="rotate-modal-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                FIFO Rotate to Kitchen &amp; Log Replacement
              </h3>
              <button
                type="button"
                onClick={() => setRotatingItem(null)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close Rotate modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Moving expiring batch of <strong>{rotatingItem.name}</strong> (Old expiry:{' '}
              <span className="font-mono">{rotatingItem.expiryDate}</span>) to your everyday kitchen and setting the replacement batch's Best-Before date.
            </p>

            <div>
              <label
                htmlFor="replacement-expiry-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Replacement Item New Expiry Date
              </label>
              <input
                id="replacement-expiry-input"
                type="date"
                required
                value={replacementExpiry}
                onChange={(e) => setReplacementExpiry(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRotatingItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
              >
                Confirm Rotation &amp; Update Expiry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gemini Vision "Scan to Stock" Modal */}
      {showScannerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vision-scanner-title"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  MULTIMODAL INVENTORY SCANNER · GEMINI 2.5 FLASH
                </div>
                <h3
                  id="vision-scanner-title"
                  className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                  Scan Grocery Receipt or Best-Before Stamp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScannerModal(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close Scan to Stock modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Upload a photo of a supermarket receipt or a product Best-Before stamp to automatically extract quantities and expiry dates—or click <strong>Simulate Scan</strong> to test with sample receipt data.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 cursor-pointer hover:border-emerald-500 transition-colors">
                <Upload className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {uploadedFileName || 'Upload Receipt / Stamp Photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => executeVisionScan()}
                disabled={scannerLoading}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {scannerLoading ? 'Scanning with Gemini...' : 'Simulate Scan (Sample Receipt)'}
                </span>
              </button>
            </div>

            {scannedPreview.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  EXTRACTED {scannedPreview.length} ITEMS ({scannerSource}):
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 max-h-56 overflow-y-auto">
                  {scannedPreview.map((sc, i) => (
                    <div
                      key={i}
                      className="p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {sc.name}
                        </div>
                        <div className="text-slate-500 font-mono">
                          {sc.category as ItemCategory} · Exp: {sc.expiryDate}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{sc.quantity} {sc.unit}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setScannedPreview([])}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitScannedItems}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    Add Scanned Items to Inventory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
