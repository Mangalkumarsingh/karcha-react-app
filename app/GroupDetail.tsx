import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import {
  useDeleteGroup,
  useGroupBalances,
  useGroupDetails,
  useGroupExpenses,
  useGroupMembers,
  useInviteMember,
  useRemoveMember,
} from '@/src/hooks/useSplitwise';
import { GroupMember, SharedExpense, SuggestedTransfer } from '@/src/types/splitwise';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members'>('expenses');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');

  // Queries
  const { data: group, isLoading: groupLoading, refetch: refetchGroup } = useGroupDetails(id);
  const {
    data: expensesData,
    isLoading: expensesLoading,
    refetch: refetchExpenses,
    isRefetching: isExpensesRefetching,
  } = useGroupExpenses(id);
  const {
    data: balancesData,
    isLoading: balancesLoading,
    refetch: refetchBalances,
  } = useGroupBalances(id);
  const {
    data: membersData,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useGroupMembers(id);

  // Mutations
  const inviteMemberMutation = useInviteMember(id || '');
  const removeMemberMutation = useRemoveMember(id || '');
  const deleteGroupMutation = useDeleteGroup();

  const expenses = expensesData?.content || [];
  const members = membersData || group?.members || [];
  const suggestedTransfers = balancesData?.suggestedTransfers || [];
  const memberBalances = balancesData?.memberBalances || [];

  const handleInvite = async () => {
    const cleanPhone = invitePhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    const fullPhone = `+91${cleanPhone.slice(-10)}`;

    try {
      await inviteMemberMutation.mutateAsync(fullPhone);
      setInvitePhone('');
      setInviteModalVisible(false);
      Alert.alert('Invitation Sent', `Invitation has been sent to ${fullPhone}`);
    } catch (err: any) {
      Alert.alert(
        'Invite Notice',
        err.response?.data?.message || err.message || 'Invitation sent successfully.'
      );
      setInviteModalVisible(false);
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Archive Group',
      'Are you sure you want to delete or archive this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id) {
                await deleteGroupMutation.mutateAsync(id);
                router.back();
              }
            } catch (err: any) {
              Alert.alert('Notice', err.response?.data?.message || 'Group archived.');
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleLeaveOrRemoveMember = (member: GroupMember) => {
    const isSelf = member.userId === user?.id;
    const title = isSelf ? 'Leave Group' : 'Remove Member';
    const message = isSelf
      ? 'Are you sure you want to leave this group?'
      : `Remove ${member.name} from the group?`;

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isSelf ? 'Leave' : 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMemberMutation.mutateAsync(member.userId);
            if (isSelf) {
              router.back();
            } else {
              Alert.alert('Success', 'Member removed successfully.');
            }
          } catch (err: any) {
            Alert.alert(
              'Notice',
              err.response?.data?.message || 'Unsettled balance must be cleared before leaving.'
            );
          }
        },
      },
    ]);
  };

  const renderExpenseItem = ({ item }: { item: SharedExpense }) => (
    <TouchableOpacity
      style={styles.expenseCard}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/ExpenseDetail',
          params: { id: item.id, groupId: id },
        })
      }
    >
      <View style={styles.expenseIconBadge}>
        <Ionicons name="receipt-outline" size={20} color={Color.primary} />
      </View>

      <View style={styles.expenseInfo}>
        <Text style={styles.expenseTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.expenseSub}>
          {item.paidBy?.name || 'Someone'} paid • {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.expenseRight}>
        <Text style={styles.expenseTotal}>₹{item.amount.toFixed(2)}</Text>
        <Text style={styles.expenseSplits}>
          {item.participantCount || 1} people
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Color.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {group?.name || 'Group Details'}
          </Text>
          <Text style={styles.headerDesc} numberOfLines={1}>
            {group?.description || `${members.length} members`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconCircle}
          onPress={handleDeleteGroup}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={Color.text} />
        </TouchableOpacity>
      </View>

      {/* Group Net Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Expenses</Text>
          <Text style={styles.statValue}>₹{group?.totalExpenses || 0}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Your Net Balance</Text>
          <Text
            style={[
              styles.statValue,
              (group?.currentUserNetBalance || 0) > 0
                ? { color: Color.positive }
                : (group?.currentUserNetBalance || 0) < 0
                ? { color: Color.negative }
                : { color: Color.settled },
            ]}
          >
            {(group?.currentUserNetBalance || 0) > 0 ? '+' : ''}₹
            {(group?.currentUserNetBalance || 0).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'expenses' && styles.tabItemActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text
            style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}
          >
            Expenses ({expenses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'balances' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('balances');
            refetchBalances();
          }}
        >
          <Text
            style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}
          >
            Balances & Debt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'members' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('members');
            refetchMembers();
          }}
        >
          <Text
            style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}
          >
            Members ({members.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Expenses */}
      {activeTab === 'expenses' && (
        <View style={{ flex: 1 }}>
          {expensesLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={Color.primary} />
            </View>
          ) : expenses.length === 0 ? (
            <View style={styles.emptyTab}>
              <Ionicons name="receipt-outline" size={48} color={Color.textMuted} />
              <Text style={styles.emptyTabText}>No expenses added yet</Text>
              <Text style={styles.emptyTabSub}>
                Add shared expenses like food, fuel, or rent to track who paid.
              </Text>
            </View>
          ) : (
            <FlatList
              data={expenses}
              keyExtractor={(item) => item.id}
              renderItem={renderExpenseItem}
              contentContainerStyle={styles.listPadding}
              refreshControl={
                <RefreshControl
                  refreshing={isExpensesRefetching}
                  onRefresh={() => {
                    refetchGroup();
                    refetchExpenses();
                  }}
                  tintColor={Color.primary}
                />
              }
            />
          )}
        </View>
      )}

      {/* Tab 2: Balances & Debt Simplification */}
      {activeTab === 'balances' && (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          {balancesLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={Color.primary} />
            </View>
          ) : (
            <FlatList
              data={suggestedTransfers}
              keyExtractor={(item, index) => `${item.fromUserId}-${item.toUserId}-${index}`}
              ListHeaderComponent={
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.sectionHeader}>Member Balances</Text>
                  {memberBalances.map((mb) => (
                    <View key={mb.userId} style={styles.memberBalanceRow}>
                      <View>
                        <Text style={styles.mbName}>{mb.name}</Text>
                        <Text style={styles.mbSub}>
                          Paid: ₹{mb.totalPaid} • Share: ₹{mb.totalShare}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.mbNet,
                          mb.netBalance > 0
                            ? { color: Color.positive }
                            : mb.netBalance < 0
                            ? { color: Color.negative }
                            : { color: Color.settled },
                        ]}
                      >
                        {mb.netBalance > 0
                          ? `gets ₹${mb.netBalance.toFixed(2)}`
                          : mb.netBalance < 0
                          ? `owes ₹${Math.abs(mb.netBalance).toFixed(2)}`
                          : 'settled'}
                      </Text>
                    </View>
                  ))}

                  <Text style={[styles.sectionHeader, { marginTop: 20 }]}>
                    Who Owes Whom (Suggested Transfers)
                  </Text>
                  {suggestedTransfers.length === 0 && (
                    <Text style={styles.emptySubtle}>
                      Everyone in this group is fully settled up! 🎉
                    </Text>
                  )}
                </View>
              }
              renderItem={({ item }: { item: SuggestedTransfer }) => (
                <View style={styles.transferCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.transferText}>
                      <Text style={{ fontWeight: '700' }}>{item.fromUserName}</Text> owes{' '}
                      <Text style={{ fontWeight: '700' }}>{item.toUserName}</Text>
                    </Text>
                    <Text style={styles.transferAmount}>₹{item.amount.toFixed(2)}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.settleButton}
                    onPress={() =>
                      router.push({
                        pathname: '/SettleUp' as any,
                        params: {
                          groupId: id,
                          fromUserId: item.fromUserId,
                          fromUserName: item.fromUserName,
                          toUserId: item.toUserId,
                          toUserName: item.toUserName,
                          amount: item.amount.toString(),
                        },
                      })
                    }
                  >
                    <Text style={styles.settleButtonText}>Settle Up</Text>
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 90 }}
            />
          )}
        </View>
      )}

      {/* Tab 3: Members */}
      {activeTab === 'members' && (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <View style={styles.membersTopAction}>
            <Text style={styles.sectionHeader}>Group Members ({members.length})</Text>
            <TouchableOpacity
              style={styles.inviteMemberBtn}
              onPress={() => setInviteModalVisible(true)}
            >
              <Ionicons name="person-add" size={16} color={Color.white} />
              <Text style={styles.inviteMemberBtnText}>Invite</Text>
            </TouchableOpacity>
          </View>

          {membersLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={Color.primary} />
            </View>
          ) : (
            <FlatList
              data={members}
              keyExtractor={(item) => item.id || item.userId}
              renderItem={({ item }) => (
                <View style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Ionicons name="person" size={20} color={Color.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {item.name} {item.userId === user?.id ? '(You)' : ''}
                    </Text>
                    <Text style={styles.memberRole}>
                      {item.role || 'Member'} • {item.phoneNumber || 'Joined'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleLeaveOrRemoveMember(item)}
                    style={styles.memberActionBtn}
                  >
                    <Ionicons
                      name={item.userId === user?.id ? 'log-out-outline' : 'trash-outline'}
                      size={18}
                      color={Color.negative}
                    />
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 90 }}
            />
          )}
        </View>
      )}

      {/* Floating Add Expense Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: '/AddExpense',
            params: { groupId: id },
          })
        }
      >
        <Ionicons name="receipt" size={22} color={Color.white} />
        <Text style={styles.fabText}>Add Expense</Text>
      </TouchableOpacity>

      {/* Invite Member Modal */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite to {group?.name}</Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <Ionicons name="close" size={24} color={Color.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Friend's Mobile Number</Text>
            <View style={styles.modalPhoneRow}>
              <Text style={styles.modalPhoneCode}>+91</Text>
              <TextInput
                style={styles.modalPhoneInput}
                placeholder="98765 43210"
                placeholderTextColor={Color.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={invitePhone}
                onChangeText={setInvitePhone}
              />
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleInvite}
              disabled={inviteMemberMutation.isPending}
            >
              {inviteMemberMutation.isPending ? (
                <ActivityIndicator color={Color.white} />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Send Invitation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Color.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Color.border,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Color.text,
  },
  headerDesc: {
    fontSize: 12,
    color: Color.textSecondary,
    marginTop: 2,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: Color.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Color.borderLight,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Color.border,
  },
  statLabel: {
    fontSize: 12,
    color: Color.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Color.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Color.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Color.border,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Color.primary,
  },
  tabText: {
    fontSize: 13,
    color: Color.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Color.primary,
    fontWeight: '700',
  },
  listPadding: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  expenseIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Color.text,
  },
  expenseSub: {
    fontSize: 12,
    color: Color.textSecondary,
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: Color.text,
  },
  expenseSplits: {
    fontSize: 11,
    color: Color.textMuted,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyTabText: {
    fontSize: 16,
    fontWeight: '700',
    color: Color.text,
    marginTop: 12,
  },
  emptyTabSub: {
    fontSize: 13,
    color: Color.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  memberBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Color.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  mbName: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.text,
  },
  mbSub: {
    fontSize: 11,
    color: Color.textSecondary,
    marginTop: 2,
  },
  mbNet: {
    fontSize: 14,
    fontWeight: '700',
  },
  transferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.white,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  transferText: {
    fontSize: 14,
    color: Color.text,
  },
  transferAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Color.primary,
    marginTop: 2,
  },
  settleButton: {
    backgroundColor: Color.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  settleButtonText: {
    color: Color.white,
    fontSize: 13,
    fontWeight: '700',
  },
  emptySubtle: {
    fontSize: 13,
    color: Color.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  membersTopAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  inviteMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Color.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteMemberBtnText: {
    color: Color.white,
    fontSize: 13,
    fontWeight: '700',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.text,
  },
  memberRole: {
    fontSize: 11,
    color: Color.textSecondary,
    marginTop: 2,
  },
  memberActionBtn: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: {
    color: Color.white,
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Color.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Color.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Color.text,
    marginBottom: 8,
  },
  modalPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Color.border,
    borderRadius: 12,
    backgroundColor: Color.background,
    marginBottom: 20,
  },
  modalPhoneCode: {
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
    color: Color.text,
  },
  modalPhoneInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 15,
    color: Color.text,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: Color.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: Color.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
