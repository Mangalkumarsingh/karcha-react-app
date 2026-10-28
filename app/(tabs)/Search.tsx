import { Color } from '@/src/constants/color';
import {
  useAcceptInvitation,
  useMyInvitations,
  useRejectInvitation,
} from '@/src/hooks/useSplitwise';
import { UserInvitation } from '@/src/types/splitwise';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ActivityTabScreen() {
  const { data: invitations = [], isLoading, refetch, isRefetching } = useMyInvitations();
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();

  const handleAccept = async (invitation: UserInvitation) => {
    try {
      await acceptMutation.mutateAsync(invitation.id);
      Alert.alert('Accepted', `You have joined "${invitation.groupName}"!`);
    } catch (err: any) {
      Alert.alert('Notice', err.response?.data?.message || 'Joined group successfully.');
    }
  };

  const handleReject = async (invitation: UserInvitation) => {
    try {
      await rejectMutation.mutateAsync(invitation.id);
      Alert.alert('Declined', `Invitation declined.`);
    } catch (err: any) {
      Alert.alert('Notice', err.response?.data?.message || 'Declined.');
    }
  };

  const renderInvitation = ({ item }: { item: UserInvitation }) => (
    <View style={styles.inviteCard}>
      <View style={styles.cardTop}>
        <View style={styles.inviteIconCircle}>
          <Ionicons name="mail-unread" size={22} color={Color.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inviteTitle}>
            Invitation to <Text style={{ fontWeight: '800' }}>{item.groupName}</Text>
          </Text>
          <Text style={styles.inviteSubtitle}>
            Invited by {item.invitedBy?.name || 'a friend'} ({item.invitedBy?.phoneNumber || ''})
          </Text>
          <Text style={styles.inviteDate}>
            Received {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.declineBtn}
          onPress={() => handleReject(item)}
          disabled={rejectMutation.isPending}
        >
          <Text style={styles.declineBtnText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => handleAccept(item)}
          disabled={acceptMutation.isPending}
        >
          {acceptMutation.isPending ? (
            <ActivityIndicator color={Color.white} size="small" />
          ) : (
            <Text style={styles.acceptBtnText}>Join Group</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity & Invitations</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={Color.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id}
          renderItem={renderInvitation}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Color.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            invitations.length > 0 ? (
              <Text style={styles.sectionHeader}>
                Pending Invitations ({invitations.length})
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={48} color={Color.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No pending invitations</Text>
              <Text style={styles.emptySubtitle}>
                When friends invite you to their groups, they will appear right here.
              </Text>
            </View>
          }
        />
      )}
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Color.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  inviteCard: {
    backgroundColor: Color.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Color.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  inviteIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteTitle: {
    fontSize: 15,
    color: Color.text,
  },
  inviteSubtitle: {
    fontSize: 13,
    color: Color.textSecondary,
    marginTop: 2,
  },
  inviteDate: {
    fontSize: 11,
    color: Color.textMuted,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Color.border,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.textSecondary,
  },
  acceptBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Color.primary,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Color.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Color.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Color.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Color.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
