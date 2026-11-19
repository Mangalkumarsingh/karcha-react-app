import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import {
  useAllExpenses,
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
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
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
  const { data: allExpenses = [] } = useAllExpenses();
  const createGroupMutation = useCreateGroup();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCurrency, setNewGroupCurrency] = useState('INR');
  const [memberInputs, setMemberInputs] = useState<{ name: string; phone: string }[]>([
    { name: '', phone: '' },
  ]);

  const addMemberField = () => {
    setMemberInputs([...memberInputs, { name: '', phone: '' }]);
  };

  const removeMemberField = (index: number) => {
    setMemberInputs(memberInputs.filter((_, i) => i !== index));
  };

  const updateMemberField = (index: number, field: 'name' | 'phone', val: string) => {
    const copy = [...memberInputs];
    copy[index][field] = val;
    setMemberInputs(copy);
  };

  // Helper to extract net balance from either backend PRD specification (`myNetBalance`) or legacy (`currentUserNetBalance`)
  const getGroupNetBalance = (g: GroupItem): number => {
    if (typeof g.myNetBalance === 'number') return g.myNetBalance;
    if (typeof g.currentUserNetBalance === 'number') return g.currentUserNetBalance;
    return 0;
  };

  // Monthly individual expense calculation for current user (total expense share in current month)
  const currentMonthUserExpense = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const myId = user?.id || 'usr_me';

    let monthlyTotal = 0;
    allExpenses.forEach((exp) => {
      const expDate = new Date(exp.createdAt);
      if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        if (exp.splits && exp.splits.length > 0) {
          const mySplit = exp.splits.find((s) => s.userId === myId || (myId === 'usr_me' && s.userId.includes('me')));
          if (mySplit) {
            monthlyTotal += mySplit.shareAmount;
          } else {
            // Also check if user is the payer
            const payerId = exp.paidBy?.id || (exp as any).paidByUserId;
            if (payerId === myId) {
              const count = exp.splits.length || exp.participantCount || 1;
              monthlyTotal += (exp.amount / count);
            }
          }
        } else {
          // If no custom splits, check if user is creator/participant
          const share = exp.amount / (exp.participantCount || 1);
          monthlyTotal += share;
        }
      }
    });
    return monthlyTotal;
  }, [allExpenses, user]);

  // Overall net balance calculation across all groups
  const overallNetBalance = useMemo(() => {
    return groups.reduce(
      (sum: number, g: GroupItem) => sum + getGroupNetBalance(g),
      0
    );
  }, [groups]);

  // Total Receive (amount user will receive from positive groups)
  {console.log("totalToReceive", getGroupNetBalance)}
  const totalToReceive = useMemo(() => {
    return groups
      .filter((g: GroupItem) => getGroupNetBalance(g) > 0)
      .reduce((sum: number, g: GroupItem) => sum + getGroupNetBalance(g), 0);
  }, [groups]);

  // Total Pay (amount user owes to negative groups)
  const totalToPay = useMemo(() => {
    {console.log("netbalance",getGroupNetBalance)}
    return groups
      .filter((g: GroupItem) => getGroupNetBalance(g) < 0)
      .reduce((sum: number, g: GroupItem) => sum + Math.abs(getGroupNetBalance(g)), 0);
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

    const validInitialMembers = memberInputs
      .filter((m) => m.name.trim().length > 0)
      .map((m) => ({ name: m.name.trim(), phoneNumber: m.phone.trim() || undefined }));

    try {
      await createGroupMutation.mutateAsync({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
        currency: newGroupCurrency,
        initialMembers: validInitialMembers.length > 0 ? validInitialMembers : undefined,
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setMemberInputs([{ name: '', phone: '' }]);
      setModalVisible(false);

      if (Platform.OS === 'android') {
        ToastAndroid.show('Group created successfully!', ToastAndroid.SHORT);
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || err.message || 'Could not create group'
      );
    }
  };

  const renderGroupCard = ({ item }: { item: GroupItem }) => {
    const net = getGroupNetBalance(item);
    const isOwed = net > 0;
    const isOwing = net < 0;
      {console.log("hello", item.totalExpenses)}
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
{console.log("totalToReceive", totalToReceive)}
{console.log("totalToPay", totalToPay)}

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Karcha..</Text>
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
        </View>
         {/* <View style={styles.headerActions}>
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
        </View> */}
      </View>

      {/* Overall Balance Summary Card & Monthly Expense Card */}
      <View style={styles.summaryCard}>
        {/* Row 1: Total Lena Hai (You Receive) & Total Dena Hai (You Pay) */}
        <View style={styles.splitRow}>
          {/* 1st: Total Lena Hai (To Receive) */}
          <View style={styles.balanceBlock}>
            <View style={styles.balanceHeaderRow}>
              <View style={[styles.balanceIconBubble, { backgroundColor: Color.positiveBg }]}>
                <Ionicons name="arrow-down-circle" size={16} color={Color.positive} />
              </View>
              <Text style={styles.summaryLabel}>You'll Receive</Text>
            </View>
            
            <Text style={[styles.summaryAmount, { color: Color.positive }]}>
              ₹{totalToReceive.toFixed(2)}
            </Text>
          </View>

          {/* Center Divider Line */}
          <View style={styles.verticalDivider} />

          {/* 2nd: Total Dena Hai (To Pay) */}
          <View style={styles.balanceBlock}>
            <View style={styles.balanceHeaderRow}>
              <View style={[styles.balanceIconBubble, { backgroundColor: Color.negativeBg }]}>
                <Ionicons name="arrow-up-circle" size={16} color={Color.negative} />
              </View>
              <Text style={styles.summaryLabel}>You'll Pay</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: Color.negative }]}>
              ₹{totalToPay.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* 3rd: This Month's Kharcha */}
        <View style={styles.monthlySpendDivider} />
        <View style={styles.monthlySpendRow}>
          <View style={styles.monthlySpendLeft}>
            <View style={styles.calendarIconCircle}>
              <Ionicons name="calendar-outline" size={16} color={Color.primary} />
            </View>
            <View>
              <Text style={styles.monthlySpendLabel}>Monthly Kharcha</Text>
              <Text style={styles.monthlySpendSub}>Your share this month</Text>
            </View>
          </View>
          <Text style={styles.monthlySpendAmount}>
            ₹{currentMonthUserExpense ? currentMonthUserExpense.toFixed(2) : '0.00'}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      {/* <View style={styles.searchContainer}> */}
        {/* <Ionicons name="search" size={18} color={Color.textMuted} />
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
        )} */}
      {/* </View> */}

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
          <Text style={styles.emptyTitle}>
            {searchQuery.trim() ? 'No groups found' : 'No group present'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery.trim()
              ? 'No groups match your search query.'
              : 'You have not joined or created any groups yet. Create a group to start adding expenses!'}
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={20} color={Color.white} />
            <Text style={styles.emptyActionBtnText}>Create Group</Text>
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

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {/* Add Expense Button */}
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
          <Ionicons name="receipt" size={20} color={Color.white} />
          <Text style={styles.fabText}>Add Expense</Text>
        </TouchableOpacity>

        {/* New Group Button (Placed below Add Expense) */}
        <TouchableOpacity
          style={styles.secondaryFab}
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="people" size={18} color={Color.primary} />
          <Text style={styles.secondaryFabText}>New Group</Text>
        </TouchableOpacity>
      </View>

      {/* Create Group Modal (Full Screen) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.fullScreenModalContainer} edges={['top', 'bottom', 'left', 'right']}>
          {/* Modal Header */}
          <View style={styles.fullScreenModalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={26} color={Color.text} />
            </TouchableOpacity>
            <Text style={styles.fullScreenModalTitle}>Create New Group</Text>
            <TouchableOpacity
              onPress={handleCreateGroup}
              disabled={createGroupMutation.isPending}
              style={styles.modalSaveHeaderBtn}
            >
              {createGroupMutation.isPending ? (
                <ActivityIndicator size="small" color={Color.primary} />
              ) : (
                <Text style={styles.modalSaveHeaderText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.fullScreenModalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>Group Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Goa Trip 2026, Flat 402, Friends"
              placeholderTextColor={Color.textMuted}
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <Text style={styles.fieldLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Short description or purpose..."
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

            {/* Initial Members Section */}
            <View style={styles.membersSectionHeader}>
              <View>
                <Text style={styles.fieldLabel}>Add Group Members</Text>
                <Text style={styles.fieldSubLabel}>
                  Add people to split expenses with right away
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addMemberRowBtn}
                onPress={addMemberField}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={16} color={Color.primary} />
                <Text style={styles.addMemberRowBtnText}>+ Member</Text>
              </TouchableOpacity>
            </View>

            {memberInputs.map((mem, index) => (
              <View key={index} style={styles.memberInputRow}>
                <View style={styles.memberInputCircle}>
                  <Ionicons name="person" size={16} color={Color.primary} />
                </View>
                <TextInput
                  style={[styles.modalInput, styles.memberNameInput]}
                  placeholder={`Member ${index + 1} Name`}
                  placeholderTextColor={Color.textMuted}
                  value={mem.name}
                  onChangeText={(val) => updateMemberField(index, 'name', val)}
                />
                <TextInput
                  style={[styles.modalInput, styles.memberPhoneInput]}
                  placeholder="Phone (Optional)"
                  placeholderTextColor={Color.textMuted}
                  keyboardType="phone-pad"
                  value={mem.phone}
                  onChangeText={(val) => updateMemberField(index, 'phone', val)}
                />
                {memberInputs.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeMemberField(index)}
                    style={styles.removeMemberBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color={Color.negative} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

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
          </ScrollView>
        </SafeAreaView>
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
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  balanceBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  balanceIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 48,
    backgroundColor: Color.border,
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: Color.textSecondary,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  summaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  summaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  monthlySpendDivider: {
    height: 1,
    backgroundColor: Color.borderLight,
    marginVertical: 12,
  },
  monthlySpendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlySpendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  monthlySpendLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.text,
  },
  monthlySpendSub: {
    fontSize: 11,
    color: Color.textSecondary,
    marginTop: 1,
  },
  monthlySpendAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Color.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
    gap: 10,
  },
  fab: {
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
  secondaryFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Color.white,
    borderWidth: 1.5,
    borderColor: Color.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  secondaryFabText: {
    color: Color.primary,
    fontSize: 13,
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
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: Color.white,
    fontSize: 16,
    fontWeight: '700',
  },
  // monthlySpendDivider: {
  //   height: 1,
  //   backgroundColor: Color.borderLight,
  //   marginVertical: 14,
  // },
  // monthlySpendRow: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  // },
  // monthlySpendLeft: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   gap: 10,
  // },
  // calendarIconCircle: {
  //   width: 32,
  //   height: 32,
  //   borderRadius: 16,
  //   backgroundColor: Color.primaryLight,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // monthlySpendLabel: {
  //   fontSize: 13,
  //   fontWeight: '700',
  //   color: Color.text,
  // },
  // monthlySpendSub: {
  //   fontSize: 11,
  //   color: Color.textSecondary,
  //   marginTop: 1,
  // },
  // monthlySpendAmount: {
  //   fontSize: 17,
  //   fontWeight: '800',
  //   color: Color.primary,
  // },
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: Color.white,
  },
  fullScreenModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  modalCloseBtn: {
    padding: 4,
  },
  fullScreenModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Color.text,
  },
  modalSaveHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalSaveHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: Color.primary,
  },
  fullScreenModalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  fieldSubLabel: {
    fontSize: 12,
    color: Color.textSecondary,
    marginTop: 1,
  },
  addMemberRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Color.primaryLight,
  },
  addMemberRowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Color.primary,
  },
  memberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberInputCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  memberNameInput: {
    flex: 1.2,
  },
  memberPhoneInput: {
    flex: 1,
  },
  removeMemberBtn: {
    padding: 8,
    marginBottom: 16,
  },
});
