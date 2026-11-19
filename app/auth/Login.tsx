import { splitwiseApi } from '@/src/api/splitwiseService';
import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

// Complete auth session dismissal for web & deep links
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '928393260134-efn2172cgtu1tc3i7lb58p7p44qng2j6.apps.googleusercontent.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const router = useRouter();
  const { requestEmailOtp, loginWithGoogle } = useAuth();

  // Setup Google Sign-In with expo-auth-session
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  // Handle Google OAuth Response
  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        handleGoogleLoginWithToken(idToken);
      } else {
        Alert.alert('Google Sign-In', 'No ID token received from Google. Please try again.');
      }
    } else if (response?.type === 'error') {
      Alert.alert('Google Sign-In Error', response.error?.message || 'Google authentication failed.');
    }
  }, [response]);

  const handleGoogleLoginWithToken = async (idToken: string) => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle(idToken);
      router.replace('/(tabs)/Home');
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to authenticate with Google.';
      Alert.alert('Google Sign-In Failed', errorMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateEmailFormat = (text: string) => {
    const trimmed = text.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
      setEmailError(null);
    }
  };

  const handleRequestOtp = async () => {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setEmailError('Email address is required');
      return;
    }

    if (!validateEmailFormat(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setEmailError(null);

    try {
      const res = await requestEmailOtp(trimmed);
      if (res?.success || res?.message) {
        router.push({
          pathname: '/auth/otp',
          params: {
            email: trimmed,
            resendAfterSeconds: String(res?.resendAfterSeconds || 60),
            expiresInSeconds: String(res?.expiresInSeconds || 300),
          },
        });
      } else {
        Alert.alert('Notice', res?.message || 'Unable to send OTP. Please try again.');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Unable to send verification code. Please check your network and try again.';
      Alert.alert('Verification Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleButtonPress = async () => {
    if (googleLoading) return;
    try {
      setGoogleLoading(true);
      if (request) {
        await promptAsync();
      } else {
        // Fallback promptAsync call if request isn't initialized yet
        await promptAsync();
      }
    } catch (e: any) {
      Alert.alert('Google Sign-In', e.message || 'Unable to open Google sign-in window.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const isEmailValid = validateEmailFormat(email);

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
          {/* Top Section */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="receipt" size={38} color={Color.primary} />
            </View>
            <Text style={styles.title}>Welcome to Karcha</Text>
            <Text style={styles.subtitle}>
              Manage your shared expenses effortlessly
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Email Login Section */}
            <Text style={styles.inputLabel}>Email Address</Text>
            <View
              style={[
                styles.inputWrapper,
                emailError ? styles.inputWrapperError : null,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailError ? '#EF4444' : Color.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="name@example.com"
                placeholderTextColor={Color.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={handleEmailChange}
                editable={!loading && !googleLoading}
                returnKeyType="send"
                onSubmitEditing={handleRequestOtp}
              />
              {email.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => setEmail('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={Color.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {emailError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.continueButton,
                (!isEmailValid || loading || googleLoading) && styles.disabledButton,
              ]}
              onPress={handleRequestOtp}
              disabled={loading || googleLoading || !isEmailValid}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Color.white} size="small" />
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.continueButtonText}>Continue with Email</Text>
                  <Ionicons name="arrow-forward" size={18} color={Color.white} />
                </View>
              )}
            </TouchableOpacity>

            {/* OR Separator */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login Section */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                googleLoading && styles.disabledButton,
              ]}
              onPress={handleGoogleButtonPress}
              disabled={loading || googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color="#1E293B" size="small" />
              ) : (
                <View style={styles.googleBtnRow}>
                  {/* Google Logo Icon */}
                  <View style={styles.googleIconContainer}>
                    <Ionicons name="logo-google" size={19} color="#EA4335" />
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Compliance & Store Footer */}
          <View style={styles.footer}>
            <Text style={styles.legalNotice}>
              By signing in, you agree to our{' '}
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
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: Color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Color.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: Color.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  card: {
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
    fontSize: 13,
    fontWeight: '700',
    color: Color.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Color.border,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Color.text,
    fontWeight: '600',
    padding: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: Color.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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
  continueButtonText: {
    color: Color.white,
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Color.border,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: '700',
    color: Color.textMuted,
  },
  googleButton: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: Color.white,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  googleBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    marginTop: 28,
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
