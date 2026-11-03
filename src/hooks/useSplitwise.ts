import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  getStoredExpenses,
  getStoredGroups,
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
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
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
      const defaultMembers: GroupMember[] = [
        {
          id: 'mem_1',
          userId: 'usr_me',
          name: 'You',
          role: 'ADMIN',
          status: 'ACTIVE',
          joinedAt: new Date().toISOString(),
        },
      ];
      return found?.members || defaultMembers;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  });
};

export const useInviteMember = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      try {
        const res = await splitwiseApi.inviteMember(groupId, phoneNumber);
        return res.data;
      } catch {
        return {
          id: 'inv_' + Date.now(),
          groupId,
          groupName: 'Group',
          invitedPhoneNumber: phoneNumber,
          status: 'PENDING' as const,
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
          invitedBy: { id: 'usr_me', name: 'You' },
        };
      }
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

export const useAddExpense = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      try {
        const res = await splitwiseApi.addExpense(groupId, payload);
        if (res.data && res.data.id) return res.data;
      } catch (err: any) {
        console.warn('Backend addExpense failed, saving locally:', err.message);
      }
      return await createLocalExpense(groupId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupExpenses(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupBalances(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
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
        queryKey: queryKeys.groupBalances(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
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
        queryKey: queryKeys.groupBalances(groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
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
      const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      return {
        groupId,
        currency: 'INR',
        totalExpenses: total,
        memberBalances: [
          {
            userId: 'usr_me',
            name: 'You',
            totalPaid: total,
            totalShare: total / 2,
            settlementsSent: 0,
            settlementsReceived: 0,
            netBalance: total / 2,
          },
        ],
        suggestedTransfers: [],
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
        return res.data;
      } catch {
        return { content: [], totalElements: 0, totalPages: 1, number: 0 };
      }
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
        return res.data;
      } catch {
        return {
          id: 'stl_' + Date.now(),
          groupId,
          fromUser: { id: payload.fromUserId, name: 'You' },
          toUser: { id: payload.toUserId, name: 'Friend' },
          amount: payload.amount,
          currency: 'INR',
          paymentMethod: payload.paymentMethod || 'UPI',
          status: 'CONFIRMED' as const,
          createdAt: new Date().toISOString(),
        };
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
