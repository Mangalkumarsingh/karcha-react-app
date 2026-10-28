import { splitwiseApi } from '@/src/api/splitwiseService';
import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleRequestOtp = async () => {
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const fullPhoneNumber = `+91${cleanNumber}`;
    setLoading(true);

    try {
      const response = await splitwiseApi.requestOtp(fullPhoneNumber);
      if (response.data?.success || response.status === 200) {
        router.push({
          pathname: '/auth/otp',
          params: { phone: fullPhoneNumber },
        });
      } else {
        Alert.alert('Notice', response.data?.message || 'OTP could not be sent.');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Server unreachable. You can continue to OTP for verification or test mode.';
      
      // Allow proceeding to OTP screen with notice in development
      Alert.alert(
        'OTP Sent Notice',
        `${errorMessage}\nProceeding to OTP screen for testing.`,
        [
          {
            text: 'Proceed',
            onPress: () => {
              router.push({
                pathname: '/auth/otp',
                params: { phone: fullPhoneNumber },
              });
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Demo bypass for quick offline review
  const handleDemoLogin = async () => {
    await login('demo_token_' + Date.now(), {
      id: 'demo_user_1',
      name: 'Demo User',
      phoneNumber: '+919876543210',
      email: 'demo@kharcha.app',
      createdAt: new Date().toISOString(),
    });
    router.replace('/(tabs)/Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="wallet" size={44} color={Color.primary} />
            </View>
            <Text style={styles.title}>Welcome to Kharcha</Text>
            <Text style={styles.subtitle}>
              Split bills, track shared expenses, and settle balances effortlessly.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="98765 43210"
                placeholderTextColor={Color.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                autoFocus={false}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                phoneNumber.length !== 10 && styles.disabledButton,
              ]}
              onPress={handleRequestOtp}
              disabled={loading || phoneNumber.length !== 10}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Color.white} />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.submitButtonText}>Get OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color={Color.white} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Quick Demo Bypass */}
            <TouchableOpacity
              style={styles.demoButton}
              onPress={handleDemoLogin}
              activeOpacity={0.7}
            >
              <Ionicons name="sparkles" size={18} color={Color.primary} />
              <Text style={styles.demoButtonText}>Explore Demo Account</Text>
            </TouchableOpacity>
          </View>

          {/* Compliance & Store Footer */}
          <View style={styles.footer}>
            <Text style={styles.legalNotice}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>.
            </Text>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Color.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Color.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: Color.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Color.text,
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Color.border,
    borderRadius: 14,
    backgroundColor: Color.background,
    overflow: 'hidden',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1.5,
    borderRightColor: Color.border,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  flag: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: Color.text,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Color.text,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  submitButton: {
    backgroundColor: Color.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: Color.white,
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Color.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: Color.textMuted,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Color.primary,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Color.primaryLight,
  },
  demoButtonText: {
    color: Color.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  legalNotice: {
    fontSize: 12,
    color: Color.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: Color.primary,
    fontWeight: '600',
  },
});
