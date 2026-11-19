import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import {
  useAddExpense,
  useGroupMembers,
  useMyGroups,
} from '@/src/hooks/useSplitwise';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { groupId: initialGroupId } = useLocalSearchParams<{ groupId?: string }>();

  // Queries
  const { data: groups = [] } = useMyGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    initialGroupId || (groups[0]?.id ?? '')
  );

  const { data: members = [] } = useGroupMembers(selectedGroupId);
  const addExpenseMutation = useAddExpense(selectedGroupId);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidByUserId, setPaidByUserId] = useState<string>('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE'>('EQUAL');
  const [customShares, setCustomShares] = useState<{ [userId: string]: string }>({});
  const [customPercentages, setCustomPercentages] = useState<{ [userId: string]: string }>({});

  // Update selectedGroupId if groups load and initialGroupId wasn't set
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups]);

  // When members load, initialize paidBy and participants
  const membersKey = members.map((m) => m.userId).join(',');
  const currentUserId = user?.id;

  useEffect(() => {
    if (members.length > 0) {
      // Default paidBy to current user or first member
      const myMember = members.find((m) => m.userId === currentUserId);
      setPaidByUserId(myMember ? myMember.userId : members[0].userId);
      // Default participants: select all members
      setSelectedParticipants(members.map((m) => m.userId));
    } else if (currentUserId) {
      setPaidByUserId(currentUserId);
      setSelectedParticipants([currentUserId]);
    }
  }, [membersKey, currentUserId]);

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      if (selectedParticipants.length === 1) {
        Alert.alert('Notice', 'At least one participant must be included in the split.');
        return;
      }
      setSelectedParticipants(selectedParticipants.filter((id) => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  // Calculated per-person share preview
  const perPersonShare = useMemo(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || selectedParticipants.length === 0) return 0;
    return num / selectedParticipants.length;
  }, [amount, selectedParticipants]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter an expense title.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Missing Field', 'Please enter a valid amount.');
      return;
    }
    if (!selectedGroupId) {
      Alert.alert('Missing Field', 'Please select a group.');
      return;
    }
    if (selectedParticipants.length === 0) {
      Alert.alert('Notice', 'Please select at least one participant.');
      return;
    }

    // Build splits based on splitMode
    let splits: { userId: string; userName: string; shareAmount: number; percentage?: number }[] = [];
    if (splitMode === 'EQUAL') {
      const share = parsedAmount / selectedParticipants.length;
      splits = selectedParticipants.map((id) => {
        const mem = members.find((m) => m.userId === id);
        return {
          userId: id,
          userName: mem ? mem.name : (id === user?.id ? 'You' : 'Member'),
          shareAmount: parseFloat(share.toFixed(2)),
        };
      });
    } else if (splitMode === 'EXACT') {
      let sum = 0;
      for (const id of selectedParticipants) {
        const val = parseFloat(customShares[id] || '0');
        sum += val;
        const mem = members.find((m) => m.userId === id);
        splits.push({
          userId: id,
          userName: mem ? mem.name : (id === user?.id ? 'You' : 'Member'),
          shareAmount: val,
        });
      }
      if (Math.abs(sum - parsedAmount) > 0.5) {
        Alert.alert(
          'Split Mismatch',
          `The unequal shares sum to ₹${sum.toFixed(2)}, which does not match total amount ₹${parsedAmount.toFixed(2)}.`
        );
        return;
      }
    } else if (splitMode === 'PERCENTAGE') {
      let percentSum = 0;
      for (const id of selectedParticipants) {
        const pct = parseFloat(customPercentages[id] || '0');
        percentSum += pct;
        const share = (parsedAmount * pct) / 100;
        const mem = members.find((m) => m.userId === id);
        splits.push({
          userId: id,
          userName: mem ? mem.name : (id === user?.id ? 'You' : 'Member'),
          shareAmount: parseFloat(share.toFixed(2)),
          percentage: pct,
        });
      }
      if (Math.abs(percentSum - 100) > 0.5) {
        Alert.alert(
          'Percentage Mismatch',
          `The percentages sum to ${percentSum.toFixed(1)}%. Total must be 100%.`
        );
        return;
      }
    }

    // Ensure splits match exact backend PRD specification: [{ userId, shareAmount }]
    const cleanSplits = splits.map((s) => ({
      userId: s.userId,
      shareAmount: s.shareAmount,
    }));

    try {
      await addExpenseMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        amount: parsedAmount,
        currency: 'INR',
        paidByUserId: paidByUserId || user?.id || '',
        splitType: splitMode,
        participantIds: selectedParticipants,
        splits: cleanSplits,
      } as any);

      if (Platform.OS === 'android') {
        ToastAndroid.show('Expense added successfully to server!', ToastAndroid.SHORT);
      }
      router.back();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Server failed to save expense. Please check connection and try again.';
      Alert.alert('Backend Error', errorMsg);
    }
  };

  if (groups.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Color.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add an expense</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.noGroupContainer}>
          <View style={styles.noGroupIconCircle}>
            <Ionicons name="people-outline" size={48} color={Color.primary} />
          </View>
          <Text style={styles.noGroupTitle}>No group present</Text>
          <Text style={styles.noGroupSubtitle}>
            You must create or join a group before you can add an expense.
          </Text>
          <TouchableOpacity
            style={styles.createGroupBtn}
            onPress={() => router.replace('/(tabs)/Home' as any)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Color.white} />
            <Text style={styles.createGroupBtnText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={Color.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add an expense</Text>
          <TouchableOpacity
            style={styles.saveTopBtn}
            onPress={handleSave}
            disabled={addExpenseMutation.isPending}
          >
            {addExpenseMutation.isPending ? (
              <ActivityIndicator color={Color.primary} size="small" />
            ) : (
              <Text style={styles.saveTopBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group Selector (if multiple groups exist) */}
          <Text style={styles.fieldLabel}>With you and...</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.groupScroll}
          >
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.groupChip,
                  selectedGroupId === g.id && styles.groupChipActive,
                ]}
                onPress={() => setSelectedGroupId(g.id)}
              >
                <Ionicons
                  name="people"
                  size={14}
                  color={selectedGroupId === g.id ? Color.white : Color.primary}
                />
                <Text
                  style={[
                    styles.groupChipText,
                    selectedGroupId === g.id && styles.groupChipTextActive,
                  ]}
                >
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Description & Amount Card */}
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="document-text-outline" size={22} color={Color.primary} />
              </View>
              <TextInput
                style={styles.titleInput}
                placeholder="Enter a description"
                placeholderTextColor={Color.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.inputRow}>
              <View style={styles.iconCircle}>
                <Text style={styles.currencySymbol}>₹</Text>
              </View>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={Color.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.inputRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="chatbubble-outline" size={20} color={Color.textMuted} />
              </View>
              <TextInput
                style={styles.noteInput}
                placeholder="Add optional notes or tags"
                placeholderTextColor={Color.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* Paid By Selector */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Paid by</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipsRow}>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.userId}
                    style={[
                      styles.payerChip,
                      paidByUserId === m.userId && styles.payerChipActive,
                    ]}
                    onPress={() => setPaidByUserId(m.userId)}
                  >
                    <Text
                      style={[
                        styles.payerChipText,
                        paidByUserId === m.userId && styles.payerChipTextActive,
                      ]}
                    >
                      {m.userId === user?.id ? 'You' : m.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Split Mode Selector (Equal, Unequal/Exact, Percentage) */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Split Method</Text>
            <View style={styles.splitModeRow}>
              <TouchableOpacity
                style={[
                  styles.splitModeBtn,
                  splitMode === 'EQUAL' && styles.splitModeBtnActive,
                ]}
                onPress={() => setSplitMode('EQUAL')}
              >
                <Ionicons
                  name="pie-chart-outline"
                  size={16}
                  color={splitMode === 'EQUAL' ? Color.white : Color.text}
                />
                <Text
                  style={[
                    styles.splitModeBtnText,
                    splitMode === 'EQUAL' && styles.splitModeBtnTextActive,
                  ]}
                >
                  Equal (=)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.splitModeBtn,
                  splitMode === 'EXACT' && styles.splitModeBtnActive,
                ]}
                onPress={() => setSplitMode('EXACT')}
              >
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={splitMode === 'EXACT' ? Color.white : Color.text}
                />
                <Text
                  style={[
                    styles.splitModeBtnText,
                    splitMode === 'EXACT' && styles.splitModeBtnTextActive,
                  ]}
                >
                  Unequal (₹)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.splitModeBtn,
                  splitMode === 'PERCENTAGE' && styles.splitModeBtnActive,
                ]}
                onPress={() => setSplitMode('PERCENTAGE')}
              >
                <Ionicons
                  name="stats-chart-outline"
                  size={16}
                  color={splitMode === 'PERCENTAGE' ? Color.white : Color.text}
                />
                <Text
                  style={[
                    styles.splitModeBtnText,
                    splitMode === 'PERCENTAGE' && styles.splitModeBtnTextActive,
                  ]}
                >
                  Percentage (%)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Split Options */}
          <View style={styles.section}>
            <View style={styles.splitHeader}>
              <Text style={styles.fieldLabel}>
                {splitMode === 'EQUAL'
                  ? 'Split equally between'
                  : splitMode === 'EXACT'
                  ? 'Enter exact amount for each'
                  : 'Enter percentage for each'}
              </Text>
              {splitMode === 'EQUAL' && perPersonShare > 0 && (
                <Text style={styles.shareBadge}>
                  ₹{perPersonShare.toFixed(2)} / person
                </Text>
              )}
            </View>

            <View style={styles.participantsCard}>
              {members.length === 0 ? (
                <Text style={styles.emptyMembersText}>
                  Add or invite members to this group to split costs.
                </Text>
              ) : (
                members.map((m) => {
                  const isChecked = selectedParticipants.includes(m.userId);
                  return (
                    <View key={m.userId} style={styles.participantRowContainer}>
                      <TouchableOpacity
                        style={styles.participantRow}
                        onPress={() => toggleParticipant(m.userId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.participantLeft}>
                          <Ionicons
                            name={isChecked ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={isChecked ? Color.primary : Color.textMuted}
                          />
                          <Text style={styles.participantName}>
                            {m.name} {m.userId === user?.id ? '(You)' : ''}
                          </Text>
                        </View>
                        {isChecked && splitMode === 'EQUAL' && perPersonShare > 0 && (
                          <Text style={styles.participantShare}>
                            ₹{perPersonShare.toFixed(2)}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {/* Custom input fields for Unequal and Percentage splits */}
                      {isChecked && splitMode === 'EXACT' && (
                        <View style={styles.customSplitInputRow}>
                          <Text style={styles.customSplitCurrency}>₹</Text>
                          <TextInput
                            style={styles.customSplitInput}
                            placeholder="0.00"
                            placeholderTextColor={Color.textMuted}
                            keyboardType="decimal-pad"
                            value={customShares[m.userId] || ''}
                            onChangeText={(val) =>
                              setCustomShares({ ...customShares, [m.userId]: val })
                            }
                          />
                        </View>
                      )}

                      {isChecked && splitMode === 'PERCENTAGE' && (
                        <View style={styles.customSplitInputRow}>
                          <TextInput
                            style={styles.customSplitInput}
                            placeholder="0"
                            placeholderTextColor={Color.textMuted}
                            keyboardType="decimal-pad"
                            value={customPercentages[m.userId] || ''}
                            onChangeText={(val) =>
                              setCustomPercentages({
                                ...customPercentages,
                                [m.userId]: val,
                              })
                            }
                          />
                          <Text style={styles.customSplitCurrency}>%</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Large Save Button */}
          <TouchableOpacity
            style={styles.bottomSaveBtn}
            onPress={handleSave}
            disabled={addExpenseMutation.isPending}
            activeOpacity={0.85}
          >
            {addExpenseMutation.isPending ? (
              <ActivityIndicator color={Color.white} />
            ) : (
              <Text style={styles.bottomSaveBtnText}>Save Expense</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Color.border,
    backgroundColor: Color.white,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Color.text,
  },
  saveTopBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveTopBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Color.primary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Color.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupScroll: {
    marginBottom: 20,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Color.white,
    borderWidth: 1,
    borderColor: Color.border,
    marginRight: 8,
  },
  groupChipActive: {
    backgroundColor: Color.primary,
    borderColor: Color.primary,
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Color.text,
  },
  groupChipTextActive: {
    color: Color.white,
  },
  card: {
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '800',
    color: Color.primary,
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Color.text,
    paddingVertical: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: Color.text,
    paddingVertical: 8,
  },
  noteInput: {
    flex: 1,
    fontSize: 14,
    color: Color.text,
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Color.borderLight,
    marginVertical: 10,
  },
  section: {
    marginBottom: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Color.white,
    borderWidth: 1.5,
    borderColor: Color.border,
  },
  payerChipActive: {
    backgroundColor: Color.primaryLight,
    borderColor: Color.primary,
  },
  payerChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Color.text,
  },
  payerChipTextActive: {
    color: Color.primary,
    fontWeight: '700',
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Color.primary,
    backgroundColor: Color.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  participantsCard: {
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: Color.text,
  },
  participantShare: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.textSecondary,
  },
  emptyMembersText: {
    fontSize: 13,
    color: Color.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  bottomSaveBtn: {
    backgroundColor: Color.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  bottomSaveBtnText: {
    color: Color.white,
    fontSize: 16,
    fontWeight: '700',
  },
  splitModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  splitModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Color.white,
    borderWidth: 1.5,
    borderColor: Color.border,
  },
  splitModeBtnActive: {
    backgroundColor: Color.primary,
    borderColor: Color.primary,
  },
  splitModeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Color.text,
  },
  splitModeBtnTextActive: {
    color: Color.white,
  },
  participantRowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
    paddingVertical: 4,
  },
  customSplitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 4,
  },
  customSplitCurrency: {
    fontSize: 15,
    fontWeight: '700',
    color: Color.primary,
  },
  customSplitInput: {
    width: 90,
    backgroundColor: Color.background,
    borderWidth: 1.5,
    borderColor: Color.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
    color: Color.text,
    textAlign: 'right',
  },
  noGroupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noGroupIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noGroupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Color.text,
    marginBottom: 8,
  },
  noGroupSubtitle: {
    fontSize: 14,
    color: Color.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.primary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createGroupBtnText: {
    color: Color.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
