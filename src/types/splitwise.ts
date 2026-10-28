// TypeScript definitions for Splitwise / Expense Tracking API

export interface AuthRequestOtpPayload {
  phoneNumber: string;
}

export interface AuthRequestOtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface AuthVerifyOtpPayload {
  phoneNumber: string;
  otp: string;
}

export interface AuthVerifyOtpResponse {
  id: string;
  phoneNumber: string;
  email: string | null;
  loginType: string;
  newUser: boolean;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  message: string;
}

export interface GoogleLoginPayload {
  googleToken: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string | null;
  profileImageUrl?: string | null;
  createdAt?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  profileImageUrl?: string;
}

export interface UserInvitation {
  id: string;
  groupId: string;
  groupName: string;
  invitedPhoneNumber: string;
  invitedBy: {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  expiresAt: string;
}

export interface GroupMember {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  phoneNumber?: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'INVITED';
  joinedAt: string;
}

export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  currency: string;
  memberCount: number;
  totalExpenses: number;
  currentUserNetBalance: number;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
  };
  members?: GroupMember[];
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  currency?: string;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
}

export interface ExpenseSplit {
  userId: string;
  userName: string;
  shareAmount: number;
}

export interface SharedExpense {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  paidBy: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
  };
  participantCount: number;
  splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE';
  createdAt: string;
  splits?: ExpenseSplit[];
}

export interface CreateExpensePayload {
  title: string;
  description?: string;
  amount: number;
  paidByUserId: string;
  splitType: 'EQUAL' | 'EXACT' | 'PERCENTAGE';
  participantIds: string[];
}

export interface PaginatedExpensesResponse {
  content: SharedExpense[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface MemberBalance {
  userId: string;
  name: string;
  totalPaid: number;
  totalShare: number;
  settlementsSent: number;
  settlementsReceived: number;
  netBalance: number;
}

export interface SuggestedTransfer {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

export interface GroupBalancesResponse {
  groupId: string;
  currency: string;
  totalExpenses: number;
  memberBalances: MemberBalance[];
  suggestedTransfers: SuggestedTransfer[];
}

export interface SettlementRecordPayload {
  fromUserId: string;
  toUserId: string;
  amount: number;
  paymentMethod?: 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';
  note?: string;
  idempotencyKey?: string;
}

export interface SettlementItem {
  id: string;
  groupId: string;
  fromUser: {
    id: string;
    name: string;
  };
  toUser: {
    id: string;
    name: string;
  };
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  note?: string;
  createdAt: string;
  confirmedAt?: string | null;
}

export interface PaginatedSettlementsResponse {
  content: SettlementItem[];
  totalElements: number;
  totalPages: number;
  number: number;
}
