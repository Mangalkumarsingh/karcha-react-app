import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import {
  useGroupBalances,
  useGroupDetails,
  useGroupMembers,
  useInfiniteGroupExpenses,
} from '@/src/hooks/useSplitwise';
import { SharedExpense } from '@/src/types/splitwise';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id || 'usr_me';

  // 1. Queries
  const {
    data: group,
    isLoading: groupLoading,
    refetch: refetchGroup,
  } = useGroupDetails(id);

  const {
    data: balancesData,
    isLoading: balancesLoading,
    refetch: refetchBalances,
  } = useGroupBalances(id);

  const {
    data: membersData,
    refetch: refetchMembers,
  } = useGroupMembers(id);

  const {
    data: expensesData,
    isLoading: expensesLoading,
    isRefetching: isExpensesRefetching,
    refetch: refetchExpenses,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteGroupExpenses(id, 20);

  // Flatten all paginated expense pages
  const allExpenses: SharedExpense[] = useMemo(() => {
    if (!expensesData?.pages) return [];
    return expensesData.pages.flatMap((page) => page.content || []);
  }, [expensesData]);

  const members = membersData || group?.members || [];
  const suggestedTransfers = balancesData?.suggestedTransfers || [];
  const memberBalances = balancesData?.memberBalances || [];

  // 2. Net Overall Balance calculation strictly for current logged in user in this group
  const overallNetBalance = useMemo(() => {
    // Priority A: Check memberBalances for exact user position
    const myBalanceEntry = memberBalances.find(
      (m) => m.userId === currentUserId || (currentUserId === 'usr_me' && m.userId?.includes('me'))
    );
    if (myBalanceEntry && typeof myBalanceEntry.netBalance === 'number') {
      return myBalanceEntry.netBalance;
    }

    // Priority B: Check backend group metadata (`myNetBalance` or `currentUserNetBalance`)
    if (typeof group?.myNetBalance === 'number') return group.myNetBalance;
    if (typeof group?.currentUserNetBalance === 'number') return group.currentUserNetBalance;

    // Priority C: Calculate from suggested transfers involving current user
    let net = 0;
    suggestedTransfers.forEach((t) => {
      const isToMe = t.toUserId === currentUserId || (currentUserId === 'usr_me' && t.toUserId?.includes('me'));
      const isFromMe = t.fromUserId === currentUserId || (currentUserId === 'usr_me' && t.fromUserId?.includes('me'));
      if (isToMe) net += t.amount;
      if (isFromMe) net -= t.amount;
    });
    return net;
  }, [memberBalances, group, suggestedTransfers, currentUserId]);

  // 3. User-to-User Balances (Filter only transfers where current user is involved)
  const myRelevantTransfers = useMemo(() => {
    return suggestedTransfers.filter((t) => {
      const isToMe = t.toUserId === currentUserId || (currentUserId === 'usr_me' && t.toUserId?.includes('me'));
      const isFromMe = t.fromUserId === currentUserId || (currentUserId === 'usr_me' && t.fromUserId?.includes('me'));
      return isToMe || isFromMe;
    });
  }, [suggestedTransfers, currentUserId]);

  // First 2 relevant transfers for default preview
  const previewTransfers = useMemo(() => {
    return myRelevantTransfers.slice(0, 2);
  }, [myRelevantTransfers]);

  // Pull to refresh handler
  const handleRefresh = useCallback(() => {
    refetchGroup();
    refetchBalances();
    refetchMembers();
    refetchExpenses();
  }, [refetchGroup, refetchBalances, refetchMembers, refetchExpenses]);

  // Safe back navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/Home' as any);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Render individual expense row
  const renderExpenseRow = useCallback(
    ({ item }: { item: SharedExpense }) => {
      const isMePayer =
        item.paidBy?.id === currentUserId ||
        (item as any).paidByUserId === currentUserId ||
        (currentUserId === 'usr_me' && item.paidBy?.id?.includes('me'));

      const payerName = isMePayer ? 'You' : item.paidBy?.name || 'Someone';

      // Find user's exact share
      let userShare = 0;
      if (item.splits && item.splits.length > 0) {
        const mySplit = item.splits.find(
          (s) => s.userId === currentUserId || (currentUserId === 'usr_me' && s.userId?.includes('me'))
        );
        if (mySplit) {
          userShare = mySplit.shareAmount;
        } else if (isMePayer) {
          userShare = 0;
        }
      } else {
        const count = item.participantCount || 1;
        userShare = item.amount / count;
      }

      const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      return (
        <TouchableOpacity
          style={styles.expenseRow}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/ExpenseDetail' as any,
              params: { id: item.id, groupId: id },
            })
          }
        >
          {/* Calendar / Date Tile */}
          <View style={styles.dateTile}>
            <Ionicons name="receipt-outline" size={20} color={Color.primary} />
          </View>

          {/* Expense Title & Payer Details */}
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.expenseSub} numberOfLines={1}>
              {payerName} paid ₹{item.amount.toFixed(2)} • {formattedDate}
            </Text>
          </View>

          {/* User's Share Breakdown */}
          <View style={styles.expenseRight}>
            <Text style={styles.expenseShareLabel}>Your share</Text>
            <Text
              style={[
                styles.expenseShareAmount,
                userShare > 0 ? { color: Color.text } : { color: Color.textMuted },
              ]}
            >
              ₹{userShare.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [currentUserId, id, router]
  );

  // Render header component of the single FlatList
  const renderListHeader = () => {
    const isPositive = overallNetBalance > 0.01;
    const isNegative = overallNetBalance < -0.01;

    const memberCount = group?.memberCount || members.length || 1;

    return (
      <View style={styles.headerContentContainer}>
        {/* Section 1: Group Information */}
        <View style={styles.groupInfoBox}>
          <Text style={styles.groupNameText} numberOfLines={2}>
            {group?.name || 'Group Details'}
          </Text>
          <Text style={styles.memberCountText}>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>

        {/* Section 2: Overall Group Balance */}
        <View style={styles.balanceStatusBox}>
          {balancesLoading || groupLoading ? (
            <ActivityIndicator size="small" color={Color.primary} />
          ) : isPositive ? (
            <View style={styles.balanceBadgePositive}>
              <Ionicons name="arrow-down-circle" size={18} color={Color.positive} />
              <Text style={styles.balanceTextPositive}>
                You are owed ₹{overallNetBalance.toFixed(2)}
              </Text>
            </View>
          ) : isNegative ? (
            <View style={styles.balanceBadgeNegative}>
              <Ionicons name="arrow-up-circle" size={18} color={Color.negative} />
              <Text style={styles.balanceTextNegative}>
                You owe ₹{Math.abs(overallNetBalance).toFixed(2)}
              </Text>
            </View>
          ) : (
            <View style={styles.balanceBadgeSettled}>
              <Ionicons name="checkmark-circle-outline" size={18} color={Color.settled} /> 
              <Text style={styles.balanceTextSettled}>You are all settled up</Text>
            </View>
          )}
        </View>

        {/* Section 3: Group Members Balance Preview */}
        <View style={styles.balancesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Balances</Text>
          </View>

          {previewTransfers.length === 0 ? (
            <View style={styles.settledPreviewCard}>
              <Ionicons name="checkmark-done" size={24} color={Color.positive} />
              <Text style={styles.settledPreviewText}>
                No outstanding balances for you in this group.
              </Text>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              {previewTransfers.map((item, index) => {
                const isToMe =
                  item.toUserId === currentUserId ||
                  (currentUserId === 'usr_me' && item.toUserId?.includes('me'));
                const isFromMe =
                  item.fromUserId === currentUserId ||
                  (currentUserId === 'usr_me' && item.fromUserId?.includes('me'));

                let displayName = '';
                let relationLabel = '';
                let isGreen = false;
                let isRed = false;

                if (isToMe) {
                  displayName = item.fromUserName || 'Member';
                  relationLabel = 'Owes you';
                  isGreen = true;
                } else if (isFromMe) {
                  displayName = item.toUserName || 'Member';
                  relationLabel = 'You owe';
                  isRed = true;
                } else {
                  displayName = item.fromUserName;
                  relationLabel = `Owes ${item.toUserName}`;
                }

                return (
                  <View key={`${item.fromUserId}-${item.toUserId}-${index}`} style={styles.previewRow}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {getInitials(displayName)}
                      </Text>
                    </View>

                    <View style={styles.previewMemberInfo}>
                      <Text style={styles.previewMemberName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text
                        style={[
                          styles.previewRelationText,
                          isGreen && { color: Color.positive },
                          isRed && { color: Color.negative },
                        ]}
                      >
                        {relationLabel}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.previewAmount,
                        isGreen && { color: Color.positive },
                        isRed && { color: Color.negative },
                      ]}
                    >
                      {isGreen ? '+' : isRed ? '-' : ''}₹{item.amount.toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* View All Balances Option */}
          <TouchableOpacity
            style={styles.viewAllBtn}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: '/GroupBalancesScreen' as any,
                params: { groupId: id },
              })
            }
          >
            <Text style={styles.viewAllText}>View all balances</Text>
            <Ionicons name="arrow-forward" size={16} color={Color.primary} />
          </TouchableOpacity>
        </View>

        {/* Section 4: Expenses Header */}
        <View style={styles.expensesHeaderRow}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          <Text style={styles.expensesCountText}>
            {allExpenses.length} {allExpenses.length === 1 ? 'expense' : 'expenses'}
          </Text>
        </View>
      </View>
    );
  };

  const renderListEmpty = () => {
    if (expensesLoading) {
      return (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Color.primary} />
          <Text style={styles.emptySubtitle}>Loading group expenses...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="receipt-outline" size={40} color={Color.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No expenses yet</Text>
        <Text style={styles.emptySubtitle}>
          Add expenses below to split costs with group members.
        </Text>
      </View>
    );
  };

  const renderListFooter = () => {
    if (!isFetchingNextPage) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.paginationFooter}>
        <ActivityIndicator size="small" color={Color.primary} />
        <Text style={styles.paginationText}>Loading more expenses...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header: ONLY Back Arrow at Top-Left */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Color.text} />
        </TouchableOpacity>
      </View>

      {/* Main Single Scrollable FlatList */}
      <FlatList
        data={allExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseRow}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isExpensesRefetching}
            onRefresh={handleRefresh}
            tintColor={Color.primary}
          />
        }
      />

      {/* Floating Action Button (Add Expense) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: '/AddExpense' as any,
            params: { groupId: id },
          })
        }
      >
        <Ionicons name="receipt" size={20} color={Color.white} />
        <Text style={styles.fabText}>Add Expense</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Color.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerContentContainer: {
    paddingBottom: 8,
  },
  groupInfoBox: {
    marginTop: 4,
    marginBottom: 12,
  },
  groupNameText: {
    fontSize: 26,
    fontWeight: '800',
    color: Color.text,
    letterSpacing: -0.5,
  },
  memberCountText: {
    fontSize: 14,
    color: Color.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  balanceStatusBox: {
    marginBottom: 20,
  },
  balanceBadgePositive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: Color.positiveBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  balanceTextPositive: {
    fontSize: 15,
    fontWeight: '700',
    color: Color.positive,
  },
  balanceBadgeNegative: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: Color.negativeBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  balanceTextNegative: {
    fontSize: 15,
    fontWeight: '700',
    color: Color.negative,
  },
  balanceBadgeSettled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: Color.settledBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  balanceTextSettled: {
    fontSize: 15,
    fontWeight: '600',
    color: Color.settled,
  },
  balancesSection: {
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Color.borderLight,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Color.text,
  },
  previewContainer: {
    gap: 12,
    marginBottom: 14,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: Color.primary,
  },
  previewMemberInfo: {
    flex: 1,
  },
  previewMemberName: {
    fontSize: 15,
    fontWeight: '700',
    color: Color.text,
  },
  previewRelationText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  previewAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  settledPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  settledPreviewText: {
    flex: 1,
    fontSize: 13,
    color: Color.textSecondary,
    fontWeight: '500',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.primary,
  },
  expensesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  expensesCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Color.textSecondary,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.white,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Color.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dateTile: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Color.text,
    marginBottom: 3,
  },
  expenseSub: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseShareLabel: {
    fontSize: 10,
    color: Color.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  expenseShareAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Color.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  paginationFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  paginationText: {
    fontSize: 12,
    color: Color.textSecondary,
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
    paddingVertical: 13,
    borderRadius: 30,
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: Color.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
