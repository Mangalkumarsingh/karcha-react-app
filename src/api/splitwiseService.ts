import {
  AuthRequestOtpPayload,
  AuthRequestOtpResponse,
  AuthVerifyOtpPayload,
  AuthVerifyOtpResponse,
  CreateExpensePayload,
  CreateGroupPayload,
  GoogleLoginPayload,
  GroupBalancesResponse,
  GroupItem,
  GroupMember,
  PaginatedExpensesResponse,
  PaginatedSettlementsResponse,
  SettlementItem,
  SettlementRecordPayload,
  SharedExpense,
  UpdateGroupPayload,
  UpdateProfilePayload,
  UserInvitation,
  UserProfile,
} from '../types/splitwise';
import api from './client';

export const splitwiseApi = {
  // 1. Authentication Module (/auth)
  requestOtp: (phoneNumber: string) =>
    api.post<AuthRequestOtpResponse>('/auth/otp/request', {
      phoneNumber,
    } as AuthRequestOtpPayload),

  verifyOtp: (phoneNumber: string, otp: string) =>
    api.post<AuthVerifyOtpResponse>('/auth/otp/verify', {
      phoneNumber,
      otp,
    } as AuthVerifyOtpPayload),

  googleLogin: (googleToken: string) =>
    api.post<AuthVerifyOtpResponse>('/auth/google', {
      googleToken,
    } as GoogleLoginPayload),

  // 2. User Profile Module (/users)
  getMyProfile: () => api.get<UserProfile>('/users/me'),

  updateProfile: (data: UpdateProfilePayload) =>
    api.patch<UserProfile>('/users/me', data),

  getMyInvitations: () => api.get<UserInvitation[]>('/users/me/invitations'),

  // 3. Group Management Module (/groups)
  createGroup: (data: CreateGroupPayload) =>
    api.post<GroupItem>('/groups', data),

  getMyGroups: () => api.get<GroupItem[]>('/groups'),

  getGroupDetails: (groupId: string) =>
    api.get<GroupItem>(`/groups/${groupId}`),

  updateGroup: (groupId: string, data: UpdateGroupPayload) =>
    api.patch<GroupItem>(`/groups/${groupId}`, data),

  deleteGroup: (groupId: string) =>
    api.delete<{ success: boolean; message: string }>(`/groups/${groupId}`),

  // 4. Group Members & Invitations Module
  inviteMember: (groupId: string, phoneNumber: string) =>
    api.post<UserInvitation>(`/groups/${groupId}/invitations`, { phoneNumber }),

  acceptInvitation: (invitationId: string) =>
    api.post<{ success: boolean; message: string }>(
      `/invitations/${invitationId}/accept`
    ),

  rejectInvitation: (invitationId: string) =>
    api.post<{ success: boolean; message: string }>(
      `/invitations/${invitationId}/reject`
    ),

  getGroupMembers: (groupId: string) =>
    api.get<GroupMember[]>(`/groups/${groupId}/members`),

  removeMember: (groupId: string, userId: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/groups/${groupId}/members/${userId}`
    ),

  // 5. Shared Expense Management Module (/groups/{groupId}/expenses)
  addExpense: (groupId: string, expenseData: CreateExpensePayload) =>
    api.post<SharedExpense>(`/groups/${groupId}/expenses`, expenseData),

  getGroupExpenses: (groupId: string, page = 0, size = 20) =>
    api.get<PaginatedExpensesResponse>(
      `/groups/${groupId}/expenses?page=${page}&size=${size}`
    ),

  getExpenseDetails: (groupId: string, expenseId: string) =>
    api.get<SharedExpense>(`/groups/${groupId}/expenses/${expenseId}`),

  updateExpense: (
    groupId: string,
    expenseId: string,
    data: Partial<CreateExpensePayload>
  ) => api.put<SharedExpense>(`/groups/${groupId}/expenses/${expenseId}`, data),

  deleteExpense: (groupId: string, expenseId: string) =>
    api.delete<{ success: boolean; message: string }>(
      `/groups/${groupId}/expenses/${expenseId}`
    ),

  // 6. Group Balances & Debt Simplification Module
  getGroupBalances: (groupId: string) =>
    api.get<GroupBalancesResponse>(`/groups/${groupId}/balances`),

  // 7. Settlement (Payment) Module (/groups/{groupId}/settlements)
  recordSettlement: (
    groupId: string,
    settlementData: SettlementRecordPayload
  ) =>
    api.post<SettlementItem>(
      `/groups/${groupId}/settlements`,
      settlementData
    ),

  getSettlements: (groupId: string, page = 0, size = 20) =>
    api.get<PaginatedSettlementsResponse>(
      `/groups/${groupId}/settlements?page=${page}&size=${size}`
    ),

  confirmSettlement: (groupId: string, settlementId: string) =>
    api.post<SettlementItem>(
      `/groups/${groupId}/settlements/${settlementId}/confirm`
    ),

  rejectSettlement: (groupId: string, settlementId: string) =>
    api.post<{ success: boolean; message: string }>(
      `/groups/${groupId}/settlements/${settlementId}/reject`
    ),
};

export default splitwiseApi;
