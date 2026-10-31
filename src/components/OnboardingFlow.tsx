import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Users,
  Scale,
  PackageCheck,
  Compass,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  HouseholdMember,
  InventoryItem,
  MemberType,
  PreparednessTier,
} from '../types';
import {
  calculateHouseholdScalingSummary,
  calculateTargetQuantity,
} from '../utils/calculations';

interface OnboardingFlowProps {
  roster: HouseholdMember[];
  tier: PreparednessTier;
  onChangeTier: (tier: PreparednessTier) => void;
  onAddMember: (member: Omit<HouseholdMember, 'id'>) => void;
  inventory: InventoryItem[];
  onUpdateItemQty: (itemId: string, newQty: number, newExpiry?: string) => void;
  onNavigateTab: (tab: 'dashboard' | 'checklist' | 'expiry' | 'irish') => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCompleteOnboarding: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  roster,
  tier,
  onChangeTier,
  onAddMember,
  inventory,
  onUpdateItemQty,
  onNavigateTab,
  isExpanded,
  onToggleExpand,
  onCompleteOnboarding,
}) => {
  const [step, setStep] = useState<number>(1);
  const [memberType, setMemberType] = useState<MemberType>('child');
  const [memberName, setMemberName] = useState<string>('');
  const [memberNotes, setMemberNotes] = useState<string>('');
  const [memberWeight, setMemberWeight] = useState<string>('18');
  const [memberAge, setMemberAge] = useState<string>('5');
  const [memberDob, setMemberDob] = useState<string>(
    new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [petSpecies, setPetSpecies] = useState<'Cat' | 'Dog' | 'Other'>('Cat');
  const [petMicrochip, setPetMicrochip] = useState<string>('972274000991102');
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  const scalingSummary = calculateHouseholdScalingSummary(roster, tier);

  const handleQuickAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    if (memberType === 'adult') {
      onAddMember({
        type: 'adult',
        name: memberName.trim(),
        medicalNotes: memberNotes.trim() || 'No special medical notes',
      });
    } else if (memberType === 'child') {
      onAddMember({
        type: 'child',
        name: memberName.trim(),
        ageYears: Number(memberAge) || 5,
        weightKg: Number(memberWeight) || 18,
      });
    } else if (memberType === 'infant') {
      onAddMember({
        type: 'infant',
        name: memberName.trim(),
        birthDate: memberDob,
      });
    } else {
      onAddMember({
        type: 'pet',
        name: memberName.trim(),
        species: petSpecies,
        microchipNumber: petMicrochip.trim() || '972274000000000',
      });
    }

    setAddedFeedback(`Added ${memberName.trim()} (${memberType}) — Target quantities recalculated!`);
    setMemberName('');
  };

  if (!isExpanded) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Interactive Household Onboarding &amp; Scaling Walkthrough
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              4-step guided setup: Explore tabs · Configure Household Roster · Test Dynamic Scaling · Set Initial Inventory
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleExpand}
          className="px-3.5 py-2 rounded-lg border border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-600/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Open Onboarding Guide
        </button>
      </div>
    );
  }

  const starterItems = inventory.slice(0, 4);

  return (
    <section
      aria-label="User Onboarding Guide"
      className="rounded-xl border border-emerald-500/40 bg-white dark:bg-slate-900 p-6 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
            Guided Setup · Step {step} of 4
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Welcome to Be Ready: Household Emergency &amp; Rotation Manager
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                step === s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              0{s}
            </button>
          ))}
          <button
            type="button"
            onClick={onCompleteOnboarding}
            className="ml-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
          >
            Minimize Guide
          </button>
        </div>
      </div>

      {/* Step 1: Main Tabs Introduction */}
      {step === 1 && (
        <div className="pt-5 space-y-4">
          <div className="flex items-start gap-3">
            <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                01. Four Operational Modules for Complete Household Resilience
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Be Ready is engineered around civil-defense standards (Ireland OEP 72-Hour Baseline &amp; German BBK 10-Day Pantry). Click any module below to preview it or continue to Step 2.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  Tab 01 · Command Center
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  Dashboard &amp; Storm Mode
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Live Met Éireann weather warnings, 60-minute Red Warning pre-flight countdown, Household Roster, Infant Milestone alerts, and 90-Day Power Cadence.
                </p>
              </div>
              <span className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Currently Active View
              </span>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  Tab 02 · Supply &amp; Loadout
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  Dynamic Checklist &amp; Shopping
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Auto-scaled quantities across 8 categories, supermarket Shopping Mode toggle, and live Grab-Bag Weight Meters for Rucksack #1 &amp; Rucksack #2.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('checklist')}
                className="mt-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-200 hover:text-emerald-500 transition-colors cursor-pointer"
              >
                Preview Checklist &rarr;
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  Tab 03 · Zero-Waste Rotation
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  Expiry, Scanner &amp; Blackout Chef
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  FIFO Living Pantry status filter, Gemini 2.5 Flash Vision receipt/date scanner, AI Blackout Chef recipe generator, and .ics calendar reminder export.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('expiry')}
                className="mt-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-200 hover:text-emerald-500 transition-colors cursor-pointer"
              >
                Preview FIFO &amp; AI Scanner &rarr;
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  Tab 04 · Civil Defense
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  1-Page Irish Action Plan
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Eircode, MPRN/GPRN/WPRN utility cards, 30-second Electricity/Gas/Water shut-off verification, 5-minute parent role split, and A4 Print View.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('irish')}
                className="mt-3 text-left text-xs font-semibold text-slate-900 dark:text-slate-200 hover:text-emerald-500 transition-colors cursor-pointer"
              >
                Preview Irish Action Plan &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Household Roster Setup */}
      {step === 2 && (
        <div className="pt-5 space-y-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                02. Step-by-Step Household Roster Setup
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Your household comes pre-loaded with <strong>2 Adults, 1 Infant (1 month old), and 2 Cats</strong>. Try adding an additional household member below (such as a Child, Adult, Infant, or Pet) to see how medical dosing, microchip IDs, and supply targets respond.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleQuickAddMember}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
          >
            <div className="md:col-span-3">
              <label
                htmlFor="onboard-member-type"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                1. Select Member Type
              </label>
              <select
                id="onboard-member-type"
                value={memberType}
                onChange={(e) => setMemberType(e.target.value as MemberType)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="child">Child (1–12 yrs)</option>
                <option value="adult">Adult</option>
                <option value="infant">Infant (&lt;1 yr)</option>
                <option value="pet">Pet (Cat/Dog)</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="onboard-member-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                2. Name
              </label>
              <input
                id="onboard-member-name"
                type="text"
                required
                placeholder={
                  memberType === 'child'
                    ? 'e.g. Saoirse Byrne'
                    : memberType === 'pet'
                    ? 'e.g. Rua'
                    : 'e.g. Niamh Byrne'
                }
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            {memberType === 'adult' && (
              <div className="md:col-span-4">
                <label
                  htmlFor="onboard-adult-notes"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  3. Prescription / Medical Notes
                </label>
                <input
                  id="onboard-adult-notes"
                  type="text"
                  placeholder="e.g. EpiPen, Blood pressure meds"
                  value={memberNotes}
                  onChange={(e) => setMemberNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {memberType === 'child' && (
              <>
                <div className="md:col-span-2">
                  <label
                    htmlFor="onboard-child-age"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    3. Age (Yrs)
                  </label>
                  <input
                    id="onboard-child-age"
                    type="number"
                    min={1}
                    max={12}
                    value={memberAge}
                    onChange={(e) => setMemberAge(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label
                    htmlFor="onboard-child-weight"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    4. Weight (kg)
                  </label>
                  <input
                    id="onboard-child-weight"
                    type="number"
                    min={8}
                    max={60}
                    value={memberWeight}
                    onChange={(e) => setMemberWeight(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
              </>
            )}

            {memberType === 'infant' && (
              <div className="md:col-span-4">
                <label
                  htmlFor="onboard-infant-dob"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  3. Infant Birth Date (Auto-Milestone Alerts)
                </label>
                <input
                  id="onboard-infant-dob"
                  type="date"
                  value={memberDob}
                  onChange={(e) => setMemberDob(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {memberType === 'pet' && (
              <>
                <div className="md:col-span-2">
                  <label
                    htmlFor="onboard-pet-species"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    3. Species
                  </label>
                  <select
                    id="onboard-pet-species"
                    value={petSpecies}
                    onChange={(e) => setPetSpecies(e.target.value as 'Cat' | 'Dog' | 'Other')}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="Cat">Cat</option>
                    <option value="Dog">Dog</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label
                    htmlFor="onboard-pet-chip"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    4. Microchip #
                  </label>
                  <input
                    id="onboard-pet-chip"
                    type="text"
                    value={petMicrochip}
                    onChange={(e) => setPetMicrochip(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            </div>
          </form>

          {addedFeedback && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{addedFeedback}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Dynamic Quantity Scaling Feature */}
      {step === 3 && (
        <div className="pt-5 space-y-4">
          <div className="flex items-start gap-3">
            <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                03. How the Auto-Scaling Quantity Engine Works
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Toggle between <strong>Tier 1 (72-Hour Ireland/UK Baseline)</strong> and <strong>Tier 2 (10-Day German BBK Home Pantry + 48h Grab Bag)</strong> below to see how Be Ready scales every water, calorie, infant formula, and pet requirement in real time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeTier('tier1_72h')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tier === 'tier1_72h'
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Tier 1: 72-Hour Baseline (3 Days — IE/UK Standard)
            </button>
            <button
              type="button"
              onClick={() => onChangeTier('tier2_10d')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tier === 'tier2_10d'
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Tier 2: 10-Day Home Pantry + 48h Grab Bag (German BBK Standard)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
              <div className="text-slate-500 dark:text-slate-400">Human &amp; Infant Water</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {scalingSummary.humanDrinkingCookingWaterLiters}L + {scalingSummary.infantWaterLiters}L infant
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">
                3L/adult · 2L/child · 1L/infant per day ({scalingSummary.days}d)
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
              <div className="text-slate-500 dark:text-slate-400">Pet Water &amp; Wet Rations</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {scalingSummary.petWaterLiters}L water · {scalingSummary.petWetPouches} pouches
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">
                0.5L water &amp; 2 pouches per pet/day ({scalingSummary.days}d)
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
              <div className="text-slate-500 dark:text-slate-400">Infant RTF Formula &amp; Nappies</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {scalingSummary.infantFormulaBottles} bottles · {scalingSummary.infantNappies} nappies
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">
                8x 200ml RTF + 8 teats + 10 nappies/day
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
              <div className="text-slate-500 dark:text-slate-400">Energy &amp; Carriers</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {scalingSummary.totalKcalRequired.toLocaleString()} kcal · {scalingSummary.petCarriers} carriers
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">
                2,200 kcal/adult · 1,500 kcal/child per day
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Setting Initial Inventory */}
      {step === 4 && (
        <div className="pt-5 space-y-4">
          <div className="flex items-start gap-3">
            <PackageCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                04. Step-by-Step Guide to Setting Initial Inventory
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Audit what you already have in your kitchen cupboard or under the stairs. Adjust quantities directly below or click <strong>Match Target</strong> to stock an item to its full {scalingSummary.days}-day requirement.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
            {starterItems.map((item) => {
              const target = calculateTargetQuantity(
                item.baseQty,
                item.scalingRule,
                roster,
                tier
              );
              const isStocked = item.currentQty >= target;

              return (
                <div
                  key={item.id}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {item.category} · Location: {item.storageLocation} · Current:{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        {item.currentQty}
                      </strong>{' '}
                      / {target} {item.unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateItemQty(item.id, Math.max(0, item.currentQty - 1))
                      }
                      className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      aria-label={`Decrease ${item.name}`}
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateItemQty(item.id, item.currentQty + 1)}
                      className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      aria-label={`Increase ${item.name}`}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateItemQty(item.id, target)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        isStocked
                          ? 'bg-emerald-600/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {isStocked ? 'Stocked to Target' : `Set to ${target} ${item.unit}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Step {step} / 4
        </div>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            <span>Next Step</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onCompleteOnboarding}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Finish Onboarding &amp; Go to Dashboard</span>
          </button>
        )}
      </div>
    </section>
  );
};
