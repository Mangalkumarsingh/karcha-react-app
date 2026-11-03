import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CreateExpensePayload,
  CreateGroupPayload,
  GroupBalancesResponse,
  GroupItem,
  GroupMember,
  SharedExpense,
} from '../types/splitwise';

const GROUPS_STORAGE_KEY = '@kharcha_local_groups';
const EXPENSES_STORAGE_PREFIX = '@kharcha_local_expenses_';
const BALANCES_STORAGE_PREFIX = '@kharcha_local_balances_';

// Initial sample group if user has zero groups
export const DEFAULT_GROUPS: GroupItem[] = [
  {
    id: 'grp_default_1',
    name: 'Home & Flatmates',
    description: 'Rent, groceries and electricity',
    currency: 'INR',
    memberCount: 2,
    totalExpenses: 2400,
    currentUserNetBalance: 600,
    createdAt: new Date().toISOString(),
    members: [
      {
        id: 'mem_1',
        userId: 'usr_me',
        name: 'You',
        role: 'ADMIN',
        status: 'ACTIVE',
        joinedAt: new Date().toISOString(),
      },
      {
        id: 'mem_2',
        userId: 'usr_roommate',
        name: 'Roommate',
        phoneNumber: '+919876543211',
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date().toISOString(),
      },
    ],
  },
];

// Get cached groups from storage
export const getStoredGroups = async (): Promise<GroupItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(GROUPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local groups:', e);
  }
  return DEFAULT_GROUPS;
};

// Save groups to storage
export const saveStoredGroups = async (groups: GroupItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (e) {
    console.warn('Error saving local groups:', e);
  }
};

// Add a new local group
export const createLocalGroup = async (
  payload: CreateGroupPayload,
  userName: string = 'You',
  userId: string = 'usr_me'
): Promise<GroupItem> => {
  const currentGroups = await getStoredGroups();
  const defaultMember: GroupMember = {
    id: 'mem_' + Date.now(),
    userId: userId,
    name: userName,
    role: 'ADMIN',
    status: 'ACTIVE',
    joinedAt: new Date().toISOString(),
  };

  const newGroup: GroupItem = {
    id: 'grp_' + Date.now(),
    name: payload.name,
    description: payload.description,
    currency: payload.currency || 'INR',
    memberCount: 1,
    totalExpenses: 0,
    currentUserNetBalance: 0,
    createdAt: new Date().toISOString(),
    members: [defaultMember],
  };

  const updated = [newGroup, ...currentGroups];
  await saveStoredGroups(updated);
  return newGroup;
};

// Get stored expenses for a group
export const getStoredExpenses = async (groupId: string): Promise<SharedExpense[]> => {
  try {
    const raw = await AsyncStorage.getItem(EXPENSES_STORAGE_PREFIX + groupId);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local expenses:', e);
  }
  return [];
};

// Add a local expense
export const createLocalExpense = async (
  groupId: string,
  payload: CreateExpensePayload,
  payerName: string = 'You',
  currentUserId: string = 'usr_me'
): Promise<SharedExpense> => {
  const currentExpenses = await getStoredExpenses(groupId);
  const participantCount = payload.participantIds.length || 1;
  const sharePerPerson = payload.amount / participantCount;

  const splits = payload.participantIds.map((id) => ({
    userId: id,
    userName: id === currentUserId ? 'You' : 'Member',
    shareAmount: sharePerPerson,
  }));

  const newExpense: SharedExpense = {
    id: 'exp_' + Date.now(),
    groupId,
    title: payload.title,
    description: payload.description,
    amount: payload.amount,
    currency: 'INR',
    paidBy: {
      id: payload.paidByUserId,
      name: payerName,
    },
    createdBy: {
      id: currentUserId,
      name: 'You',
    },
    participantCount,
    splitType: payload.splitType,
    createdAt: new Date().toISOString(),
    splits,
  };

  const updatedExpenses = [newExpense, ...currentExpenses];
  await AsyncStorage.setItem(
    EXPENSES_STORAGE_PREFIX + groupId,
    JSON.stringify(updatedExpenses)
  );

  // Update group total in storage
  const groups = await getStoredGroups();
  const groupIndex = groups.findIndex((g) => g.id === groupId);
  if (groupIndex !== -1) {
    groups[groupIndex].totalExpenses =
      (groups[groupIndex].totalExpenses || 0) + payload.amount;
    await saveStoredGroups(groups);
  }

  return newExpense;
};
