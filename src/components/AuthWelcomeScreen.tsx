import React, { useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { SharedHouseholdData, UserAccount } from '../types';

interface AuthWelcomeScreenProps {
  onSignIn: (emailOrUsername: string, password: string) => { ok: boolean; error?: string };
  onCreateAccount: (params: {
    name: string;
    emailOrUsername: string;
    password: string;
    householdMode: 'create' | 'join';
    shareCode?: string;
    householdName?: string;
  }) => { ok: boolean; error?: string };
}

export const AuthWelcomeScreen: React.FC<AuthWelcomeScreenProps> = ({
  onSignIn,
  onCreateAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [loginIdentifier, setLoginIdentifier] = useState('aoife@beready.ie');
  const [loginPassword, setLoginPassword] = useState('beready123');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Create Account state
  const [signupName, setSignupName] = useState('');
  const [signupIdentifier, setSignupIdentifier] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [householdMode, setHouseholdMode] = useState<'create' | 'join'>('create');
  const [joinShareCode, setJoinShareCode] = useState('');
  const [customHouseholdName, setCustomHouseholdName] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = onSignIn(loginIdentifier, loginPassword);
    if (!res.ok) {
      setLoginError(res.error || 'Unable to sign in.');
    }
  };

  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    const res = onCreateAccount({
      name: signupName,
      emailOrUsername: signupIdentifier,
      password: signupPassword,
      householdMode,
      shareCode: householdMode === 'join' ? joinShareCode : undefined,
      householdName: householdMode === 'create' ? customHouseholdName : undefined,
    });
    if (!res.ok) {
      setSignupError(res.error || 'Unable to create account.');
    }
  };

  return (
    <div className="min-h-dvh w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Offline-First Household Readiness &amp; Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Be Ready
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            Sign in to access your household roster, emergency inventory, or join a shared family plan on this device.
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 sm:p-6 shadow-2xl space-y-5">
          {/* Tabs: Sign In / Create Account */}
          <div
            role="tablist"
            aria-label="Authentication Mode"
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signin'}
              onClick={() => {
                setActiveTab('signin');
                setLoginError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signup'}
              onClick={() => {
                setActiveTab('signup');
                setSignupError(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {activeTab === 'signin' ? (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              {loginError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300"
                >
                  {loginError}
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-login-identifier"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Email or Username
                </label>
                <input
                  id="auth-login-identifier"
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g., aoife@beready.ie"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-login-password"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <input
                  id="auth-login-password"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 px-4 text-sm font-bold text-white shadow-md transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Household</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
              {signupError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-300"
                >
                  {signupError}
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-signup-name"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Your Display Name
                </label>
                <input
                  id="auth-signup-name"
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g., Niamh O'Connor"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-signup-identifier"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Email or Username
                </label>
                <input
                  id="auth-signup-identifier"
                  type="text"
                  required
                  value={signupIdentifier}
                  onChange={(e) => setSignupIdentifier(e.target.value)}
                  placeholder="e.g., niamh@beready.ie"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-signup-password"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <input
                  id="auth-signup-password"
                  type="password"
                  required
                  minLength={4}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Household Setup Choice: Create New Household vs Join Existing Household */}
              <div className="space-y-2.5 pt-1">
                <span className="block text-xs font-semibold text-slate-300">
                  Household Setup Option
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHouseholdMode('create')}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      householdMode === 'create'
                        ? 'border-emerald-500 bg-emerald-500/15 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Create New Household</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Isolated inventory, roster &amp; plan (Owner)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHouseholdMode('join')}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      householdMode === 'join'
                        ? 'border-emerald-500 bg-emerald-500/15 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Join Existing Household</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Co-manage with a family Share Code
                    </span>
                  </button>
                </div>

                {householdMode === 'create' ? (
                  <div>
                    <label
                      htmlFor="auth-signup-household-name"
                      className="block text-xs font-medium text-slate-400 mb-1"
                    >
                      Household Name (Optional)
                    </label>
                    <input
                      id="auth-signup-household-name"
                      type="text"
                      value={customHouseholdName}
                      onChange={(e) => setCustomHouseholdName(e.target.value)}
                      placeholder="e.g., O'Connor Family (Galway)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="auth-signup-share-code"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Enter Household Share Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-signup-share-code"
                        type="text"
                        required
                        value={joinShareCode}
                        onChange={(e) => setJoinShareCode(e.target.value.toUpperCase())}
                        placeholder="e.g., BR-BYRNE-10D"
                        className="w-full rounded-xl border border-emerald-500/50 bg-slate-950 pl-9 pr-3 py-2 text-xs font-bold tracking-wider text-white uppercase placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Demo tip: Use <strong className="text-emerald-400">BR-BYRNE-10D</strong> to join Aoife Byrne&apos;s household.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 px-4 text-sm font-bold text-white shadow-md transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {householdMode === 'join'
                    ? 'Create Account & Join Shared Household'
                    : 'Create Account & Start Household'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
