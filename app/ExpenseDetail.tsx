import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import {
  useDeleteExpense,
  useExpenseDetails,
} from '@/src/hooks/useSplitwise';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id, groupId } = useLocalSearchParams<{ id: string; groupId: string }>();

  const { data: expense, isLoading } = useExpenseDetails(groupId, id);
  const deleteExpenseMutation = useDeleteExpense(groupId || '');

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This will update all group balances.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (id) {
                await deleteExpenseMutation.mutateAsync(id);
                Alert.alert('Deleted', 'Expense deleted successfully.');
                router.back();
              }
            } catch (err: any) {
              Alert.alert('Notice', err.response?.data?.message || 'Expense deleted.');
              router.back();
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Color.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Color.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Details</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={22} color={Color.negative} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Expense Banner */}
        <View style={styles.expenseHero}>
          <View style={styles.iconCircle}>
            <Ionicons name="receipt" size={36} color={Color.primary} />
          </View>
          <Text style={styles.title}>{expense?.title || 'Shared Expense'}</Text>
          <Text style={styles.amount}>₹{(expense?.amount || 0).toFixed(2)}</Text>
          <Text style={styles.date}>
            Added on {expense?.createdAt ? new Date(expense.createdAt).toDateString() : 'Recent'}
          </Text>
          {expense?.description ? (
            <Text style={styles.notes}>"{expense.description}"</Text>
          ) : null}
        </View>

        {/* Payer Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Payer</Text>
          <View style={styles.personRow}>
            <View style={styles.personAvatar}>
              <Ionicons name="person" size={20} color={Color.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>
                {expense?.paidBy?.name || 'Group Member'}
              </Text>
              <Text style={styles.personSub}>Paid full amount</Text>
            </View>
            <Text style={styles.paidAmount}>₹{(expense?.amount || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Split Details Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>
            Split Breakdown ({expense?.participantCount || 1} people)
          </Text>

          {expense?.splits && expense.splits.length > 0 ? (
            expense.splits.map((split) => (
              <View key={split.userId} style={styles.splitRow}>
                <View style={styles.splitLeft}>
                  <View style={styles.miniAvatar}>
                    <Ionicons name="person-outline" size={16} color={Color.textSecondary} />
                  </View>
                  <Text style={styles.splitName}>
                    {split.userName} {split.userId === user?.id ? '(You)' : ''}
                  </Text>
                </View>
                <Text style={styles.splitShare}>
                  owes ₹{split.shareAmount.toFixed(2)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.splitRow}>
              <View style={styles.splitLeft}>
                <View style={styles.miniAvatar}>
                  <Ionicons name="people-outline" size={16} color={Color.textSecondary} />
                </View>
                <Text style={styles.splitName}>Equally Split</Text>
              </View>
              <Text style={styles.splitShare}>
                ₹{((expense?.amount || 0) / (expense?.participantCount || 1)).toFixed(2)} / person
              </Text>
            </View>
          )}
        </View>

        {/* Delete button banner */}
        <TouchableOpacity
          style={styles.deleteBottomBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color={Color.negative} />
          <Text style={styles.deleteBottomBtnText}>Delete this expense</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  deleteBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  expenseHero: {
    alignItems: 'center',
    backgroundColor: Color.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Color.text,
    textAlign: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: '900',
    color: Color.text,
    marginTop: 6,
  },
  date: {
    fontSize: 13,
    color: Color.textMuted,
    marginTop: 4,
  },
  notes: {
    fontSize: 14,
    color: Color.textSecondary,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Color.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    color: Color.text,
  },
  personSub: {
    fontSize: 12,
    color: Color.textSecondary,
    marginTop: 2,
  },
  paidAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Color.primary,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  splitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Color.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitName: {
    fontSize: 14,
    fontWeight: '600',
    color: Color.text,
  },
  splitShare: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.textSecondary,
  },
  deleteBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Color.negativeBg,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 10,
  },
  deleteBottomBtnText: {
    color: Color.negative,
    fontSize: 15,
    fontWeight: '700',
  },
});
