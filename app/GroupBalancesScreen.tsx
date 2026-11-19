import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import { useGroupBalances, useGroupDetails } from '@/src/hooks/useSplitwise';
import { MemberBalance, SuggestedTransfer } from '@/src/types/splitwise';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
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

export default function GroupBalancesScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  const currentUserId = user?.id || 'usr_me';

  const { data: group, isLoading: groupLoading, refetch: refetchGroup } = useGroupDetails(groupId);
  const {
    data: balancesData,
    isLoading: balancesLoading,
    refetch: refetchBalances,
    isRefetching,
  } = useGroupBalances(groupId);

  const suggestedTransfers = balancesData?.suggestedTransfers || [];
  const memberBalances = balancesData?.memberBalances || [];

  // Summary calculations for the current user within this group
  const { userOwedTotal, userOwingTotal, userNetBalance } = useMemo(() => {
    let owed = 0;
    let owing = 0;

    suggestedTransfers.forEach((t) => {
      const isToMe = t.toUserId === currentUserId || (currentUserId === 'usr_me' && t.toUserId?.includes('me'));
      const isFromMe = t.fromUserId === currentUserId || (currentUserId === 'usr_me' && t.fromUserId?.includes('me'));

      if (isToMe) {
        owed += t.amount;
      }
      if (isFromMe) {
        owing += t.amount;
      }
    });

    // Check memberBalances for exact net position of current user if available
    const myMemberBalance = memberBalances.find(
      (mb) => mb.userId === currentUserId || (currentUserId === 'usr_me' && mb.userId?.includes('me'))
    );

    let net = owed - owing;
    if (myMemberBalance && typeof myMemberBalance.netBalance === 'number') {
      net = myMemberBalance.netBalance;
    } else if (typeof group?.myNetBalance === 'number') {
      net = group.myNetBalance;
    } else if (typeof group?.currentUserNetBalance === 'number') {
      net = group.currentUserNetBalance;
    }

    return {
      userOwedTotal: owed,
      userOwingTotal: owing,
      userNetBalance: net,
    };
  }, [suggestedTransfers, memberBalances, group, currentUserId]);

  const onRefresh = () => {
    refetchGroup();
    refetchBalances();
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderTransferItem = ({ item }: { item: SuggestedTransfer }) => {
    const isToMe = item.toUserId === currentUserId || (currentUserId === 'usr_me' && item.toUserId?.includes('me'));
    const isFromMe = item.fromUserId === currentUserId || (currentUserId === 'usr_me' && item.fromUserId?.includes('me'));

    let primaryName = '';
    let relationText = '';
    let isPositive = false;
    let isNegative = false;

    if (isToMe) {
      primaryName = item.fromUserName || 'Member';
      relationText = 'owes you';
      isPositive = true;
    } else if (isFromMe) {
      primaryName = item.toUserName || 'Member';
      relationText = 'you owe';
      isNegative = true;
    } else {
      primaryName = item.fromUserName;
      relationText = `owes ${item.toUserName}`;
    }

    return (
      <View style={styles.transferRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials(primaryName)}</Text>
        </View>

        <View style={styles.transferInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {primaryName}
          </Text>
          <Text
            style={[
              styles.relationLabel,
              isPositive && { color: Color.positive },
              isNegative && { color: Color.negative },
            ]}
          >
            {relationText}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amountText,
              isPositive && { color: Color.positive },
              isNegative && { color: Color.negative },
            ]}
          >
            {isPositive ? '+' : isNegative ? '-' : ''}₹{item.amount.toFixed(2)}
          </Text>

          {(isToMe || isFromMe) && (
            <TouchableOpacity
              style={styles.settlePill}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/SettleUp' as any,
                  params: {
                    groupId,
                    fromUserId: item.fromUserId,
                    fromUserName: item.fromUserName,
                    toUserId: item.toUserId,
                    toUserName: item.toUserName,
                    amount: item.amount.toString(),
                  },
                })
              }
            >
              <Text style={styles.settlePillText}>Settle Up</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderMemberNetPosition = (mb: MemberBalance) => {
    const isMe = mb.userId === currentUserId || (currentUserId === 'usr_me' && mb.userId?.includes('me'));
    const isOwed = mb.netBalance > 0.01;
    const isOwing = mb.netBalance < -0.01;

    return (
      <View key={mb.userId} style={styles.memberNetRow}>
        <View style={styles.smallAvatar}>
          <Text style={styles.smallAvatarText}>{getInitials(mb.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mbName}>
            {mb.name} {isMe ? '(You)' : ''}
          </Text>
          <Text style={styles.mbSub}>
            Paid: ₹{mb.totalPaid.toFixed(2)} • Share: ₹{mb.totalShare.toFixed(2)}
          </Text>
        </View>
        <Text
          style={[
            styles.mbNetText,
            isOwed && { color: Color.positive },
            isOwing && { color: Color.negative },
            !isOwed && !isOwing && { color: Color.settled },
          ]}
        >
          {isOwed
            ? `+₹${mb.netBalance.toFixed(2)}`
            : isOwing
            ? `-₹${Math.abs(mb.netBalance).toFixed(2)}`
            : 'Settled up'}
        </Text>
      </View>
    );
  };

  const isLoading = groupLoading || balancesLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Color.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Group Balances</Text>
          {group?.name && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {group.name}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Color.primary} />
          <Text style={styles.loadingText}>Loading balances...</Text>
        </View>
      ) : (
        <FlatList
          data={suggestedTransfers}
          keyExtractor={(item, index) => `${item.fromUserId}-${item.toUserId}-${index}`}
          renderItem={renderTransferItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={Color.primary}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Logged-in User Balance Summary Card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Your Group Standing</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.colLabel}>You'll Receive</Text>
                    <Text style={[styles.colValue, { color: Color.positive }]}>
                      ₹{userOwedTotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryCol}>
                    <Text style={styles.colLabel}>You'll Pay</Text>
                    <Text style={[styles.colValue, { color: Color.negative }]}>
                      ₹{userOwingTotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryCol}>
                    <Text style={styles.colLabel}>Net Balance</Text>
                    <Text
                      style={[
                        styles.colValue,
                        userNetBalance > 0.01
                          ? { color: Color.positive }
                          : userNetBalance < -0.01
                          ? { color: Color.negative }
                          : { color: Color.settled },
                      ]}
                    >
                      {userNetBalance > 0.01
                        ? `+₹${userNetBalance.toFixed(2)}`
                        : userNetBalance < -0.01
                        ? `-₹${Math.abs(userNetBalance).toFixed(2)}`
                        : '₹0.00'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Suggested Transfers / Who Owes Whom Header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Suggested Settlements</Text>
                <Text style={styles.sectionSub}>Who owes whom</Text>
              </View>

              {suggestedTransfers.length === 0 && (
                <View style={styles.settledCard}>
                  <Ionicons name="checkmark-circle" size={40} color={Color.positive} />
                  <Text style={styles.settledTitle}>All settled up!</Text>
                  <Text style={styles.settledDesc}>
                    There are no outstanding debts or transfers remaining in this group.
                  </Text>
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            memberBalances.length > 0 ? (
              <View style={styles.memberPositionsSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Total Member Balances</Text>
                  <Text style={styles.sectionSub}>Individual net positions</Text>
                </View>
                <View style={styles.memberPositionsCard}>
                  {memberBalances.map(renderMemberNetPosition)}
                </View>
              </View>
            ) : null
          }
        />
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Color.white,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Color.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Color.textSecondary,
    marginTop: 2,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Color.borderLight,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Color.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: Color.border,
  },
  colLabel: {
    fontSize: 11,
    color: Color.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  colValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Color.text,
  },
  sectionSub: {
    fontSize: 12,
    color: Color.textSecondary,
    marginTop: 2,
  },
  settledCard: {
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Color.borderLight,
    marginVertical: 8,
  },
  settledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Color.text,
    marginTop: 8,
  },
  settledDesc: {
    fontSize: 13,
    color: Color.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Color.primary,
  },
  transferInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: Color.text,
  },
  relationLabel: {
    fontSize: 12,
    color: Color.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: Color.text,
  },
  settlePill: {
    backgroundColor: Color.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  settlePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Color.primary,
  },
  memberPositionsSection: {
    marginTop: 16,
  },
  memberPositionsCard: {
    backgroundColor: Color.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  memberNetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  smallAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: Color.primary,
  },
  mbName: {
    fontSize: 14,
    fontWeight: '600',
    color: Color.text,
  },
  mbSub: {
    fontSize: 11,
    color: Color.textSecondary,
    marginTop: 1,
  },
  mbNetText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
