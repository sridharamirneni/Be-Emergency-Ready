import {
  HouseholdInvite,
  HouseholdMember,
  InventoryItem,
  IrishHouseholdPlan,
  PowerDevice,
  PreparednessTier,
  RotationLogEntry,
  SharedHouseholdData,
  StorageLocation,
  StormChecklistItem,
  UserAccount,
} from '../types';
import {
  ALL_STORAGE_LOCATIONS,
  DEFAULT_INVENTORY,
  DEFAULT_IRISH_PLAN,
  DEFAULT_POWER_DEVICES,
  DEFAULT_ROSTER,
  DEFAULT_STORM_CHECKLIST,
} from '../data/defaultData';
import { normalizeAndSplitInventory } from './calculations';

export const USERS_STORAGE_KEY = 'be_ready_users';
export const CURRENT_USER_STORAGE_KEY = 'be_ready_current_user';
export const HOUSEHOLDS_STORAGE_KEY = 'be_ready_households';
export const INVITES_STORAGE_KEY = 'be_ready_invites';

export interface AuthSystemStore {
  users: UserAccount[];
  currentUser: UserAccount | null;
  households: Record<string, SharedHouseholdData>;
  invites: HouseholdInvite[];
}

export function hashPasswordLocal(password: string): string {
  const clean = password.trim();
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `br_hash_${(hash >>> 0).toString(16)}`;
}

export function generateShareCode(seedName = 'HOME'): string {
  const prefix =
    seedName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5) || 'HOME';
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `BR-${prefix}-${randomSuffix}`;
}

export function createDefaultHouseholdData(
  ownerUserId: string,
  ownerName: string,
  options?: {
    householdId?: string;
    householdName?: string;
    shareCode?: string;
    setupCompleted?: boolean;
    customRoster?: HouseholdMember[];
    customTier?: PreparednessTier;
    customInventory?: InventoryItem[];
  }
): SharedHouseholdData {
  const id =
    options?.householdId ||
    `hh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const cleanOwner = ownerName.trim() || 'Household';
  const shareCode = options?.shareCode || generateShareCode(cleanOwner);
  const nowIso = new Date().toISOString();

  // Deep-clone defaults so no two households ever share object references
  const baseRoster: HouseholdMember[] = JSON.parse(
    JSON.stringify(options?.customRoster || DEFAULT_ROSTER)
  );
  if (!options?.customRoster && baseRoster.length > 0 && baseRoster[0].type === 'adult') {
    baseRoster[0].name = `${cleanOwner} (Parent 1)`;
  }

  return {
    id,
    name: options?.householdName || `${cleanOwner}'s Household`,
    shareCode,
    ownerUserId,
    memberUserIds: [ownerUserId],
    updatedAt: nowIso,
    lastModifiedBy: cleanOwner,
    roster: baseRoster,
    tier: options?.customTier || 'tier2_10d',
    inventory: JSON.parse(JSON.stringify(options?.customInventory || DEFAULT_INVENTORY)),
    storageLocations: [...ALL_STORAGE_LOCATIONS],
    powerDevices: JSON.parse(JSON.stringify(DEFAULT_POWER_DEVICES)),
    stormChecklist: JSON.parse(JSON.stringify(DEFAULT_STORM_CHECKLIST)),
    irishPlan: JSON.parse(JSON.stringify(DEFAULT_IRISH_PLAN)),
    rotationLogs: [],
    setupCompleted: options?.setupCompleted ?? true,
  };
}

export function registerUserInStore(
  store: AuthSystemStore,
  params: {
    name: string;
    emailOrUsername: string;
    password: string;
    householdMode?: 'create' | 'join';
    shareCode?: string;
    householdName?: string;
    setupCompleted?: boolean;
  }
):
  | { ok: true; store: AuthSystemStore; user: UserAccount; household: SharedHouseholdData }
  | { ok: false; error: string } {
  const trimmedName = params.name.trim();
  const trimmedIdentifier = params.emailOrUsername.trim().toLowerCase();
  const trimmedPassword = params.password.trim();

  if (!trimmedName) {
    return { ok: false, error: 'Please enter your display name.' };
  }
  if (!trimmedIdentifier) {
    return { ok: false, error: 'Please enter an email address or username.' };
  }
  if (trimmedPassword.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters.' };
  }

  const existing = store.users.find(
    (u) => u.emailOrUsername.toLowerCase() === trimmedIdentifier
  );
  if (existing) {
    return {
      ok: false,
      error: 'An account with that email or username already exists on this device.',
    };
  }

  const newUserId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();

  // Check if joining an existing household via Share Code
  if (params.householdMode === 'join') {
    const codeToFind = (params.shareCode || '').trim().toUpperCase();
    if (!codeToFind) {
      return { ok: false, error: 'Please enter a valid Household Share Code to join.' };
    }
    const targetHousehold = Object.values(store.households).find(
      (h) => h.shareCode.toUpperCase() === codeToFind
    );
    if (!targetHousehold) {
      return {
        ok: false,
        error: `No household found matching Share Code "${codeToFind}".`,
      };
    }

    const newUser: UserAccount = {
      id: newUserId,
      name: trimmedName,
      emailOrUsername: trimmedIdentifier,
      passwordHash: hashPasswordLocal(trimmedPassword),
      householdId: targetHousehold.id,
      role: 'member',
      createdAt: nowIso,
    };

    const updatedHousehold: SharedHouseholdData = {
      ...targetHousehold,
      memberUserIds: Array.from(new Set([...targetHousehold.memberUserIds, newUserId])),
      updatedAt: nowIso,
      lastModifiedBy: trimmedName,
    };

    const updatedInvites: HouseholdInvite[] = store.invites.map((inv) =>
      inv.householdId === targetHousehold.id &&
      inv.inviteeEmailOrUsername.toLowerCase() === trimmedIdentifier
        ? { ...inv, status: 'accepted' }
        : inv
    );

    const nextStore: AuthSystemStore = {
      users: [...store.users, newUser],
      currentUser: newUser,
      households: {
        ...store.households,
        [targetHousehold.id]: updatedHousehold,
      },
      invites: updatedInvites,
    };

    return { ok: true, store: nextStore, user: newUser, household: updatedHousehold };
  }

  // Otherwise create a brand-new isolated household for this user
  const newHousehold = createDefaultHouseholdData(newUserId, trimmedName, {
    householdName: params.householdName,
    setupCompleted: params.setupCompleted ?? true,
  });

  const newUser: UserAccount = {
    id: newUserId,
    name: trimmedName,
    emailOrUsername: trimmedIdentifier,
    passwordHash: hashPasswordLocal(trimmedPassword),
    householdId: newHousehold.id,
    role: 'owner',
    createdAt: nowIso,
  };

  const nextStore: AuthSystemStore = {
    users: [...store.users, newUser],
    currentUser: newUser,
    households: {
      ...store.households,
      [newHousehold.id]: newHousehold,
    },
    invites: store.invites,
  };

  return { ok: true, store: nextStore, user: newUser, household: newHousehold };
}

export function authenticateUserInStore(
  store: AuthSystemStore,
  emailOrUsername: string,
  password: string
):
  | { ok: true; store: AuthSystemStore; user: UserAccount; household: SharedHouseholdData }
  | { ok: false; error: string } {
  const cleanId = emailOrUsername.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanId || !cleanPass) {
    return { ok: false, error: 'Please enter both your email/username and password.' };
  }

  const user = store.users.find(
    (u) =>
      u.emailOrUsername.toLowerCase() === cleanId ||
      u.name.toLowerCase() === cleanId
  );

  if (!user) {
    return { ok: false, error: 'No account found with that email or username.' };
  }

  if (user.passwordHash !== hashPasswordLocal(cleanPass)) {
    return { ok: false, error: 'Incorrect password. Please try again.' };
  }

  let household = store.households[user.householdId];
  let nextHouseholds = store.households;
  if (!household) {
    household = createDefaultHouseholdData(user.id, user.name, {
      householdId: user.householdId,
    });
    nextHouseholds = { ...store.households, [household.id]: household };
  }

  const nextStore: AuthSystemStore = {
    ...store,
    currentUser: user,
    households: nextHouseholds,
  };

  return { ok: true, store: nextStore, user, household };
}

export function inviteMemberToHouseholdInStore(
  store: AuthSystemStore,
  inviterUserId: string,
  inviteeEmailOrUsername: string
):
  | { ok: true; store: AuthSystemStore; invite: HouseholdInvite }
  | { ok: false; error: string } {
  const inviter = store.users.find((u) => u.id === inviterUserId);
  if (!inviter) {
    return { ok: false, error: 'Active user account not found.' };
  }
  const household = store.households[inviter.householdId];
  if (!household) {
    return { ok: false, error: 'Active household not found.' };
  }

  const cleanInvitee = inviteeEmailOrUsername.trim().toLowerCase();
  if (!cleanInvitee) {
    return { ok: false, error: 'Please enter an email address or username to invite.' };
  }
  if (cleanInvitee === inviter.emailOrUsername.toLowerCase()) {
    return { ok: false, error: 'You are already a member of this household.' };
  }

  const existingPending = store.invites.find(
    (i) =>
      i.householdId === household.id &&
      i.inviteeEmailOrUsername.toLowerCase() === cleanInvitee &&
      i.status === 'pending'
  );
  if (existingPending) {
    return { ok: true, store, invite: existingPending };
  }

  const newInvite: HouseholdInvite = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    householdId: household.id,
    householdName: household.name,
    shareCode: household.shareCode,
    invitedByUserId: inviter.id,
    invitedByName: inviter.name,
    inviteeEmailOrUsername: cleanInvitee,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    store: {
      ...store,
      invites: [newInvite, ...store.invites],
    },
    invite: newInvite,
  };
}

export function joinHouseholdByCodeInStore(
  store: AuthSystemStore,
  userId: string,
  rawShareCode: string
):
  | { ok: true; store: AuthSystemStore; household: SharedHouseholdData; user: UserAccount }
  | { ok: false; error: string } {
  const code = rawShareCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: 'Please enter a valid Household Share Code.' };
  }

  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return { ok: false, error: 'User account not found.' };
  }

  const targetHousehold = Object.values(store.households).find(
    (h) => h.shareCode.toUpperCase() === code
  );
  if (!targetHousehold) {
    return { ok: false, error: `No household found with Share Code "${code}".` };
  }

  const nextRole = targetHousehold.ownerUserId === user.id ? 'owner' : 'member';
  const updatedUser: UserAccount = {
    ...user,
    householdId: targetHousehold.id,
    role: nextRole,
  };

  const updatedHousehold: SharedHouseholdData = {
    ...targetHousehold,
    memberUserIds: Array.from(new Set([...targetHousehold.memberUserIds, user.id])),
    updatedAt: new Date().toISOString(),
    lastModifiedBy: user.name,
  };

  const updatedUsers = store.users.map((u) => (u.id === user.id ? updatedUser : u));
  const updatedInvites: HouseholdInvite[] = store.invites.map((inv) =>
    inv.householdId === targetHousehold.id &&
    (inv.inviteeEmailOrUsername.toLowerCase() === user.emailOrUsername.toLowerCase() ||
      inv.inviteeEmailOrUsername.toLowerCase() === user.name.toLowerCase())
      ? { ...inv, status: 'accepted' }
      : inv
  );

  const nextStore: AuthSystemStore = {
    users: updatedUsers,
    currentUser: store.currentUser?.id === user.id ? updatedUser : store.currentUser,
    households: {
      ...store.households,
      [targetHousehold.id]: updatedHousehold,
    },
    invites: updatedInvites,
  };

  return { ok: true, store: nextStore, household: updatedHousehold, user: updatedUser };
}

export function createNewIsolatedHouseholdForUserInStore(
  store: AuthSystemStore,
  userId: string,
  householdName?: string
):
  | { ok: true; store: AuthSystemStore; household: SharedHouseholdData; user: UserAccount }
  | { ok: false; error: string } {
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    return { ok: false, error: 'User account not found.' };
  }

  const newHousehold = createDefaultHouseholdData(user.id, user.name, {
    householdName: householdName?.trim() || `${user.name}'s Household`,
    setupCompleted: true,
  });

  const updatedUser: UserAccount = {
    ...user,
    householdId: newHousehold.id,
    role: 'owner',
  };

  const updatedUsers = store.users.map((u) => (u.id === user.id ? updatedUser : u));

  const nextStore: AuthSystemStore = {
    users: updatedUsers,
    currentUser: store.currentUser?.id === user.id ? updatedUser : store.currentUser,
    households: {
      ...store.households,
      [newHousehold.id]: newHousehold,
    },
    invites: store.invites,
  };

  return { ok: true, store: nextStore, household: newHousehold, user: updatedUser };
}

export function updateHouseholdStateInStore(
  store: AuthSystemStore,
  householdId: string,
  patch: Partial<
    Pick<
      SharedHouseholdData,
      | 'name'
      | 'roster'
      | 'tier'
      | 'inventory'
      | 'storageLocations'
      | 'powerDevices'
      | 'stormChecklist'
      | 'irishPlan'
      | 'rotationLogs'
      | 'setupCompleted'
    >
  >,
  modifiedByName?: string
): AuthSystemStore {
  const existing = store.households[householdId];
  if (!existing) return store;

  const updated: SharedHouseholdData = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
    lastModifiedBy: modifiedByName || existing.lastModifiedBy,
  };

  return {
    ...store,
    households: {
      ...store.households,
      [householdId]: updated,
    },
  };
}

export function updateUserDisplayNameInStore(
  store: AuthSystemStore,
  userId: string,
  newName: string
): AuthSystemStore {
  const trimmed = newName.trim();
  if (!trimmed) return store;

  const updatedUsers = store.users.map((u) =>
    u.id === userId ? { ...u, name: trimmed } : u
  );
  const updatedCurrent =
    store.currentUser?.id === userId
      ? { ...store.currentUser, name: trimmed }
      : store.currentUser;

  return {
    ...store,
    users: updatedUsers,
    currentUser: updatedCurrent,
  };
}

export function deleteUserAccountInStore(
  store: AuthSystemStore,
  userId: string
): AuthSystemStore {
  const target = store.users.find((u) => u.id === userId);
  if (!target) return store;

  const remainingUsers = store.users.filter((u) => u.id !== userId);
  const nextCurrentUser =
    store.currentUser?.id === userId ? null : store.currentUser;

  // Check if any other user still references target.householdId
  const stillReferenced = remainingUsers.some(
    (u) => u.householdId === target.householdId
  );
  const nextHouseholds = { ...store.households };
  if (!stillReferenced) {
    delete nextHouseholds[target.householdId];
  } else if (nextHouseholds[target.householdId]) {
    const hh = nextHouseholds[target.householdId];
    const remainingMembers = hh.memberUserIds.filter((id) => id !== userId);
    nextHouseholds[target.householdId] = {
      ...hh,
      memberUserIds: remainingMembers,
      ownerUserId:
        hh.ownerUserId === userId && remainingMembers.length > 0
          ? remainingMembers[0]
          : hh.ownerUserId,
    };
  }

  return {
    users: remainingUsers,
    currentUser: nextCurrentUser,
    households: nextHouseholds,
    invites: store.invites.filter((i) => i.invitedByUserId !== userId),
  };
}

export function createSeededAuthStore(
  existingLegacyData?: Partial<SharedHouseholdData>
): AuthSystemStore {
  const ownerId = 'usr-aoife-byrne';
  const partnerId = 'usr-cian-byrne';
  const primaryHouseholdId = 'hh-byrne-maynooth';
  const secondaryHouseholdId = 'hh-murphy-galway';

  const primaryHousehold = createDefaultHouseholdData(ownerId, 'Aoife Byrne', {
    householdId: primaryHouseholdId,
    householdName: 'Byrne Family Household (Maynooth)',
    shareCode: 'BR-BYRNE-10D',
    setupCompleted: existingLegacyData?.setupCompleted ?? true,
    customRoster: existingLegacyData?.roster,
    customTier: existingLegacyData?.tier,
    customInventory: existingLegacyData?.inventory
      ? normalizeAndSplitInventory(existingLegacyData.inventory).items
      : undefined,
  });

  if (existingLegacyData?.storageLocations?.length) {
    primaryHousehold.storageLocations = existingLegacyData.storageLocations;
  }
  if (existingLegacyData?.powerDevices?.length) {
    primaryHousehold.powerDevices = existingLegacyData.powerDevices;
  }
  if (existingLegacyData?.stormChecklist?.length) {
    primaryHousehold.stormChecklist = existingLegacyData.stormChecklist;
  }
  if (existingLegacyData?.irishPlan) {
    primaryHousehold.irishPlan = existingLegacyData.irishPlan;
  }
  if (existingLegacyData?.rotationLogs) {
    primaryHousehold.rotationLogs = existingLegacyData.rotationLogs;
  }

  // Create a second isolated household for Cian or Murphy Family so multi-user isolation & joining can be tested immediately
  const partnerSeparateHousehold = createDefaultHouseholdData(
    partnerId,
    'Cian Byrne',
    {
      householdId: secondaryHouseholdId,
      householdName: "Cian's Separate Profile (72h Tier)",
      shareCode: 'BR-CIAN-72H',
      setupCompleted: true,
      customTier: 'tier1_72h',
      customRoster: [
        {
          id: 'member-cian-1',
          type: 'adult',
          name: 'Cian Byrne',
          medicalNotes: 'Corrective glasses (-2.50 D)',
        },
      ],
    }
  );

  const nowIso = new Date().toISOString();
  const users: UserAccount[] = [
    {
      id: ownerId,
      name: 'Aoife Byrne',
      emailOrUsername: 'aoife@beready.ie',
      passwordHash: hashPasswordLocal('beready123'),
      householdId: primaryHouseholdId,
      role: 'owner',
      createdAt: nowIso,
    },
    {
      id: partnerId,
      name: 'Cian Byrne (Partner 2)',
      emailOrUsername: 'cian@beready.ie',
      passwordHash: hashPasswordLocal('beready123'),
      householdId: secondaryHouseholdId,
      role: 'owner',
      createdAt: nowIso,
    },
  ];

  const invites: HouseholdInvite[] = [
    {
      id: 'inv-default-partner',
      householdId: primaryHouseholdId,
      householdName: primaryHousehold.name,
      shareCode: primaryHousehold.shareCode,
      invitedByUserId: ownerId,
      invitedByName: 'Aoife Byrne',
      inviteeEmailOrUsername: 'cian@beready.ie',
      status: 'pending',
      createdAt: nowIso,
    },
  ];

  return {
    users,
    currentUser: users[0],
    households: {
      [primaryHouseholdId]: primaryHousehold,
      [secondaryHouseholdId]: partnerSeparateHousehold,
    },
    invites,
  };
}

export function loadAuthSystemFromLocalStorage(
  legacyData?: Partial<SharedHouseholdData>
): AuthSystemStore {
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    const rawCurrentUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    const rawHouseholds = localStorage.getItem(HOUSEHOLDS_STORAGE_KEY);
    const rawInvites = localStorage.getItem(INVITES_STORAGE_KEY);

    if (rawUsers && rawHouseholds) {
      const users = JSON.parse(rawUsers) as UserAccount[];
      const households = JSON.parse(rawHouseholds) as Record<
        string,
        SharedHouseholdData
      >;
      const invites = rawInvites ? (JSON.parse(rawInvites) as HouseholdInvite[]) : [];

      let currentUser: UserAccount | null = null;
      if (rawCurrentUser && rawCurrentUser !== 'null') {
        const parsedCurrent = JSON.parse(rawCurrentUser);
        if (typeof parsedCurrent === 'string') {
          currentUser = users.find((u) => u.id === parsedCurrent) || null;
        } else if (parsedCurrent && typeof parsedCurrent.id === 'string') {
          currentUser =
            users.find((u) => u.id === parsedCurrent.id) || parsedCurrent;
        }
      }

      if (Array.isArray(users) && users.length > 0) {
        return {
          users,
          currentUser,
          households,
          invites: Array.isArray(invites) ? invites : [],
        };
      }
    }
  } catch {
    // Fallback to seeded store on parse error
  }

  const seeded = createSeededAuthStore(legacyData);
  saveAuthSystemToLocalStorage(seeded);
  return seeded;
}

export function saveAuthSystemToLocalStorage(store: AuthSystemStore): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(store.users));
    localStorage.setItem(
      CURRENT_USER_STORAGE_KEY,
      JSON.stringify(store.currentUser)
    );
    localStorage.setItem(
      HOUSEHOLDS_STORAGE_KEY,
      JSON.stringify(store.households)
    );
    localStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(store.invites));
  } catch {
    // Ignore storage quota errors
  }
}
