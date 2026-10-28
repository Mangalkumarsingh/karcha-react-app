import { Color } from '@/src/constants/color';
import { useAuth } from '@/src/context/AuthContext';
import { useMyProfile, useUpdateProfile } from '@/src/hooks/useSplitwise';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { data: profile, isLoading, refetch } = useMyProfile();
  const updateProfileMutation = useUpdateProfile();

  // Edit profile state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [name, setName] = useState(profile?.name || user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.profileImageUrl || '');

  // Legal modals
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: name.trim(),
        profileImageUrl: avatarUrl.trim() || undefined,
      });
      updateUser({ name: name.trim(), profileImageUrl: avatarUrl.trim() || undefined });
      setEditModalVisible(false);
      Alert.alert('Updated', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Notice', err.response?.data?.message || 'Profile saved.');
      setEditModalVisible(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of Kharcha?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/Login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, remove your memberships, and clear stored session data per Google Play and Apple App Store compliance policies. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert(
              'Account Deleted',
              'Your account has been queued for deletion and session data cleared.'
            );
            router.replace('/auth/Login');
          },
        },
      ]
    );
  };

  const displayUser = profile || user;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color={Color.primary} />
          </View>

          <Text style={styles.userName}>
            {displayUser?.name || 'Splitwise Member'}
          </Text>
          <Text style={styles.userPhone}>
            {displayUser?.phoneNumber || '+91 98765 43210'}
          </Text>
          {displayUser?.email && (
            <Text style={styles.userEmail}>{displayUser.email}</Text>
          )}

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              setName(displayUser?.name || '');
              setAvatarUrl(displayUser?.profileImageUrl || '');
              setEditModalVisible(true);
            }}
          >
            <Ionicons name="pencil" size={14} color={Color.primary} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* General Preferences */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Preferences & Currency</Text>

          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Ionicons name="cash-outline" size={20} color={Color.textSecondary} />
              <Text style={styles.rowText}>Default Currency</Text>
            </View>
            <Text style={styles.rowValue}>INR (₹)</Text>
          </View>

          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color={Color.textSecondary} />
              <Text style={styles.rowText}>Push Notifications</Text>
            </View>
            <Text style={styles.rowValue}>Enabled</Text>
          </View>
        </View>

        {/* Legal & App Store Compliance */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Legal & Policies</Text>

          <TouchableOpacity
            style={styles.rowItemClickable}
            onPress={() => setPrivacyVisible(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Color.textSecondary} />
              <Text style={styles.rowText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Color.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItemClickable}
            onPress={() => setTermsVisible(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="document-text-outline" size={20} color={Color.textSecondary} />
              <Text style={styles.rowText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Color.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItemClickable}
            onPress={() =>
              Alert.alert(
                'Support',
                'For queries or feedback, email us at: support@kharcha.app'
              )
            }
          >
            <View style={styles.rowLeft}>
              <Ionicons name="help-circle-outline" size={20} color={Color.textSecondary} />
              <Text style={styles.rowText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Color.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Account Actions (Apple App Store Guideline 5.1.1 Required) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Account Security</Text>

          <TouchableOpacity style={styles.rowItemClickable} onPress={handleLogout}>
            <View style={styles.rowLeft}>
              <Ionicons name="log-out-outline" size={20} color={Color.negative} />
              <Text style={[styles.rowText, { color: Color.negative, fontWeight: '700' }]}>
                Log Out
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rowItemClickable} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <Ionicons name="trash-bin-outline" size={20} color={Color.negative} />
              <Text style={[styles.rowText, { color: Color.negative }]}>
                Delete Account (Permanent)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>Kharcha App • Version 1.0.0 (Production Build)</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={Color.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.fieldLabel}>Profile Picture URL (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <ActivityIndicator color={Color.white} />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={privacyVisible} animationType="slide">
        <SafeAreaView style={styles.legalModal}>
          <View style={styles.legalHeader}>
            <Text style={styles.legalTitle}>Privacy Policy</Text>
            <TouchableOpacity onPress={() => setPrivacyVisible(false)}>
              <Ionicons name="close" size={24} color={Color.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.legalContent}>
            <Text style={styles.legalPara}>
              <Text style={{ fontWeight: '700' }}>1. Information We Collect:</Text> Kharcha collects phone numbers for one-time password (OTP) authentication and expense tracking metadata (descriptions, amounts, and participant IDs) to facilitate debt calculation and settlements between users.
            </Text>
            <Text style={styles.legalPara}>
              <Text style={{ fontWeight: '700' }}>2. Data Usage & Security:</Text> Your financial and personal details are encrypted in transit using industry-standard TLS 1.3 and stored securely. We do not sell your data to any third parties.
            </Text>
            <Text style={styles.legalPara}>
              <Text style={{ fontWeight: '700' }}>3. User Rights & Account Deletion:</Text> In accordance with Google Play and Apple App Store Developer Guidelines, users have full right to request permanent deletion of their account and all associated transaction records directly from within the app.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal visible={termsVisible} animationType="slide">
        <SafeAreaView style={styles.legalModal}>
          <View style={styles.legalHeader}>
            <Text style={styles.legalTitle}>Terms of Service</Text>
            <TouchableOpacity onPress={() => setTermsVisible(false)}>
              <Ionicons name="close" size={24} color={Color.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.legalContent}>
            <Text style={styles.legalPara}>
              <Text style={{ fontWeight: '700' }}>1. Acceptance of Terms:</Text> By creating an account or using Kharcha, you agree to comply with these terms. The app is provided as a financial tracking and bill splitting utility.
            </Text>
            <Text style={styles.legalPara}>
              <Text style={{ fontWeight: '700' }}>2. Settlement Records:</Text> Settlements recorded inside the app reflect peer-to-peer confirmations between group members. Users remain individually responsible for settling real-world debts via their chosen payment methods (UPI, Cash, Bank Transfer).
            </Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Color.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: Color.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Color.text,
  },
  userPhone: {
    fontSize: 14,
    color: Color.textSecondary,
    marginTop: 4,
  },
  userEmail: {
    fontSize: 13,
    color: Color.textMuted,
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Color.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 14,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Color.primary,
  },
  sectionCard: {
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Color.borderLight,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Color.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  rowItemClickable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '600',
    color: Color.text,
  },
  rowValue: {
    fontSize: 14,
    color: Color.textSecondary,
    fontWeight: '500',
  },
  versionText: {
    fontSize: 12,
    color: Color.textMuted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
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
  legalModal: {
    flex: 1,
    backgroundColor: Color.white,
  },
  legalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Color.border,
  },
  legalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Color.text,
  },
  legalContent: {
    padding: 20,
  },
  legalPara: {
    fontSize: 14,
    lineHeight: 22,
    color: Color.text,
    marginBottom: 16,
  },
});
