import React from 'react';
import {
  CheckSquare,
  Flame,
  PhoneCall,
  Printer,
  Radio,
  ShieldCheck,
  Square,
  Zap,
  Droplets,
  Users,
} from 'lucide-react';
import { HouseholdMember, IrishHouseholdPlan } from '../types';

interface IrishActionPlanTabProps {
  plan: IrishHouseholdPlan;
  roster: HouseholdMember[];
  onUpdatePlan: (updated: IrishHouseholdPlan) => void;
}

export const IrishActionPlanTab: React.FC<IrishActionPlanTabProps> = ({
  plan,
  roster,
  onUpdatePlan,
}) => {
  const pets = roster.filter((m) => m.type === 'pet');
  const infants = roster.filter((m) => m.type === 'infant');

  const toggleUtilityStep = (
    utility: 'electricity' | 'gas' | 'water',
    index: number
  ) => {
    const current = plan.utilities[utility];
    const nextSteps = [...current.stepsVerified];
    nextSteps[index] = !nextSteps[index];

    onUpdatePlan({
      ...plan,
      utilities: {
        ...plan.utilities,
        [utility]: {
          ...current,
          stepsVerified: nextSteps,
          lastVerifiedDate: new Date().toISOString().slice(0, 10),
        },
      },
    });
  };

  const updateUtilityLocation = (
    utility: 'electricity' | 'gas' | 'water',
    location: string
  ) => {
    onUpdatePlan({
      ...plan,
      utilities: {
        ...plan.utilities,
        [utility]: {
          ...plan.utilities[utility],
          location,
        },
      },
    });
  };

  return (
    <div className="space-y-6 print-sheet">
      {/* Top Action Header with Print 1-Page Action Plan Button */}
      <section
        aria-label="Irish Emergency Action Plan Header"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4 print-card"
      >
        <div>
          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
            IRELAND CIVIL DEFENSE · 1-PAGE HOUSEHOLD ACTION PLAN (DOKUMENTENMAPPE EDITION)
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Irish Household Identity, Utility Shut-Offs &amp; 5-Minute Evacuation Split
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Keep a printed A4 copy taped inside your kitchen utility cupboard and sealed inside Rucksack #1's Dokumentenmappe.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Printer className="w-4 h-4" />
          <span>Print 1-Page Action Plan (A4)</span>
        </button>
      </section>

      {/* Row 1: Editable Irish Household Identity Card + Quick-Dial Irish Emergency Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editable Irish Household Identity Card */}
        <section
          aria-label="Irish Household Identity Card"
          className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 print-card"
        >
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              IRISH HOUSEHOLD UTILITY &amp; LOCATION IDENTIFIERS
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Eircode, MPRN, GPRN, WPRN &amp; Roster Microchips
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="plan-eircode"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Eircode (Emergency Routing Key)
              </label>
              <input
                id="plan-eircode"
                type="text"
                value={plan.eircode}
                onChange={(e) => onUpdatePlan({ ...plan, eircode: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <div>
              <label
                htmlFor="plan-mprn"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                MPRN (11-Digit ESB Electricity)
              </label>
              <input
                id="plan-mprn"
                type="text"
                value={plan.mprn}
                onChange={(e) => onUpdatePlan({ ...plan, mprn: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="plan-gprn"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                GPRN (7-Digit Gas Networks Ireland)
              </label>
              <input
                id="plan-gprn"
                type="text"
                value={plan.gprn}
                onChange={(e) => onUpdatePlan({ ...plan, gprn: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="plan-wprn"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                WPRN (Uisce Éireann Water Account)
              </label>
              <input
                id="plan-wprn"
                type="text"
                value={plan.wprn}
                onChange={(e) => onUpdatePlan({ ...plan, wprn: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="plan-address"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Full Household Address
              </label>
              <input
                id="plan-address"
                type="text"
                value={plan.homeAddress}
                onChange={(e) => onUpdatePlan({ ...plan, homeAddress: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Auto-Populated Pet Microchips from Household Roster */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5 space-y-2">
            <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              AUTO-POPULATED PET MICROCHIP DIRECTORY (FROM ROSTER)
            </div>
            {pets.length === 0 ? (
              <div className="text-xs text-slate-500">No pets in roster.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {pets.map((p) => (
                  <div
                    key={p.id}
                    className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2"
                  >
                    <strong className="text-slate-900 dark:text-slate-100">
                      {p.name} ({p.species}):
                    </strong>{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {p.microchipNumber || 'Unregistered'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Quick-Dial Irish Emergency Directory & Offline FM Frequencies */}
        <section
          aria-label="Irish Emergency Contact Directory"
          className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 print-card"
        >
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="text-xs font-mono text-rose-600 dark:text-rose-400">
              24/7 IRISH EMERGENCY DIRECTORY &amp; OFFLINE BROADCASTS
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Quick-Dial Utility Faults, Medical &amp; FM Radio Frequencies
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <a
              href="tel:112"
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 flex items-center justify-between hover:bg-rose-500/20 transition-colors"
            >
              <div>
                <div className="font-bold text-rose-700 dark:text-rose-300">
                  Emergency Services (Garda / Ambulance / Fire)
                </div>
                <div className="text-slate-500 dark:text-slate-400">Works on any roaming mobile mast</div>
              </div>
              <span className="text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 whitespace-nowrap shrink-0 ml-2">
                112 / 999
              </span>
            </a>

            <a
              href="tel:1800372999"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  ESB Networks (Downed Lines / Outage)
                </div>
                <div className="text-slate-500 dark:text-slate-400">Quote 11-digit MPRN</div>
              </div>
              <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 ml-2">
                1800 372 999
              </span>
            </a>

            <a
              href="tel:1800205050"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  Gas Networks Ireland (24h Gas Leak)
                </div>
                <div className="text-slate-500 dark:text-slate-400">Quote 7-digit GPRN</div>
              </div>
              <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 ml-2">
                1800 20 50 50
              </span>
            </a>

            <a
              href="tel:1800278278"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  Uisce Éireann (Water Mains / Boil Notices)
                </div>
                <div className="text-slate-500 dark:text-slate-400">Quote WPRN / Eircode</div>
              </div>
              <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 ml-2">
                1800 278 278
              </span>
            </a>

            <a
              href="tel:045848701"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  KDOC Out-of-Hours GP / HSE Live
                </div>
                <div className="text-slate-500 dark:text-slate-400">HSE Live: 1800 700 700</div>
              </div>
              <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 ml-2">
                045 848 701
              </span>
            </a>

            <a
              href="tel:018092166"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  National Poisons Information Centre
                </div>
                <div className="text-slate-500 dark:text-slate-400">Beaumont Hospital (8am–10pm)</div>
              </div>
              <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0 ml-2">
                01 809 2166
              </span>
            </a>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Offline Emergency Broadcast Frequencies:
              </span>
            </div>
            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              RTÉ Radio 1: 88.2–90.0 FM · Kfm Kildare: 97.6 FM
            </div>
          </div>
        </section>
      </div>

      {/* Row 2: Utility Shut-Off Verification Checklists (Electricity, Gas ECV, Mains Water) */}
      <section aria-label="Utility Shut-Off Verification Checklists" className="space-y-3">
        <div>
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            30-SECOND UTILITY ISOLATION DRILL
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Interactive Utility Shut-Off Verification Checklists
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Electricity */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 print-card">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  1. Electricity (ESB Consumer Unit)
                </h4>
                <div className="text-xs font-mono text-slate-500">MPRN: {plan.mprn}</div>
              </div>
            </div>

            <div>
              <label
                htmlFor="elec-loc"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
              >
                Shut-Off Switch Location
              </label>
              <input
                id="elec-loc"
                type="text"
                value={plan.utilities.electricity.location}
                onChange={(e) => updateUtilityLocation('electricity', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2 pt-1">
              {plan.utilities.electricity.steps.map((stepText, idx) => {
                const checked = plan.utilities.electricity.stepsVerified[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleUtilityStep('electricity', idx)}
                    className="w-full text-left flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span className={checked ? 'text-slate-900 dark:text-slate-100 font-medium' : ''}>
                      {stepText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gas (ECV) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 print-card">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  2. Mains Gas (External ECV Valve)
                </h4>
                <div className="text-xs font-mono text-slate-500">GPRN: {plan.gprn}</div>
              </div>
            </div>

            <div>
              <label
                htmlFor="gas-loc"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
              >
                External Meter Box &amp; Key Location
              </label>
              <input
                id="gas-loc"
                type="text"
                value={plan.utilities.gas.location}
                onChange={(e) => updateUtilityLocation('gas', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2 pt-1">
              {plan.utilities.gas.steps.map((stepText, idx) => {
                const checked = plan.utilities.gas.stepsVerified[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleUtilityStep('gas', idx)}
                    className="w-full text-left flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span className={checked ? 'text-slate-900 dark:text-slate-100 font-medium' : ''}>
                      {stepText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mains Water */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 print-card">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  3. Mains Water (Internal Stopcock)
                </h4>
                <div className="text-xs font-mono text-slate-500">WPRN: {plan.wprn}</div>
              </div>
            </div>

            <div>
              <label
                htmlFor="water-loc"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
              >
                Internal Stopcock Valve Location
              </label>
              <input
                id="water-loc"
                type="text"
                value={plan.utilities.water.location}
                onChange={(e) => updateUtilityLocation('water', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2 pt-1">
              {plan.utilities.water.steps.map((stepText, idx) => {
                const checked = plan.utilities.water.stepsVerified[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleUtilityStep('water', idx)}
                    className="w-full text-left flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span className={checked ? 'text-slate-900 dark:text-slate-100 font-medium' : ''}>
                      {stepText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Row 3: 5-Minute Evacuation Role Split */}
      <section
        aria-label="5-Minute Evacuation Role Split"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 print-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                ZERO-OVERLAP EVACUATION PROTOCOL
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                5-Minute Evacuation Role Split (Parent 1 vs. Parent 2)
              </h3>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500">
            Assembly: {plan.evacuationRoles.localAssemblyPoint}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ROLE A · INFANT &amp; DOKUMENTENMAPPE LEAD
              </span>
              <span className="text-xs font-mono text-slate-500">
                {plan.evacuationRoles.parent1LeadMember}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Front Baby Carrier/Sling + Rucksack #1 + Hands Free
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              {plan.evacuationRoles.parent1Tasks.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
              {infants.length > 0 && (
                <li className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Active Roster Infant(s): {infants.map((inf) => inf.name).join(', ')} — verify RTF formula &amp; 3.5 TOG bag in Rucksack #1.
                </li>
              )}
            </ol>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                ROLE B · PET CARRIERS &amp; 30-SEC UTILITY SHUT-OFF LEAD
              </span>
              <span className="text-xs font-mono text-slate-500">
                {plan.evacuationRoles.parent2LeadMember}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Separate Pet Carriers ({pets.length}) + 30-Second Utility Shut-Off + Rucksack #2
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              {plan.evacuationRoles.parent2Tasks.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
              {pets.length > 0 && (
                <li className="font-semibold text-amber-700 dark:text-amber-300">
                  Active Roster Pets: {pets.map((p) => `${p.name} (${p.microchipNumber})`).join(' · ')}
                </li>
              )}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
};
