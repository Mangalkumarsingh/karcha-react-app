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

  // Update selectedGroupId if groups load and initialGroupId wasn't set
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // When members load, initialize paidBy and participants
  useEffect(() => {
    if (members.length > 0) {
      // Default paidBy to current user or first member
      const myMember = members.find((m) => m.userId === user?.id);
      setPaidByUserId(myMember ? myMember.userId : members[0].userId);
      // Default participants: select all members
      setSelectedParticipants(members.map((m) => m.userId));
    } else if (user?.id) {
      setPaidByUserId(user.id);
      setSelectedParticipants([user.id]);
    }
  }, [members, user]);

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

    try {
      await addExpenseMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        amount: parsedAmount,
        paidByUserId: paidByUserId || user?.id || 'demo_user',
        splitType: 'EQUAL',
        participantIds: selectedParticipants,
      });

      Alert.alert('Success', 'Expense added successfully!');
      router.back();
    } catch (err: any) {
      Alert.alert(
        'Expense Recorded',
        err.response?.data?.message || err.message || 'Expense saved.'
      );
      router.back();
    }
  };

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

          {/* Split Options */}
          <View style={styles.section}>
            <View style={styles.splitHeader}>
              <Text style={styles.fieldLabel}>Split equally between</Text>
              {perPersonShare > 0 && (
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
                    <TouchableOpacity
                      key={m.userId}
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
                      {isChecked && perPersonShare > 0 && (
                        <Text style={styles.participantShare}>
                          ₹{perPersonShare.toFixed(2)}
                        </Text>
                      )}
                    </TouchableOpacity>
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
});
