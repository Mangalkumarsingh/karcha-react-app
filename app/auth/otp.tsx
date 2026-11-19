import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    resendAfterSeconds?: string;
    expiresInSeconds?: string;
  }>();

  const email = (params.email || '').trim().toLowerCase();
  const initialResendTimer = parseInt(params.resendAfterSeconds || '60', 10) || 60;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(initialResendTimer);
  const [canResend, setCanResend] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const { verifyEmailOtp, requestEmailOtp } = useAuth();

  // Countdown timer for resend code
  useEffect(() => {
    let interval: any = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  // Handle OTP change (clean non-digits and trigger auto-submit if 6 digits)
  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(cleaned);
    if (errorMessage) {
      setErrorMessage(null);
    }

    if (cleaned.length === OTP_LENGTH) {
      performVerification(cleaned);
    }
  };

  const performVerification = async (codeToVerify?: string) => {
    const code = codeToVerify ?? otp;
    if (code.length < OTP_LENGTH) {
      setErrorMessage(`Please enter all ${OTP_LENGTH} digits of your verification code.`);
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Missing email address. Please return to login screen.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await verifyEmailOtp(email, code);

      if (data?.accessToken) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Verified successfully!', ToastAndroid.SHORT);
        }
        router.replace('/(tabs)/Home');
      } else {
        throw new Error(data?.message || 'Verification failed. Please check the code.');
      }
    } catch (error: any) {
      const errorText =
        error.response?.data?.message ||
        error.message ||
        'Invalid or expired verification code. Please check and try again.';
      setErrorMessage(errorText);
      Alert.alert('Verification Failed', errorText);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending || !email) return;

    setResending(true);
    setErrorMessage(null);

    try {
      const res = await requestEmailOtp(email);
      const newTimer = res?.resendAfterSeconds || 60;
      setTimer(newTimer);
      setCanResend(false);
      setOtp('');

      if (Platform.OS === 'android') {
        ToastAndroid.show('New code sent to your email!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Code Resent', `A new verification code has been dispatched to ${email}.`);
      }
      inputRef.current?.focus();
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Unable to resend verification code. Please try again shortly.';
      Alert.alert('Resend Error', msg);
    } finally {
      setResending(false);
    }
  };

  // Render individual digit boxes
  const renderOtpBoxes = () => {
    const boxes = [];
    for (let i = 0; i < OTP_LENGTH; i++) {
      const digit = otp[i] || '';
      const isFocused = otp.length === i || (i === OTP_LENGTH - 1 && otp.length === OTP_LENGTH);

      boxes.push(
        <View
          key={i}
          style={[
            styles.digitBox,
            digit ? styles.digitBoxFilled : null,
            isFocused ? styles.digitBoxActive : null,
            errorMessage ? styles.digitBoxError : null,
          ]}
        >
          <Text style={styles.digitText}>{digit}</Text>
        </View>
      );
    }
    return boxes;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {/* Top navigation row */}
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={Color.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={styles.changeEmailPill}
            >
              <Ionicons name="create-outline" size={14} color={Color.primary} />
              <Text style={styles.changeEmailPillText}>Change Email</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-unread-outline" size={36} color={Color.primary} />
            </View>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to
            </Text>
            <View style={styles.emailBadge}>
              <Ionicons name="mail" size={14} color={Color.primary} />
              <Text style={styles.emailHighlight} numberOfLines={1}>
                {email || 'your email'}
              </Text>
            </View>
          </View>

          {/* OTP Card */}
          <View style={styles.otpCard}>
            <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>

            {/* Visual Digits Container */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={styles.boxesRow}
            >
              {renderOtpBoxes()}
            </TouchableOpacity>

            {/* Hidden native TextInput to capture full keyboard, autofill, and paste */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              autoFocus
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Resend & Timer */}
            <View style={styles.resendRow}>
              {canResend ? (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={resending}
                  activeOpacity={0.7}
                  style={styles.resendButton}
                >
                  {resending ? (
                    <ActivityIndicator size="small" color={Color.primary} />
                  ) : (
                    <View style={styles.resendContent}>
                      <Ionicons name="refresh-outline" size={15} color={Color.primary} />
                      <Text style={styles.resendActiveText}>Resend Code</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.timerText}>
                  Resend code in <Text style={styles.timerSec}>{timer}s</Text>
                </Text>
              )}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (otp.length < OTP_LENGTH || loading) && styles.disabledButton,
              ]}
              onPress={() => performVerification()}
              disabled={loading || otp.length < OTP_LENGTH}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Color.white} size="small" />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color={Color.white} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Color.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  changeEmailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Color.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  changeEmailPillText: {
    color: Color.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Color.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: Color.textSecondary,
    marginTop: 6,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 8,
    maxWidth: '90%',
  },
  emailHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.text,
  },
  otpCard: {
    backgroundColor: Color.white,
    borderRadius: 22,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Color.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  digitBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Color.border,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: {
    borderColor: Color.primary,
    backgroundColor: Color.white,
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  digitBoxFilled: {
    borderColor: Color.primary,
    backgroundColor: Color.white,
  },
  digitBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '800',
    color: Color.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  resendButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 13,
    color: Color.textMuted,
  },
  timerSec: {
    color: Color.primary,
    fontWeight: '700',
  },
  resendActiveText: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.primary,
  },
  verifyButton: {
    backgroundColor: Color.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyButtonText: {
    color: Color.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
