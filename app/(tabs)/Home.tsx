import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import {
  useCreateGroup,
  useMyGroups,
  useMyInvitations,
} from '@/src/hooks/useSplitwise';
import { GroupItem } from '@/src/types/splitwise';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Queries
  const { data: groups = [], isLoading, isRefetching, refetch } = useMyGroups();
  const { data: invitations = [] } = useMyInvitations();
  const createGroupMutation = useCreateGroup();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCurrency, setNewGroupCurrency] = useState('INR');

  // Overall net balance calculation across all groups
  const overallNetBalance = useMemo(() => {
    return groups.reduce(
      (sum: number, g: GroupItem) => sum + (g.currentUserNetBalance || 0),
      0
    );
  }, [groups]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Required', 'Please enter a group name.');
      return;
    }

    try {
      await createGroupMutation.mutateAsync({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
        currency: newGroupCurrency,
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setModalVisible(false);
      Alert.alert('Success', 'Group created successfully!');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || err.message || 'Could not create group'
      );
    }
  };

  const renderGroupCard = ({ item }: { item: GroupItem }) => {
    const net = item.currentUserNetBalance || 0;
    const isOwed = net > 0;
    const isOwing = net < 0;

    return (
      <TouchableOpacity
        style={styles.groupCard}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/GroupDetail' as any, params: { id: item.id } })}
      >
        <View style={styles.groupIconContainer}>
          <Ionicons name="people" size={24} color={Color.primary} />
        </View>

        <View style={styles.groupInfo}>
          <Text style={styles.groupName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.groupMeta}>
            {item.memberCount || 1} members • Total: ₹{item.totalExpenses || 0}
          </Text>
        </View>

        <View style={styles.groupBalance}>
          {isOwed ? (
            <>
              <Text style={styles.balanceStatusOwed}>you are owed</Text>
              <Text style={styles.balanceAmountOwed}>+₹{Math.abs(net).toFixed(2)}</Text>
            </>
          ) : isOwing ? (
            <>
              <Text style={styles.balanceStatusOwing}>you owe</Text>
              <Text style={styles.balanceAmountOwing}>-₹{Math.abs(net).toFixed(2)}</Text>
            </>
          ) : (
            <Text style={styles.balanceSettled}>settled up</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>
            Hi, {user?.name?.split(' ')[0] || 'Friend'} 👋
          </Text>
          <Text style={styles.headerTitle}>Groups</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => router.push('/(tabs)/Search')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={Color.text} />
            {invitations.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{invitations.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createGroupHeaderBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color={Color.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overall Balance Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Overall Net Balance</Text>
            {overallNetBalance > 0 ? (
              <Text style={[styles.summaryAmount, { color: Color.positive }]}>
                + ₹{Math.abs(overallNetBalance).toFixed(2)}
              </Text>
            ) : overallNetBalance < 0 ? (
              <Text style={[styles.summaryAmount, { color: Color.negative }]}>
                - ₹{Math.abs(overallNetBalance).toFixed(2)}
              </Text>
            ) : (
              <Text style={[styles.summaryAmount, { color: Color.settled }]}>
                ₹0.00
              </Text>
            )}
          </View>
          <View
            style={[
              styles.summaryBadge,
              overallNetBalance > 0
                ? { backgroundColor: Color.positiveBg }
                : overallNetBalance < 0
                ? { backgroundColor: Color.negativeBg }
                : { backgroundColor: Color.settledBg },
            ]}
          >
            <Text
              style={[
                styles.summaryBadgeText,
                overallNetBalance > 0
                  ? { color: Color.positive }
                  : overallNetBalance < 0
                  ? { color: Color.negative }
                  : { color: Color.settled },
              ]}
            >
              {overallNetBalance > 0
                ? 'You are owed'
                : overallNetBalance < 0
                ? 'You owe'
                : 'All Settled'}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Color.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
          placeholderTextColor={Color.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Color.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Groups List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Color.primary} />
          <Text style={styles.loadingText}>Fetching your groups...</Text>
        </View>
      ) : filteredGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={48} color={Color.primary} />
          </View>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a group for your trip, apartment, or outing to start splitting
            expenses!
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={20} color={Color.white} />
            <Text style={styles.emptyActionBtnText}>Create Your First Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Color.primary}
            />
          }
        />
      )}

      {/* Floating Action Button (Add Expense) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => {
          if (groups.length === 0) {
            setModalVisible(true);
          } else {
            router.push('/AddExpense');
          }
        }}
      >
        <Ionicons name="receipt" size={22} color={Color.white} />
        <Text style={styles.fabText}>Add Expense</Text>
      </TouchableOpacity>

      {/* Create Group Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Group</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Color.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Group Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Goa Trip 2026, Flat 402"
              placeholderTextColor={Color.textMuted}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Short description..."
              placeholderTextColor={Color.textMuted}
              value={newGroupDesc}
              onChangeText={setNewGroupDesc}
            />

            <Text style={styles.fieldLabel}>Currency</Text>
            <View style={styles.currencyRow}>
              {['INR', 'USD', 'EUR', 'GBP'].map((curr) => (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyChip,
                    newGroupCurrency === curr && styles.currencyChipActive,
                  ]}
                  onPress={() => setNewGroupCurrency(curr)}
                >
                  <Text
                    style={[
                      styles.currencyChipText,
                      newGroupCurrency === curr && styles.currencyChipTextActive,
                    ]}
                  >
                    {curr}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                createGroupMutation.isPending && { opacity: 0.7 },
              ]}
              onPress={handleCreateGroup}
              disabled={createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? (
                <ActivityIndicator color={Color.white} />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Create Group</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerGreeting: {
    fontSize: 14,
    color: Color.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Color.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inviteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Color.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Color.border,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Color.negative,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Color.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  createGroupHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Color.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: Color.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: Color.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
  summaryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.white,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Color.border,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Color.text,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: Color.text,
    marginBottom: 4,
  },
  groupMeta: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  groupBalance: {
    alignItems: 'flex-end',
  },
  balanceStatusOwed: {
    fontSize: 11,
    color: Color.positive,
    fontWeight: '600',
  },
  balanceAmountOwed: {
    fontSize: 15,
    fontWeight: '800',
    color: Color.positive,
  },
  balanceStatusOwing: {
    fontSize: 11,
    color: Color.negative,
    fontWeight: '600',
  },
  balanceAmountOwing: {
    fontSize: 15,
    fontWeight: '800',
    color: Color.negative,
  },
  balanceSettled: {
    fontSize: 13,
    color: Color.textMuted,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: Color.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Color.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Color.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: Color.white,
    fontSize: 15,
    fontWeight: '700',
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
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: Color.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Color.text,
    marginBottom: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  currencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Color.border,
    backgroundColor: Color.background,
  },
  currencyChipActive: {
    borderColor: Color.primary,
    backgroundColor: Color.primaryLight,
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Color.textSecondary,
  },
  currencyChipTextActive: {
    color: Color.primary,
    fontWeight: '700',
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
