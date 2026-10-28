import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import { useRecordSettlement } from '@/src/hooks/useSplitwise';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function SettleUpScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    groupId?: string;
    fromUserId?: string;
    fromUserName?: string;
    toUserId?: string;
    toUserName?: string;
    amount?: string;
  }>();

  const groupId = params.groupId || '';
  const [fromUserId, setFromUserId] = useState(params.fromUserId || user?.id || '');
  const [fromUserName, setFromUserName] = useState(params.fromUserName || user?.name || 'You');
  const [toUserId, setToUserId] = useState(params.toUserId || '');
  const [toUserName, setToUserName] = useState(params.toUserName || 'Friend');
  const [amount, setAmount] = useState(params.amount || '');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'BANK_TRANSFER'>('UPI');
  const [note, setNote] = useState('');

  const recordSettlementMutation = useRecordSettlement(groupId);

  const handleRecord = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Required', 'Please enter a valid settlement amount.');
      return;
    }

    try {
      await recordSettlementMutation.mutateAsync({
        fromUserId,
        toUserId,
        amount: parsedAmount,
        paymentMethod,
        note: note.trim() || undefined,
        idempotencyKey: `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });

      Alert.alert(
        'Settlement Recorded',
        `Payment of ₹${parsedAmount.toFixed(2)} recorded successfully. The recipient can confirm it.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Settlement Notice',
        err.response?.data?.message || err.message || 'Settlement recorded.'
      );
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Color.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Record a payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Transfer visual banner */}
          <View style={styles.transferBanner}>
            <View style={styles.avatarBox}>
              <Ionicons name="person" size={24} color={Color.primary} />
              <Text style={styles.avatarLabel} numberOfLines={1}>
                {fromUserName}
              </Text>
            </View>

            <View style={styles.arrowBox}>
              <Ionicons name="arrow-forward" size={20} color={Color.primary} />
              <Text style={styles.arrowText}>paid</Text>
            </View>

            <View style={styles.avatarBox}>
              <Ionicons name="person" size={24} color={Color.primary} />
              <Text style={styles.avatarLabel} numberOfLines={1}>
                {toUserName}
              </Text>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Amount Paid</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupeeSign}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={Color.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
          </View>

          {/* Payment Method Selector */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {(['UPI', 'CASH', 'BANK_TRANSFER'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodChip,
                    paymentMethod === method && styles.methodChipActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Ionicons
                    name={
                      method === 'UPI'
                        ? 'phone-portrait-outline'
                        : method === 'CASH'
                        ? 'cash-outline'
                        : 'business-outline'
                    }
                    size={18}
                    color={paymentMethod === method ? Color.white : Color.text}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      paymentMethod === method && styles.methodTextActive,
                    ]}
                  >
                    {method === 'BANK_TRANSFER' ? 'Bank' : method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note Input */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Optional Note</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="e.g. Paid via Google Pay / PhonePe"
              placeholderTextColor={Color.textMuted}
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleRecord}
            disabled={recordSettlementMutation.isPending}
            activeOpacity={0.85}
          >
            {recordSettlementMutation.isPending ? (
              <ActivityIndicator color={Color.white} />
            ) : (
              <Text style={styles.submitBtnText}>Save Payment</Text>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Color.border,
    backgroundColor: Color.white,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Color.text,
  },
  content: {
    padding: 20,
  },
  transferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Color.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  avatarBox: {
    alignItems: 'center',
    width: 90,
  },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.text,
    marginTop: 6,
  },
  arrowBox: {
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 11,
    color: Color.primary,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Color.borderLight,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Color.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupeeSign: {
    fontSize: 28,
    fontWeight: '800',
    color: Color.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: Color.text,
    paddingVertical: 4,
  },
  section: {
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Color.white,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Color.border,
  },
  methodChipActive: {
    backgroundColor: Color.primary,
    borderColor: Color.primary,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '700',
    color: Color.text,
  },
  methodTextActive: {
    color: Color.white,
  },
  noteInput: {
    fontSize: 15,
    color: Color.text,
    paddingVertical: 4,
  },
  submitBtn: {
    backgroundColor: Color.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: Color.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
