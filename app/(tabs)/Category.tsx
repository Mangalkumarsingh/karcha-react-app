import { Color } from '@/src/constants/color';
import { useMyGroups } from '@/src/hooks/useSplitwise';
import { GroupItem } from '@/src/types/splitwise';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BalancesTabScreen() {
  const router = useRouter();
  const { data: groups = [], isLoading, refetch, isRefetching } = useMyGroups();

  const { owedGroups, owingGroups, settledGroups } = useMemo(() => {
    const owed = groups.filter((g: GroupItem) => (g.currentUserNetBalance || 0) > 0);
    const owing = groups.filter((g: GroupItem) => (g.currentUserNetBalance || 0) < 0);
    const settled = groups.filter((g: GroupItem) => (g.currentUserNetBalance || 0) === 0);
    return { owedGroups: owed, owingGroups: owing, settledGroups: settled };
  }, [groups]);

  const totalOwed = useMemo(
    () =>
      owedGroups.reduce(
        (sum: number, g: GroupItem) => sum + (g.currentUserNetBalance || 0),
        0
      ),
    [owedGroups]
  );

  const totalOwing = useMemo(
    () =>
      owingGroups.reduce(
        (sum: number, g: GroupItem) => sum + Math.abs(g.currentUserNetBalance || 0),
        0
      ),
    [owingGroups]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Balances</Text>
      </View>

      {/* Summary 2-column cards */}
      <View style={styles.statRow}>
        <View style={[styles.statCard, { borderLeftColor: Color.positive }]}>
          <Text style={styles.statLabel}>You are owed</Text>
          <Text style={[styles.statAmount, { color: Color.positive }]}>
            ₹{totalOwed.toFixed(2)}
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: Color.negative }]}>
          <Text style={styles.statLabel}>You owe</Text>
          <Text style={[styles.statAmount, { color: Color.negative }]}>
            ₹{totalOwing.toFixed(2)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Color.primary}
          />
        }
      >
        {/* Owed section */}
        {owedGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>You are owed money from</Text>
            {owedGroups.map((g: GroupItem) => (
              <TouchableOpacity
                key={g.id}
                style={styles.balanceItem}
                onPress={() =>
                  router.push({
                    pathname: '/GroupDetail' as any,
                    params: { id: g.id },
                  })
                }
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.badgeIcon, { backgroundColor: Color.positiveBg }]}>
                    <Ionicons name="arrow-down" size={18} color={Color.positive} />
                  </View>
                  <View>
                    <Text style={styles.itemTitle}>{g.name}</Text>
                    <Text style={styles.itemSub}>{g.memberCount} members</Text>
                  </View>
                </View>
                <Text style={[styles.itemAmount, { color: Color.positive }]}>
                  +₹{(g.currentUserNetBalance || 0).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Owing section */}
        {owingGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>You owe money in</Text>
            {owingGroups.map((g: GroupItem) => (
              <TouchableOpacity
                key={g.id}
                style={styles.balanceItem}
                onPress={() =>
                  router.push({
                    pathname: '/GroupDetail' as any,
                    params: { id: g.id },
                  })
                }
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.badgeIcon, { backgroundColor: Color.negativeBg }]}>
                    <Ionicons name="arrow-up" size={18} color={Color.negative} />
                  </View>
                  <View>
                    <Text style={styles.itemTitle}>{g.name}</Text>
                    <Text style={styles.itemSub}>{g.memberCount} members</Text>
                  </View>
                </View>
                <Text style={[styles.itemAmount, { color: Color.negative }]}>
                  -₹{Math.abs(g.currentUserNetBalance || 0).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Settled section */}
        {settledGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Settled Up</Text>
            {settledGroups.map((g: GroupItem) => (
              <TouchableOpacity
                key={g.id}
                style={styles.balanceItem}
                onPress={() =>
                  router.push({
                    pathname: '/GroupDetail' as any,
                    params: { id: g.id },
                  })
                }
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.badgeIcon, { backgroundColor: Color.settledBg }]}>
                    <Ionicons name="checkmark" size={18} color={Color.settled} />
                  </View>
                  <View>
                    <Text style={styles.itemTitle}>{g.name}</Text>
                    <Text style={styles.itemSub}>{g.memberCount} members</Text>
                  </View>
                </View>
                <Text style={[styles.itemAmount, { color: Color.settled }]}>
                  ₹0.00
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {groups.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={48} color={Color.textMuted} />
            <Text style={styles.emptyTitle}>No balances to display</Text>
            <Text style={styles.emptySub}>
              Create or join groups and start adding expenses to see who owes whom.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Color.text,
  },
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Color.white,
    padding: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  statLabel: {
    fontSize: 12,
    color: Color.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 20,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Color.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Color.white,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Color.text,
  },
  itemSub: {
    fontSize: 12,
    color: Color.textSecondary,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Color.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Color.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
