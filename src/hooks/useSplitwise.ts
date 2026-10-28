import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { splitwiseApi } from '../api/splitwiseService';
import {
  CreateExpensePayload,
  CreateGroupPayload,
  SettlementRecordPayload,
  UpdateGroupPayload,
  UpdateProfilePayload,
} from '../types/splitwise';

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
      const res = await splitwiseApi.getMyProfile();
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateProfilePayload) => {
      const res = await splitwiseApi.updateProfile(data);
      return res.data;
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
      const res = await splitwiseApi.getMyInvitations();
      return res.data;
    },
    refetchInterval: 30000,
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await splitwiseApi.acceptInvitation(invitationId);
      return res.data;
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
      const res = await splitwiseApi.rejectInvitation(invitationId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations });
    },
  });
};

// --- Groups Hooks ---
export const useMyGroups = () => {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => {
      const res = await splitwiseApi.getMyGroups();
      return res.data;
    },
    staleTime: 1000 * 30,
  });
};

export const useGroupDetails = (groupId?: string) => {
  return useQuery({
    queryKey: queryKeys.group(groupId || ''),
    queryFn: async () => {
      if (!groupId) throw new Error('No groupId provided');
      const res = await splitwiseApi.getGroupDetails(groupId);
      return res.data;
    },
    enabled: !!groupId,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGroupPayload) => {
      const res = await splitwiseApi.createGroup(payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
};

export const useUpdateGroup = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateGroupPayload) => {
      const res = await splitwiseApi.updateGroup(groupId, payload);
      return res.data;
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
      const res = await splitwiseApi.deleteGroup(groupId);
      return res.data;
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
      const res = await splitwiseApi.getGroupMembers(groupId);
      return res.data;
    },
    enabled: !!groupId,
  });
};

export const useInviteMember = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await splitwiseApi.inviteMember(groupId, phoneNumber);
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
      const res = await splitwiseApi.removeMember(groupId, userId);
      return res.data;
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
      if (!groupId) throw new Error('No groupId');
      const res = await splitwiseApi.getGroupExpenses(groupId, page, size);
      return res.data;
    },
    enabled: !!groupId,
  });
};

export const useExpenseDetails = (groupId?: string, expenseId?: string) => {
  return useQuery({
    queryKey: queryKeys.expense(groupId || '', expenseId || ''),
    queryFn: async () => {
      if (!groupId || !expenseId) throw new Error('Missing id');
      const res = await splitwiseApi.getExpenseDetails(groupId, expenseId);
      return res.data;
    },
    enabled: !!groupId && !!expenseId,
  });
};

export const useAddExpense = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      const res = await splitwiseApi.addExpense(groupId, payload);
      return res.data;
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
      const res = await splitwiseApi.updateExpense(groupId, expenseId, data);
      return res.data;
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
      const res = await splitwiseApi.deleteExpense(groupId, expenseId);
      return res.data;
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
      if (!groupId) throw new Error('No groupId');
      const res = await splitwiseApi.getGroupBalances(groupId);
      return res.data;
    },
    enabled: !!groupId,
  });
};

// --- Settlements Hooks ---
export const useGroupSettlements = (groupId?: string, page = 0, size = 20) => {
  return useQuery({
    queryKey: queryKeys.groupSettlements(groupId || '', page),
    queryFn: async () => {
      if (!groupId) throw new Error('No groupId');
      const res = await splitwiseApi.getSettlements(groupId, page, size);
      return res.data;
    },
    enabled: !!groupId,
  });
};

export const useRecordSettlement = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SettlementRecordPayload) => {
      const res = await splitwiseApi.recordSettlement(groupId, payload);
      return res.data;
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
      const res = await splitwiseApi.confirmSettlement(groupId, settlementId);
      return res.data;
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
      const res = await splitwiseApi.rejectSettlement(groupId, settlementId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupSettlements(groupId),
      });
    },
  });
};
