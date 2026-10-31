import React, { useState } from 'react';
import {
  Baby,
  Cat,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  HeartPulse,
  LogOut,
  MapPin,
  Plus,
  RotateCcw,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  HouseholdMember,
  InventoryItem,
  IrishHouseholdPlan,
  MemberType,
  PreparednessTier,
  StorageLocation,
  UserAccount,
} from '../types';
import { ALL_STORAGE_LOCATIONS } from '../data/defaultData';
import {
  calculateInfantMilestones,
  calculateRosterSummary,
} from '../utils/calculations';

interface HouseholdSetupAndSettingsProps {
  mode: 'initial-setup' | 'settings';
  roster: HouseholdMember[];
  onAddMember: (member: Omit<HouseholdMember, 'id'>) => void;
  onUpdateMember: (member: HouseholdMember) => void;
  onRemoveMember: (id: string) => void;
  tier: PreparednessTier;
  onChangeTier: (tier: PreparednessTier) => void;
  irishPlan: IrishHouseholdPlan;
  onUpdateIrishPlan: (plan: IrishHouseholdPlan) => void;
  onCompleteSetup: () => void;
  storageLocations?: StorageLocation[];
  inventory?: InventoryItem[];
  onAddStorageLocation?: (name: string) => void;
  onRenameStorageLocation?: (oldName: StorageLocation, newName: StorageLocation) => void;
  onRemoveStorageLocation?: (name: StorageLocation) => void;
  onExportJson?: () => void;
  onTriggerImportJson?: () => void;
  onReopenSetupWizard?: () => void;
  currentUser?: UserAccount;
  householdName?: string;
  shareCode?: string;
  onUpdateDisplayName?: (newName: string) => void;
  onOpenShareHousehold?: () => void;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
}

export const HouseholdSetupAndSettings: React.FC<HouseholdSetupAndSettingsProps> = ({
  mode,
  roster,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  tier,
  onChangeTier,
  irishPlan,
  onUpdateIrishPlan,
  onCompleteSetup,
  storageLocations = ALL_STORAGE_LOCATIONS,
  inventory = [],
  onAddStorageLocation,
  onRenameStorageLocation,
  onRemoveStorageLocation,
  onExportJson,
  onTriggerImportJson,
  onReopenSetupWizard,
  currentUser,
  householdName,
  shareCode,
  onUpdateDisplayName,
  onOpenShareHousehold,
  onLogout,
  onDeleteAccount,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [editingLocationName, setEditingLocationName] = useState<StorageLocation | null>(null);
  const [editingLocationValue, setEditingLocationValue] = useState('');
  const [accountNameInput, setAccountNameInput] = useState(currentUser?.name || '');
  const [editingAccountName, setEditingAccountName] = useState(false);
  const [newMemberType, setNewMemberType] = useState<MemberType>('adult');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newBirthDate, setNewBirthDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 45);
    return d.toISOString().slice(0, 10);
  });
  const [newAgeYears, setNewAgeYears] = useState('6');
  const [newWeightKg, setNewWeightKg] = useState('22');
  const [newSpecies, setNewSpecies] = useState<'Cat' | 'Dog' | 'Other'>('Cat');
  const [newMicrochip, setNewMicrochip] = useState('97227400');

  type SettingsTabId = 'account' | 'roster' | 'tier' | 'locations' | 'identifiers';
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTabId>(
    currentUser ? 'account' : 'roster'
  );

  const rosterSummary = calculateRosterSummary(roster, tier);

  const resetForm = () => {
    setEditingMemberId(null);
    setNewName('');
    setNewNotes('');
    setShowAddForm(false);
  };

  const handleStartEdit = (member: HouseholdMember) => {
    setEditingMemberId(member.id);
    setNewMemberType(member.type);
    setNewName(member.name);
    setNewNotes(member.medicalNotes || '');
    if (member.birthDate) setNewBirthDate(member.birthDate);
    if (member.ageYears !== undefined) setNewAgeYears(String(member.ageYears));
    if (member.weightKg !== undefined) setNewWeightKg(String(member.weightKg));
    if (member.species) setNewSpecies(member.species);
    if (member.microchipNumber) setNewMicrochip(member.microchipNumber);
    setShowAddForm(true);
  };

  const handleSubmitMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const payload: Omit<HouseholdMember, 'id'> = {
      type: newMemberType,
      name: newName.trim(),
      medicalNotes: newNotes.trim() || undefined,
      birthDate: newMemberType === 'infant' ? newBirthDate : undefined,
      ageYears: newMemberType === 'child' ? Number(newAgeYears) || 5 : undefined,
      weightKg: newMemberType === 'child' ? Number(newWeightKg) || 20 : undefined,
      species: newMemberType === 'pet' ? newSpecies : undefined,
      microchipNumber: newMemberType === 'pet' ? newMicrochip.trim() : undefined,
    };

    if (editingMemberId) {
      onUpdateMember({ ...payload, id: editingMemberId });
    } else {
      onAddMember(payload);
    }
    resetForm();
  };

  const tabs: {
    id: SettingsTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    ...(currentUser
      ? [
          {
            id: 'account' as const,
            label: 'Account & Profile',
            icon: UserCheck,
            badge: currentUser.role,
          },
        ]
      : []),
    {
      id: 'roster' as const,
      label: 'Household Roster',
      icon: Users,
      badge: roster.length,
    },
    {
      id: 'tier' as const,
      label: 'Preparedness Tier',
      icon: Settings,
      badge: tier === 'tier2_10d' ? '10-Day' : '72h',
    },
    {
      id: 'locations' as const,
      label: 'Storage Locations',
      icon: MapPin,
      badge: storageLocations.length,
    },
    {
      id: 'identifiers' as const,
      label: 'Identifiers & Backup',
      icon: ShieldCheck,
      badge: irishPlan.eircode ? 'Configured' : 'Offline',
    },
  ];

  return (
    <div className="space-y-6 min-w-0">
      {/* Header Banner */}
      <section className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 dark:bg-slate-900 p-4 sm:p-6 shadow-sm min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
              {mode === 'initial-setup' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">INITIAL HOUSEHOLD SETUP · STEP 1</span>
                </>
              ) : (
                <>
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">SETTINGS &amp; HOUSEHOLD PREFERENCES</span>
                </>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {mode === 'initial-setup'
                ? 'Configure Your Household Roster & Preparedness Tier'
                : 'Household Settings & Configuration'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
              {mode === 'initial-setup'
                ? 'Define your household members and preparedness standard below. Once confirmed, your Household Roster moves to Settings and Phase 1 auto-scales all water, food, infant formula, and pet rations.'
                : 'Manage your profile, household members, auto-scaling preparedness tier, storage locations, and Irish emergency utility identifiers.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {mode === 'initial-setup' ? (
              <button
                type="button"
                onClick={onCompleteSetup}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Complete Setup &amp; Open Phase 1</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onCompleteSetup}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Done — Return to Active Phase</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* In-Page Settings Menu Navigation Bar (when in settings mode) */}
      {mode === 'settings' && (
        <nav
          role="tablist"
          aria-label="Household Settings Navigation"
          className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSettingsTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`settings-tabpanel-${tab.id}`}
                type="button"
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums uppercase ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* TAB 1: Account & Profile */}
      {((mode === 'settings' && activeSettingsTab === 'account') || (mode === 'initial-setup' && currentUser)) && currentUser && (
        <section
          role={mode === 'settings' ? 'tabpanel' : undefined}
          id="settings-tabpanel-account"
          aria-labelledby="settings-tab-account"
          aria-label="Logged-In Account and Household Profile"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-5 min-w-0"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold text-base shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
                    Logged-In Profile
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                    {currentUser.role}
                  </span>
                  {shareCode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Share Code: {shareCode}
                    </span>
                  )}
                </div>

                {editingAccountName && onUpdateDisplayName ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (accountNameInput.trim()) {
                        onUpdateDisplayName(accountNameInput.trim());
                      }
                      setEditingAccountName(false);
                    }}
                    className="flex items-center gap-1.5 mt-1"
                  >
                    <input
                      type="text"
                      value={accountNameInput}
                      onChange={(e) => setAccountNameInput(e.target.value)}
                      aria-label="Edit logged-in display name"
                      className="rounded-lg border border-emerald-500 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountNameInput(currentUser.name);
                        setEditingAccountName(false);
                      }}
                      className="px-2 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </h2>
                    {onUpdateDisplayName && (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountNameInput(currentUser.name);
                          setEditingAccountName(true);
                        }}
                        aria-label="Edit logged-in user name"
                        className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit Display Name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.emailOrUsername}
                  {householdName ? ` • ${householdName}` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onOpenShareHousehold && (
                <button
                  type="button"
                  onClick={onOpenShareHousehold}
                  className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Household</span>
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-amber-500" />
                  <span>Log Out</span>
                </button>
              )}

              {onDeleteAccount && (
                <button
                  type="button"
                  onClick={onDeleteAccount}
                  className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Offline-First Multi-User Security</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Your preparedness plan, inventory items, and emergency contacts are encrypted locally in your device&apos;s isolated storage. Multiple accounts can be created on this device without cross-contamination. Shared households synchronize via unique share codes.
            </p>
          </div>
        </section>
      )}

      {/* TAB 2: Household Roster */}
      {((mode === 'settings' && activeSettingsTab === 'roster') || mode === 'initial-setup') && (
        <section
          role={mode === 'settings' ? 'tabpanel' : undefined}
          id="settings-tabpanel-roster"
          aria-labelledby="settings-tab-roster"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4 min-w-0"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <Users className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Dynamic Household Roster ({roster.length} Members)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Infants, children, adults, and pets automatically calculate daily drinking water, calorie targets, and medical requirements.
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      rosterSummary.infants > 0
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Baby className="w-3 h-3" />
                    <span>
                      {rosterSummary.infants > 0
                        ? `Infant Care: Active (${rosterSummary.infants})`
                        : 'Infant Items: Hidden (0 infants)'}
                    </span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      rosterSummary.pets > 0
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Cat className="w-3 h-3" />
                    <span>
                      {rosterSummary.pets > 0
                        ? `Pet Supplies: Active (${rosterSummary.pets})`
                        : 'Pet Items: Hidden (0 pets)'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member / Pet</span>
            </button>
          </div>

          {/* Roster Cards — Compact grid on mobile/desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {roster.map((member) => {
              const infantInfo =
                member.type === 'infant' && member.birthDate
                  ? calculateInfantMilestones(member.name, member.birthDate)
                  : null;

              return (
                <div
                  key={member.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3 gap-2.5 min-w-0"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          member.type === 'infant'
                            ? 'bg-amber-500/15 text-amber-500'
                            : member.type === 'pet'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {member.type === 'infant' ? (
                          <Baby className="w-3.5 h-3.5" />
                        ) : member.type === 'pet' ? (
                          <Cat className="w-3.5 h-3.5" />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate">
                        {member.type}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {member.name}
                    </div>

                    {member.type === 'infant' && member.birthDate && (
                      <p className="text-[11px] tabular-nums text-amber-600 dark:text-amber-400 break-words">
                        DOB: {member.birthDate} ({infantInfo?.ageMonths ?? 1}m)
                      </p>
                    )}

                    {member.type === 'child' && (
                      <p className="text-[11px] tabular-nums text-slate-600 dark:text-slate-400 truncate">
                        {member.ageYears ?? 6}y · {member.weightKg ?? 20}kg
                      </p>
                    )}

                    {member.type === 'pet' && (
                      <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
                        {member.species || 'Cat'} · {member.microchipNumber || 'No chip'}
                      </p>
                    )}

                    {member.medicalNotes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1 line-clamp-2">
                        <HeartPulse className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{member.medicalNotes}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(member)}
                      aria-label={`Edit ${member.name}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {roster.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(member.id)}
                        aria-label={`Remove ${member.name}`}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 3: Preparedness Tier & Live Auto-Scaling Grid */}
      {((mode === 'settings' && activeSettingsTab === 'tier') || mode === 'initial-setup') && (
        <section
          role={mode === 'settings' ? 'tabpanel' : undefined}
          id="settings-tabpanel-tier"
          aria-labelledby="settings-tab-tier"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-5 min-w-0"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
            <div className="min-w-0">
              <span className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                AUTO-SCALING SUPPLY ENGINE ({rosterSummary.days} DAYS)
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Select Preparedness Standard ({rosterSummary.adults} Adults · {rosterSummary.children}{' '}
                Children · {rosterSummary.infants} Infant · {rosterSummary.pets} Pets)
              </h2>
            </div>

            {/* Tier 1 vs Tier 2 Segmented Toggle */}
            <div
              role="group"
              aria-label="Preparedness Tier Selector"
              className="flex flex-col sm:inline-flex sm:flex-row rounded-lg p-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 w-full sm:w-auto gap-1"
            >
              <button
                type="button"
                onClick={() => onChangeTier('tier1_72h')}
                className={`min-h-[44px] sm:min-h-0 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tier === 'tier1_72h'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Tier 1: 72-Hour Baseline (Ireland/UK)
              </button>
              <button
                type="button"
                onClick={() => onChangeTier('tier2_10d')}
                className={`min-h-[44px] sm:min-h-0 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  tier === 'tier2_10d'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Tier 2: 10-Day Home Pantry + 48h Grab Bag
              </button>
            </div>
          </div>

          {/* Live Calculated Quantities Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Human Drinking Water
              </div>
              <div className="text-base sm:text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {rosterSummary.humanDrinkingAndCookingWaterL} L
              </div>
              <div className="text-[11px] tabular-nums text-slate-500 mt-0.5 truncate">
                +{rosterSummary.infantHygieneWaterL}L infant hygiene
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Pet Water &amp; Ration
              </div>
              <div className="text-base sm:text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {rosterSummary.petWaterL} L
              </div>
              <div className="text-[11px] tabular-nums text-slate-500 mt-0.5 truncate">
                {rosterSummary.petWetPouches} wet pouches + dry
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Infant RTF Formula
              </div>
              <div className="text-base sm:text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {rosterSummary.infantFormulaBottles} x 200ml
              </div>
              <div className="text-[11px] tabular-nums text-slate-500 mt-0.5 truncate">
                {rosterSummary.infantSterileTeats} teats · {rosterSummary.infantNappies} nappies
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Adult/Child Energy
              </div>
              <div className="text-base sm:text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {(rosterSummary.totalKcal / 1000).toFixed(1)}k kcal
              </div>
              <div className="text-[11px] tabular-nums text-slate-500 mt-0.5 truncate">
                {rosterSummary.grabBagsNeeded} grab bags · {rosterSummary.petCarriersNeeded} carriers
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: Editable Storage Locations */}
      {((mode === 'settings' && activeSettingsTab === 'locations') || mode === 'initial-setup') && (
        <section
          role={mode === 'settings' ? 'tabpanel' : undefined}
          id="settings-tabpanel-locations"
          aria-labelledby="settings-tab-locations"
          aria-label="Storage Locations Manager"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4 min-w-0"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <MapPin className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Storage Locations &amp; Grab-Bag Compartments ({storageLocations.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add, rename, or remove household storage locations. Renaming a location automatically updates all items stored there.
                </p>
              </div>
            </div>

            {onAddStorageLocation && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newLocationInput.trim()) return;
                  onAddStorageLocation(newLocationInput.trim());
                  setNewLocationInput('');
                }}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <input
                  type="text"
                  value={newLocationInput}
                  onChange={(e) => setNewLocationInput(e.target.value)}
                  placeholder="e.g. Garage Utility Shelf, Car Boot..."
                  aria-label="New storage location name"
                  className="flex-1 sm:w-60 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Location</span>
                </button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {storageLocations.map((loc) => {
              const itemCount = inventory.filter((i) => i.storageLocation === loc).length;
              const isEditing = editingLocationName === loc;

              return (
                <div
                  key={loc}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3 flex items-center justify-between gap-2 min-w-0"
                >
                  {isEditing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (onRenameStorageLocation && editingLocationValue.trim()) {
                          onRenameStorageLocation(loc, editingLocationValue.trim());
                        }
                        setEditingLocationName(null);
                      }}
                      className="flex items-center gap-1.5 w-full min-w-0"
                    >
                      <input
                        type="text"
                        value={editingLocationValue}
                        onChange={(e) => setEditingLocationValue(e.target.value)}
                        aria-label={`Rename ${loc}`}
                        autoFocus
                        className="flex-1 min-w-0 rounded-lg border border-emerald-500 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        aria-label="Save location name"
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLocationName(null)}
                        aria-label="Cancel rename"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {loc}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium tabular-nums bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onRenameStorageLocation && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLocationName(loc);
                              setEditingLocationValue(loc);
                            }}
                            aria-label={`Edit storage location ${loc}`}
                            title="Rename storage location"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onRemoveStorageLocation && storageLocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemoveStorageLocation(loc)}
                            aria-label={`Remove storage location ${loc}`}
                            title="Remove storage location and reassign items"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 5: Household Identity & Backup Settings */}
      {((mode === 'settings' && activeSettingsTab === 'identifiers') || mode === 'initial-setup') && (
        <section
          role={mode === 'settings' ? 'tabpanel' : undefined}
          id="settings-tabpanel-identifiers"
          aria-labelledby="settings-tab-identifiers"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4 min-w-0"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Home Eircode, Utility Identifiers &amp; JSON Backup
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Used across Phase 3 Irish Emergency Mode (ESB MPRN, Gas GPRN, Uisce Éireann WPRN).
                </p>
              </div>
            </div>

            {mode === 'settings' && (
              <div className="flex flex-wrap items-center gap-2">
                {onExportJson && (
                  <button
                    type="button"
                    onClick={onExportJson}
                    className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Export JSON</span>
                  </button>
                )}
                {onTriggerImportJson && (
                  <button
                    type="button"
                    onClick={onTriggerImportJson}
                    className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Import JSON</span>
                  </button>
                )}
                {onReopenSetupWizard && (
                  <button
                    type="button"
                    onClick={onReopenSetupWizard}
                    className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>View Setup Screen</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="min-w-0">
              <label
                htmlFor="setup-eircode"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Eircode
              </label>
              <input
                id="setup-eircode"
                type="text"
                value={irishPlan.eircode}
                onChange={(e) => onUpdateIrishPlan({ ...irishPlan, eircode: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-2 min-w-0">
              <label
                htmlFor="setup-address"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Home Address
              </label>
              <input
                id="setup-address"
                type="text"
                value={irishPlan.homeAddress}
                onChange={(e) => onUpdateIrishPlan({ ...irishPlan, homeAddress: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="min-w-0">
              <label
                htmlFor="setup-mprn"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                ESB MPRN (11-digit)
              </label>
              <input
                id="setup-mprn"
                type="text"
                value={irishPlan.mprn}
                onChange={(e) => onUpdateIrishPlan({ ...irishPlan, mprn: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="min-w-0">
              <label
                htmlFor="setup-gprn"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Gas GPRN (7-digit)
              </label>
              <input
                id="setup-gprn"
                type="text"
                value={irishPlan.gprn}
                onChange={(e) => onUpdateIrishPlan({ ...irishPlan, gprn: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All household data is persisted offline in your browser&apos;s localStorage.
            </p>
            <button
              type="button"
              onClick={onCompleteSetup}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {mode === 'initial-setup'
                  ? 'Complete Household Setup & Continue to Phase 1'
                  : 'Done — Return to Active Phase'}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Mobile-Friendly Bottom Sheet / Modal for Adding or Editing a Household Member */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="household-member-modal-title"
        >
          <form
            onSubmit={handleSubmitMember}
            className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                  HOUSEHOLD ROSTER MANAGER
                </span>
                <h3
                  id="household-member-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-slate-100"
                >
                  {editingMemberId ? 'Edit Household Member' : 'Add New Household Member'}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close member modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="member-type-select"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Member Type
                </label>
                <select
                  id="member-type-select"
                  value={newMemberType}
                  onChange={(e) => setNewMemberType(e.target.value as MemberType)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="adult">Adult (3L water + 2,200 kcal/day)</option>
                  <option value="child">Child 1–12 yrs (2L water + 1,500 kcal/day)</option>
                  <option value="infant">Infant &lt;1 yr (8x RTF Formula + 10 nappies/day)</option>
                  <option value="pet">Pet (0.5L water + 2x wet pouches + carrier)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="member-name-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Name / Callsign
                </label>
                <input
                  id="member-name-input"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Aoife, Liam, Whiskers"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              {newMemberType === 'infant' && (
                <div>
                  <label
                    htmlFor="infant-dob-input"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Infant Birth Date (for Milestone Alerts)
                  </label>
                  <input
                    id="infant-dob-input"
                    type="date"
                    required
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {newMemberType === 'child' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="child-age-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Age (yrs)
                    </label>
                    <input
                      id="child-age-input"
                      type="number"
                      min={1}
                      max={12}
                      value={newAgeYears}
                      onChange={(e) => setNewAgeYears(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="child-weight-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Weight (kg, dosing)
                    </label>
                    <input
                      id="child-weight-input"
                      type="number"
                      min={8}
                      max={60}
                      value={newWeightKg}
                      onChange={(e) => setNewWeightKg(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {newMemberType === 'pet' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="pet-species-select"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Species
                    </label>
                    <select
                      id="pet-species-select"
                      value={newSpecies}
                      onChange={(e) => setNewSpecies(e.target.value as 'Cat' | 'Dog' | 'Other')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="Cat">Cat</option>
                      <option value="Dog">Dog</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="pet-microchip-input"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Microchip # (15-digit)
                    </label>
                    <input
                      id="pet-microchip-input"
                      type="text"
                      value={newMicrochip}
                      onChange={(e) => setNewMicrochip(e.target.value)}
                      placeholder="97227400..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="member-notes-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Medical / Prescription / Dietary Notes
                </label>
                <input
                  id="member-notes-input"
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Salbutamol inhaler, sterile liquid formula only"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-base sm:text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer"
              >
                {editingMemberId ? 'Update Member' : 'Save Member & Recalculate'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
