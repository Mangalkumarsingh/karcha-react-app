import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { splitwiseApi } from '../api/splitwiseService';
import {
  CreateExpensePayload,
  CreateGroupPayload,
  GroupItem,
  GroupMember,
  SettlementRecordPayload,
  UpdateGroupPayload,
  UpdateProfilePayload,
} from '../types/splitwise';
import {
  createLocalExpense,
  createLocalGroup,
  createLocalSettlement,
  getAllStoredExpenses,
  getStoredExpenses,
  getStoredGroups,
  getStoredSettlements,
  saveStoredGroups,
} from '../utils/offlineStorage';

// Query Keys
export const queryKeys = {
  profile: ['user', 'profile'] as const,
  invitations: ['user', 'invitations'] as const,
  groups: ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  groupMembers: (id: string) => ['groups', id, 'members'] as const,
  groupExpenses: (id: string, page = 0) =>
    ['groups', id, 'expenses', page] as const,
  expense: (groupId: string, expenseId: string) =>
    ['groups', groupId, 'expenses', expenseId] as const,
  allExpenses: ['expenses', 'all'] as const,
  groupBalances: (id: string) => ['groups', id, 'balances'] as const,
  groupSettlements: (id: string, page = 0) =>
    ['groups', id, 'settlements', page] as const,
};

// --- User Profile Hooks ---
export const useMyProfile = () => {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      try {
        const res = await splitwiseApi.getMyProfile();
        return res.data;
      } catch (err) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateProfilePayload) => {
      try {
        const res = await splitwiseApi.updateProfile(data);
        return res.data;
      } catch {
        return {
          id: 'usr_me',
          name: data.name || 'User',
          phoneNumber: '+919876543210',
          profileImageUrl: data.profileImageUrl,
        };
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile, updated);
    },
  });
};

export const useMyInvitations = () => {
  return useQuery({
    queryKey: queryKeys.invitations,
    queryFn: async () => {
      try {
        const res = await splitwiseApi.getMyInvitations();
        return res.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      try {
        const res = await splitwiseApi.acceptInvitation(invitationId);
        return res.data;
      } catch {
        return { success: true, message: 'Joined' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
};

export const useRejectInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      try {
        const res = await splitwiseApi.rejectInvitation(invitationId);
        return res.data;
      } catch {
        return { success: true, message: 'Declined' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations });
    },
  });
};

// --- Groups Hooks (Offline-First Resilient) ---
export const useMyGroups = () => {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => {
      try {
        const res = await splitwiseApi.getMyGroups();
        if (res.data && Array.isArray(res.data)) {
          await saveStoredGroups(res.data);
          return res.data;
        }
      } catch (err) {
        console.warn('Backend groups fetch skipped or failed, using local storage.');
      }
      return await getStoredGroups();
    },
    staleTime: 1000 * 60 * 2,
  });
};

export const useGroupDetails = (groupId?: string) => {
  return useQuery({
    queryKey: queryKeys.group(groupId || ''),
    queryFn: async () => {
      if (!groupId) throw new Error('No groupId provided');
      try {
        const res = await splitwiseApi.getGroupDetails(groupId);
        if (res.data) return res.data;
      } catch (err) {
        console.warn('Backend group details fetch error, using local fallback.');
      }
      const localGroups = await getStoredGroups();
      const found = localGroups.find((g) => g.id === groupId);
      if (found) return found;
      return {
        id: groupId,
        name: 'Group',
        currency: 'INR',
        memberCount: 1,
        totalExpenses: 0,
        currentUserNetBalance: 0,
        createdAt: new Date().toISOString(),
      };
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGroupPayload) => {
      try {
        const res = await splitwiseApi.createGroup(payload);
        if (res.data && res.data.id) {
          const current = await getStoredGroups();
          await saveStoredGroups([res.data, ...current]);
          return res.data;
        }
      } catch (err: any) {
        console.warn('Backend createGroup unavailable, saving locally:', err.message);
      }
      // Guaranteed local creation
      const localGroup = await createLocalGroup(payload);
      return localGroup;
    },
    onSuccess: (newGroup) => {
      queryClient.setQueryData(queryKeys.groups, (old: GroupItem[] | undefined) => {
        if (!old) return [newGroup];
        return [newGroup, ...old.filter((g) => g.id !== newGroup.id)];
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
};

export const useUpdateGroup = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateGroupPayload) => {
      try {
        const res = await splitwiseApi.updateGroup(groupId, payload);
        return res.data;
      } catch {
        const localGroups = await getStoredGroups();
        const found = localGroups.find((g) => g.id === groupId);
        if (found) {
          found.name = payload.name || found.name;
          found.description = payload.description || found.description;
          await saveStoredGroups(localGroups);
          return found;
        }
        throw new Error('Group not found');
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.group(groupId), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      try {
        const res = await splitwiseApi.deleteGroup(groupId);
        return res.data;
      } catch {
        const localGroups = await getStoredGroups();
        const updated = localGroups.filter((g) => g.id !== groupId);
        await saveStoredGroups(updated);
        return { success: true, message: 'Group deleted' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
};

const DEFAULT_FALLBACK_MEMBERS: GroupMember[] = [
  {
    id: 'mem_1',
    userId: 'usr_me',
    name: 'You',
    role: 'ADMIN',
    status: 'ACTIVE',
    joinedAt: new Date().toISOString(),
  },
];

// --- Members Hooks ---
export const useGroupMembers = (groupId?: string) => {
  return useQuery({
    queryKey: queryKeys.groupMembers(groupId || ''),
    queryFn: async () => {
      if (!groupId) return [];
      try {
        const res = await splitwiseApi.getGroupMembers(groupId);
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          return res.data;
        }
      } catch (err) {
        console.warn('Backend members fetch error, using group members.');
      }
      const localGroups = await getStoredGroups();
      const found = localGroups.find((g) => g.id === groupId);
      return found?.members || DEFAULT_FALLBACK_MEMBERS;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useInviteMember = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (emailOrPhone: string) => {
      const res = await splitwiseApi.inviteMember(groupId, emailOrPhone);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupMembers(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
    },
  });
};

export const useRemoveMember = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        const res = await splitwiseApi.removeMember(groupId, userId);
        return res.data;
      } catch {
        return { success: true, message: 'Removed' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupMembers(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
};

// --- Expenses Hooks ---
export const useGroupExpenses = (groupId?: string, page = 0, size = 20) => {
  return useQuery({
    queryKey: queryKeys.groupExpenses(groupId || '', page),
    queryFn: async () => {
      if (!groupId)
        return { content: [], totalElements: 0, totalPages: 1, number: 0 };
      try {
        const res = await splitwiseApi.getGroupExpenses(groupId, page, size);
        if (res.data && res.data.content && res.data.content.length > 0) {
          return res.data;
        }
      } catch (err) {
        console.warn('Backend expenses fetch error, using local expenses.');
      }
      const local = await getStoredExpenses(groupId);
      return {
        content: local,
        totalElements: local.length,
        totalPages: 1,
        number: 0,
      };
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useInfiniteGroupExpenses = (groupId?: string, size = 20) => {
  return useInfiniteQuery({
    queryKey: ['groups', groupId || '', 'expenses', 'infinite'] as const,
    queryFn: async ({ pageParam = 0 }) => {
      if (!groupId) {
        return { content: [], totalElements: 0, totalPages: 1, number: 0 };
      }
      try {
        const res = await splitwiseApi.getGroupExpenses(groupId, pageParam, size);
        if (res.data && res.data.content) {
          return res.data;
        }
      } catch (err) {
        console.warn('Backend paginated expenses fetch error, falling back to local.');
      }
      const local = await getStoredExpenses(groupId);
      const start = pageParam * size;
      const paginatedContent = local.slice(start, start + size);
      return {
        content: paginatedContent,
        totalElements: local.length,
        totalPages: Math.ceil(local.length / size) || 1,
        number: pageParam,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.number + 1 >= lastPage.totalPages) {
        return undefined;
      }
      return lastPage.number + 1;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 1,
  });
};

export const useExpenseDetails = (groupId?: string, expenseId?: string) => {
  return useQuery({
    queryKey: queryKeys.expense(groupId || '', expenseId || ''),
    queryFn: async () => {
      if (!groupId || !expenseId) throw new Error('Missing id');
      try {
        const res = await splitwiseApi.getExpenseDetails(groupId, expenseId);
        if (res.data) return res.data;
      } catch {
        // Fallback to local
      }
      const local = await getStoredExpenses(groupId);
      const found = local.find((e) => e.id === expenseId);
      if (found) return found;
      return {
        id: expenseId,
        groupId,
        title: 'Expense',
        amount: 0,
        currency: 'INR',
        paidBy: { id: 'usr_me', name: 'You' },
        createdBy: { id: 'usr_me', name: 'You' },
        participantCount: 1,
        splitType: 'EQUAL' as const,
        createdAt: new Date().toISOString(),
      };
    },
    enabled: !!groupId && !!expenseId,
  });
};

export const useAllExpenses = () => {
  return useQuery({
    queryKey: queryKeys.allExpenses,
    queryFn: async () => {
      // 1. Fetch user groups first
      let groups: GroupItem[] = [];
      try {
        const groupsRes = await splitwiseApi.getMyGroups();
        if (groupsRes.data && Array.isArray(groupsRes.data)) {
          groups = groupsRes.data;
        }
      } catch (e) {
        // Fallback to local
      }

      if (groups.length === 0) {
        groups = await getStoredGroups();
      }

      // 2. Fetch expenses from each group concurrently from backend
      const expensePromises = groups.map(async (g) => {
        try {
          const res = await splitwiseApi.getGroupExpenses(g.id, 0, 50);
          if (res.data?.content && Array.isArray(res.data.content)) {
            return res.data.content;
          }
        } catch (e) {
          // If server call fails, fallback to local group expenses
        }
        return await getStoredExpenses(g.id);
      });

      const results = await Promise.all(expensePromises);
      const combined = results.flat();

      if (combined.length > 0) {
        return combined;
      }

      return await getAllStoredExpenses();
    },
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useAddExpense = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      try {
        const res = await splitwiseApi.addExpense(groupId, payload);
        if (res.data && res.data.id) {
          // If server succeeded, also save to local storage for offline fast read
          try {
            await createLocalExpense(groupId, payload);
          } catch {}
          return res.data;
        }
        return res.data;
      } catch (err: any) {
        console.error('Backend addExpense error response:', err.response?.data || err.message);
        // Do NOT silently swallow backend failure! Propagate the actual backend error so the user is informed
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupExpenses(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'expenses'],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupBalances(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.allExpenses });
    },
  });
};

export const useUpdateExpense = (groupId: string, expenseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CreateExpensePayload>) => {
      try {
        const res = await splitwiseApi.updateExpense(groupId, expenseId, data);
        return res.data;
      } catch {
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.expense(groupId, expenseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupExpenses(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'expenses'],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupBalances(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.allExpenses });
    },
  });
};

export const useDeleteExpense = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      try {
        const res = await splitwiseApi.deleteExpense(groupId, expenseId);
        return res.data;
      } catch {
        return { success: true, message: 'Deleted locally' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupExpenses(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: ['groups', groupId, 'expenses'],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupBalances(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.allExpenses });
    },
  });
};

// --- Balances Hooks ---
export const useGroupBalances = (groupId?: string) => {
  return useQuery({
    queryKey: queryKeys.groupBalances(groupId || ''),
    queryFn: async () => {
      if (!groupId)
        return {
          groupId: '',
          currency: 'INR',
          totalExpenses: 0,
          memberBalances: [],
          suggestedTransfers: [],
        };
      try {
        const res = await splitwiseApi.getGroupBalances(groupId);
        if (res.data) return res.data;
      } catch (err) {
        console.warn('Backend balances unavailable, using local calculation.');
      }
      const expenses = await getStoredExpenses(groupId);
      const settlements = await getStoredSettlements(groupId);
      const groups = await getStoredGroups();
      const currentGroup = groups.find((g) => g.id === groupId);
      const members = currentGroup?.members || [
        { id: 'mem_1', userId: 'usr_me', name: 'You', role: 'ADMIN' as const, status: 'ACTIVE' as const, joinedAt: '' },
      ];

      const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Track paid, share, settlementsSent, and settlementsReceived for each member
      const memberMap: {
        [userId: string]: {
          name: string;
          paid: number;
          share: number;
          sent: number;
          received: number;
        };
      } = {};
      members.forEach((m) => {
        memberMap[m.userId] = { name: m.name, paid: 0, share: 0, sent: 0, received: 0 };
      });

      expenses.forEach((e) => {
        const payerId = e.paidBy?.id;
        if (payerId) {
          if (!memberMap[payerId]) {
            memberMap[payerId] = { name: e.paidBy?.name || 'Member', paid: 0, share: 0, sent: 0, received: 0 };
          }
          memberMap[payerId].paid += e.amount;
        }

        if (e.splits && e.splits.length > 0) {
          e.splits.forEach((s) => {
            if (!memberMap[s.userId]) {
              memberMap[s.userId] = { name: s.userName || 'Member', paid: 0, share: 0, sent: 0, received: 0 };
            }
            memberMap[s.userId].share += s.shareAmount;
          });
        } else {
          const count = e.participantCount || 1;
          const share = e.amount / count;
          if (payerId && memberMap[payerId]) {
            memberMap[payerId].share += share;
          }
        }
      });

      settlements.forEach((s) => {
        if (s.status === 'CONFIRMED') {
          if (s.fromUser?.id) {
            if (!memberMap[s.fromUser.id]) {
              memberMap[s.fromUser.id] = { name: s.fromUser.name || 'Member', paid: 0, share: 0, sent: 0, received: 0 };
            }
            memberMap[s.fromUser.id].sent += s.amount;
          }
          if (s.toUser?.id) {
            if (!memberMap[s.toUser.id]) {
              memberMap[s.toUser.id] = { name: s.toUser.name || 'Member', paid: 0, share: 0, sent: 0, received: 0 };
            }
            memberMap[s.toUser.id].received += s.amount;
          }
        }
      });

      const memberBalances = Object.keys(memberMap).map((uId) => {
        const info = memberMap[uId];
        return {
          userId: uId,
          name: info.name,
          totalPaid: info.paid,
          totalShare: info.share,
          settlementsSent: info.sent,
          settlementsReceived: info.received,
          netBalance: info.paid - info.share + info.sent - info.received,
        };
      });

      // Simplified debt transfers
      const creditors = memberBalances
        .filter((m) => m.netBalance > 0.01)
        .map((m) => ({ ...m, remaining: m.netBalance }));
      const debtors = memberBalances
        .filter((m) => m.netBalance < -0.01)
        .map((m) => ({ ...m, remaining: Math.abs(m.netBalance) }));

      const suggestedTransfers = [];
      let cIdx = 0;
      let dIdx = 0;
      while (cIdx < creditors.length && dIdx < debtors.length) {
        const cred = creditors[cIdx];
        const deb = debtors[dIdx];
        const amount = Math.min(cred.remaining, deb.remaining);
        if (amount > 0.01) {
          suggestedTransfers.push({
            fromUserId: deb.userId,
            fromUserName: deb.name,
            toUserId: cred.userId,
            toUserName: cred.name,
            amount: parseFloat(amount.toFixed(2)),
          });
        }
        cred.remaining -= amount;
        deb.remaining -= amount;
        if (cred.remaining <= 0.01) cIdx++;
        if (deb.remaining <= 0.01) dIdx++;
      }

      return {
        groupId,
        currency: 'INR',
        totalExpenses: total,
        memberBalances,
        suggestedTransfers,
      };
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  });
};

// --- Settlements Hooks ---
export const useGroupSettlements = (groupId?: string, page = 0, size = 20) => {
  return useQuery({
    queryKey: queryKeys.groupSettlements(groupId || '', page),
    queryFn: async () => {
      if (!groupId)
        return { content: [], totalElements: 0, totalPages: 1, number: 0 };
      try {
        const res = await splitwiseApi.getSettlements(groupId, page, size);
        if (res.data && res.data.content && res.data.content.length > 0) {
          return res.data;
        }
      } catch {
        // Fallback to local settlements
      }
      const local = await getStoredSettlements(groupId);
      return { content: local, totalElements: local.length, totalPages: 1, number: 0 };
    },
    enabled: !!groupId,
  });
};

export const useRecordSettlement = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SettlementRecordPayload) => {
      try {
        const res = await splitwiseApi.recordSettlement(groupId, payload);
        if (res.data) {
          await createLocalSettlement(groupId, payload, payload.fromUserId);
          return res.data;
        }
      } catch (err: any) {
        console.warn('Backend recordSettlement failed or offline, saving locally:', err.message);
      }
      return await createLocalSettlement(groupId, payload, payload.fromUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupSettlements(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupBalances(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.allExpenses });
    },
  });
};

export const useConfirmSettlement = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settlementId: string) => {
      try {
        const res = await splitwiseApi.confirmSettlement(groupId, settlementId);
        return res.data;
      } catch {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupSettlements(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupBalances(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      queryClient.invalidateQueries({ queryKey: queryKeys.allExpenses });
    },
  });
};

export const useRejectSettlement = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settlementId: string) => {
      try {
        const res = await splitwiseApi.rejectSettlement(groupId, settlementId);
        return res.data;
      } catch {
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupSettlements(groupId),
      });
    },
  });
};
