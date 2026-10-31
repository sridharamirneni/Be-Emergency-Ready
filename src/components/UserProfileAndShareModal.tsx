import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  LogOut,
  MailPlus,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { HouseholdInvite, SharedHouseholdData, UserAccount } from '../types';

interface UserProfileAndShareModalProps {
  isOpen: boolean;
  initialTab?: 'share' | 'profile';
  onClose: () => void;
  currentUser: UserAccount;
  users: UserAccount[];
  currentHousehold: SharedHouseholdData;
  invites: HouseholdInvite[];
  onUpdateDisplayName: (newName: string) => void;
  onUpdateHouseholdName: (newHouseholdName: string) => void;
  onInviteMember: (emailOrUsername: string) => { ok: boolean; error?: string };
  onJoinHouseholdByCode: (shareCode: string) => { ok: boolean; error?: string };
  onCreateNewHousehold: (householdName?: string) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onExportJson: () => void;
  onTriggerImportJson: () => void;
}

export const UserProfileAndShareModal: React.FC<UserProfileAndShareModalProps> = ({
  isOpen,
  initialTab = 'share',
  onClose,
  currentUser,
  users,
  currentHousehold,
  invites,
  onUpdateDisplayName,
  onUpdateHouseholdName,
  onInviteMember,
  onJoinHouseholdByCode,
  onCreateNewHousehold,
  onLogout,
  onDeleteAccount,
  onExportJson,
  onTriggerImportJson,
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'profile'>(initialTab);
  const [displayNameInput, setDisplayNameInput] = useState(currentUser.name);
  const [householdNameInput, setHouseholdNameInput] = useState(currentHousehold.name);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [newSeparateHouseholdName, setNewSeparateHouseholdName] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setStatusBanner(null);
      setConfirmDelete(false);
    }
  }, [isOpen, initialTab]);

  React.useEffect(() => {
    setDisplayNameInput(currentUser.name);
    setHouseholdNameInput(currentHousehold.name);
  }, [currentUser.name, currentHousehold.name]);

  if (!isOpen) return null;

  const householdMembers = users.filter(
    (u) =>
      u.householdId === currentHousehold.id ||
      currentHousehold.memberUserIds.includes(u.id)
  );

  const pendingInvitesForHousehold = invites.filter(
    (i) => i.householdId === currentHousehold.id
  );

  const pendingInvitesForCurrentUser = invites.filter(
    (i) =>
      i.status === 'pending' &&
      i.householdId !== currentHousehold.id &&
      (i.inviteeEmailOrUsername.toLowerCase() ===
        currentUser.emailOrUsername.toLowerCase() ||
        i.inviteeEmailOrUsername.toLowerCase() === currentUser.name.toLowerCase())
  );

  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(currentHousehold.shareCode);
    } catch {
      // Clipboard fallback ignored
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onInviteMember(inviteEmailInput);
    if (res.ok) {
      setStatusBanner({
        type: 'success',
        message: `Invitation sent to "${inviteEmailInput.trim()}". They can now join using code ${currentHousehold.shareCode} or accept from their profile.`,
      });
      setInviteEmailInput('');
    } else {
      setStatusBanner({
        type: 'error',
        message: res.error || 'Could not send invitation.',
      });
    }
  };

  const handleJoinByCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onJoinHouseholdByCode(joinCodeInput);
    if (res.ok) {
      setStatusBanner({
        type: 'success',
        message: `Joined shared household (${joinCodeInput.toUpperCase()})! Roster, inventory, and expiry dates are now synced.`,
      });
      setJoinCodeInput('');
    } else {
      setStatusBanner({
        type: 'error',
        message: res.error || 'Invalid share code.',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="User Profile and Household Sharing Settings"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {currentUser.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 capitalize">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentUser.emailOrUsername} • {currentHousehold.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Profile and Sharing Modal"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs: Share Household vs Profile & Account */}
        <div
          role="tablist"
          aria-label="Profile and Household Sharing Tabs"
          className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'share'}
            onClick={() => {
              setActiveTab('share');
              setStatusBanner(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'share'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Household</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => {
              setActiveTab('profile');
              setStatusBanner(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>Account Settings</span>
          </button>
        </div>

        {statusBanner && (
          <div
            role="status"
            className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
              statusBanner.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
          >
            {statusBanner.message}
          </div>
        )}

        {/* Pending Invitations Banner for Current User */}
        {pendingInvitesForCurrentUser.length > 0 && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>You have a Household Sharing Invitation!</span>
            </div>
            {pendingInvitesForCurrentUser.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white/80 dark:bg-slate-950/80 p-2.5 border border-emerald-500/20"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {inv.invitedByName} invited you to join{' '}
                    <span className="text-emerald-500">{inv.householdName}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Share Code: <strong>{inv.shareCode}</strong> • Co-manage roster, checklist &amp; expiry dates
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const res = onJoinHouseholdByCode(inv.shareCode);
                    if (res.ok) {
                      setStatusBanner({
                        type: 'success',
                        message: `Joined ${inv.householdName}! You now share the same live household inventory.`,
                      });
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shrink-0 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Accept &amp; Join Household</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'share' ? (
          <div className="space-y-5">
            {/* Share Code & Household Name Box */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Active Shared Household
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentHousehold.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Share this code with your partner or family members so they can co-manage this inventory.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold tracking-wider">
                    {currentHousehold.shareCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyShareCode}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Rename Household Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!householdNameInput.trim()) return;
                  onUpdateHouseholdName(householdNameInput.trim());
                  setStatusBanner({
                    type: 'success',
                    message: 'Updated shared household name.',
                  });
                }}
                className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80"
              >
                <input
                  type="text"
                  value={householdNameInput}
                  onChange={(e) => setHouseholdNameInput(e.target.value)}
                  aria-label="Shared Household Name"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  Rename Household
                </button>
              </form>
            </div>

            {/* Invite Registered Member by Email / Username */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MailPlus className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Invite Family Member or Partner by Email / Username
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Invited members gain instant collaborative sync across checklists, shopping mode, and rotations.
                  </p>
                </div>
              </div>

              <form onSubmit={handleInviteSubmit} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inviteEmailInput}
                  onChange={(e) => setInviteEmailInput(e.target.value)}
                  placeholder="e.g., cian@beready.ie or partner username"
                  aria-label="Invite member email or username"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Send Invite</span>
                </button>
              </form>

              {/* Active Collaborators & Invites List */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>Connected Household Members ({householdMembers.length})</span>
                  {currentHousehold.lastModifiedBy && (
                    <span>Last synced by {currentHousehold.lastModifiedBy}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {householdMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {member.name} {member.id === currentUser.id ? '(You)' : ''}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {member.emailOrUsername}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          member.id === currentHousehold.ownerUserId
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        }`}
                      >
                        {member.id === currentHousehold.ownerUserId ? 'Owner' : 'Member'}
                      </span>
                    </div>
                  ))}
                </div>

                {pendingInvitesForHousehold.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Household Invitations
                    </span>
                    {pendingInvitesForHousehold.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 dark:border-slate-800/80 px-3 py-1.5 text-xs"
                      >
                        <span className="text-slate-700 dark:text-slate-300 truncate">
                          Invited: <strong>{inv.inviteeEmailOrUsername}</strong>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            inv.status === 'accepted'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Join Existing Household or Create New Separate Household */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <form
                onSubmit={handleJoinByCodeSubmit}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Join Existing Household</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter another family member&apos;s Share Code to link your account to their household.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g., BR-BYRNE-10D"
                    aria-label="Enter Share Code to Join Household"
                    className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-bold uppercase text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer shrink-0"
                  >
                    Join
                  </button>
                </div>
              </form>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onCreateNewHousehold(newSeparateHouseholdName);
                  setNewSeparateHouseholdName('');
                  setStatusBanner({
                    type: 'success',
                    message: 'Created and switched to a new isolated household!',
                  });
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Create New Separate Household</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Start a fresh, isolated household inventory &amp; roster with you as the Owner.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSeparateHouseholdName}
                    onChange={(e) => setNewSeparateHouseholdName(e.target.value)}
                    placeholder="New household name..."
                    aria-label="New separate household name"
                    className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer shrink-0"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Update Display Name */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!displayNameInput.trim()) return;
                onUpdateDisplayName(displayNameInput.trim());
                setStatusBanner({
                  type: 'success',
                  message: `Updated your display name to "${displayNameInput.trim()}".`,
                });
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
            >
              <label
                htmlFor="profile-display-name"
                className="block text-xs font-bold text-slate-900 dark:text-white"
              >
                Your Profile Display Name
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="profile-display-name"
                  type="text"
                  required
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer shrink-0"
                >
                  Save Name
                </button>
              </div>
            </form>

            {/* Profile Backup, Logout & Delete Account */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Profile Data Backup &amp; Session Controls
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onExportJson}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Export Profile JSON</span>
                </button>

                <button
                  type="button"
                  onClick={onTriggerImportJson}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Import Backup JSON</span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-amber-500" />
                  <span>Log Out</span>
                </button>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-rose-400 font-semibold">
                      Confirm delete?
                    </span>
                    <button
                      type="button"
                      onClick={onDeleteAccount}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
