import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CreateExpensePayload,
  CreateGroupPayload,
  GroupBalancesResponse,
  GroupItem,
  GroupMember,
  SettlementItem,
  SettlementRecordPayload,
  SharedExpense,
} from '../types/splitwise';

const GROUPS_STORAGE_KEY = '@kharcha_local_groups';
const EXPENSES_STORAGE_PREFIX = '@kharcha_local_expenses_';
const BALANCES_STORAGE_PREFIX = '@kharcha_local_balances_';
const SETTLEMENTS_STORAGE_PREFIX = '@kharcha_local_settlements_';

// Initial sample group if needed (disabled by default so new users start with 0 groups)
export const DEFAULT_GROUPS: GroupItem[] = [];

// Get cached groups from storage
export const getStoredGroups = async (): Promise<GroupItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(GROUPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local groups:', e);
  }
  return [];
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

  const initialMembersList: GroupMember[] = [defaultMember];
  if (payload.initialMembers && Array.isArray(payload.initialMembers)) {
    payload.initialMembers.forEach((im, idx) => {
      if (im.name && im.name.trim()) {
        initialMembersList.push({
          id: 'mem_init_' + Date.now() + '_' + idx,
          userId: 'usr_init_' + Date.now() + '_' + idx,
          name: im.name.trim(),
          phoneNumber: im.phoneNumber?.trim() || undefined,
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: new Date().toISOString(),
        });
      }
    });
  }

  const newGroup: GroupItem = {
    id: 'grp_' + Date.now(),
    name: payload.name,
    description: payload.description,
    currency: payload.currency || 'INR',
    memberCount: initialMembersList.length,
    totalExpenses: 0,
    currentUserNetBalance: 0,
    createdAt: new Date().toISOString(),
    members: initialMembersList,
  };

  const updated = [newGroup, ...currentGroups];
  await saveStoredGroups(updated);
  return newGroup;
};

// Get all stored expenses across all groups
export const getAllStoredExpenses = async (): Promise<SharedExpense[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const expenseKeys = keys.filter((k) => k.startsWith(EXPENSES_STORAGE_PREFIX));
    if (expenseKeys.length === 0) return [];
    const stores = await AsyncStorage.multiGet(expenseKeys);
    let all: SharedExpense[] = [];
    stores.forEach(([, val]) => {
      if (val) {
        try {
          const list = JSON.parse(val);
          if (Array.isArray(list)) {
            all = all.concat(list);
          }
        } catch {}
      }
    });
    return all;
  } catch (e) {
    console.warn('Error reading all expenses:', e);
    return [];
  }
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

  // Use customized splits if provided, otherwise compute standard equal split
  const splits = payload.splits && payload.splits.length > 0
    ? payload.splits
    : payload.participantIds.map((id) => ({
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

  // Update group total in storage and calculate net balance for current user
  await recalculateGroupBalances(groupId, currentUserId);

  return newExpense;
};

// Get stored settlements for a group
export const getStoredSettlements = async (groupId: string): Promise<SettlementItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(SETTLEMENTS_STORAGE_PREFIX + groupId);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local settlements:', e);
  }
  return [];
};

// Add a local settlement payment and recalculate group balance
export const createLocalSettlement = async (
  groupId: string,
  payload: SettlementRecordPayload,
  currentUserId: string = 'usr_me'
): Promise<SettlementItem> => {
  const currentSettlements = await getStoredSettlements(groupId);
  const newSettlement: SettlementItem = {
    id: 'stl_' + Date.now(),
    groupId,
    fromUser: {
      id: payload.fromUserId,
      name: payload.fromUserId === currentUserId ? 'You' : 'Member',
    },
    toUser: {
      id: payload.toUserId,
      name: payload.toUserId === currentUserId ? 'You' : 'Member',
    },
    amount: payload.amount,
    currency: 'INR',
    paymentMethod: payload.paymentMethod || 'UPI',
    status: 'CONFIRMED',
    note: payload.note,
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  };

  const updatedSettlements = [newSettlement, ...currentSettlements];
  await AsyncStorage.setItem(
    SETTLEMENTS_STORAGE_PREFIX + groupId,
    JSON.stringify(updatedSettlements)
  );

  // Recalculate group net balance accounting for expenses and payments
  await recalculateGroupBalances(groupId, currentUserId);

  return newSettlement;
};

// Helper to recalculate group net balance
export const recalculateGroupBalances = async (groupId: string, currentUserId: string = 'usr_me'): Promise<void> => {
  const groups = await getStoredGroups();
  const groupIndex = groups.findIndex((g) => g.id === groupId);
  if (groupIndex === -1) return;

  const expenses = await getStoredExpenses(groupId);
  const settlements = await getStoredSettlements(groupId);

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  groups[groupIndex].totalExpenses = total;

  let userNet = 0;
  for (const exp of expenses) {
    const isPayer = exp.paidBy?.id === currentUserId;
    const userShareObj = exp.splits?.find((s) => s.userId === currentUserId);
    const userShare = userShareObj ? userShareObj.shareAmount : (exp.amount / (exp.participantCount || 1));
    if (isPayer) {
      userNet += (exp.amount - userShare);
    } else if (userShareObj) {
      userNet -= userShare;
    }
  }

  // Adjust for settlements (payments made and received by user) - only CONFIRMED settlements
  for (const stl of settlements) {
    if (stl.status === 'CONFIRMED') {
      if (stl.fromUser.id === currentUserId) {
        // Current user paid money in settlement -> net debt reduces (balance increases)
        userNet += stl.amount;
      }
      if (stl.toUser.id === currentUserId) {
        // Current user received money in settlement -> amount owed to user reduces (balance decreases)
        userNet -= stl.amount;
      }
    }
  }

  groups[groupIndex].currentUserNetBalance = userNet;
  await saveStoredGroups(groups);
};
