import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Hash, BookOpen, Activity, Edit3, Save, X, Heart } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProfileService } from '@/services/profile.service';
import { profileUpdateSchema, type ProfileUpdateData } from '@/utils/validators';
import { formatDate } from '@/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import type { MedicalCertificate } from '@/types/models';

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  student_number?: string;
  program?: string;
  status?: string;
  enrollment_date?: string;
  medical_certificates?: MedicalCertificate[];
}

function getMedicalStatusVariant(status: string): 'success' | 'warning' | 'error' {
  switch (status.toLowerCase()) {
    case 'active':
    case 'valid':
      return 'success';
    case 'expiring':
    case 'expiring_soon':
      return 'warning';
    case 'expired':
      return 'error';
    default:
      return 'warning';
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await ProfileService.getProfile();
      return data as unknown as ProfileData;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (formData: ProfileUpdateData) => {
      await ProfileService.updateProfile(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
      Alert.alert(t('common.success'), 'Profile updated.');
    },
    onError: () => {
      Alert.alert(t('common.error'), 'Failed to update profile.');
    },
  });

  const startEditing = useCallback(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setFieldErrors({});
      setEditing(true);
    }
  }, [profile]);

  const handleSave = useCallback(() => {
    const validation = profileUpdateSchema.safeParse({
      first_name: firstName,
      last_name: lastName,
    });

    if (!validation.success) {
      const fieldErrs: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrs[field] = issue.message;
      });
      setFieldErrors(fieldErrs);
      return;
    }

    setFieldErrors({});
    updateMutation.mutate(validation.data);
  }, [firstName, lastName, updateMutation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderSkeleton = () => (
    <View style={styles.skeletonContent}>
      <View style={styles.avatarSection}>
        <Skeleton width={80} height={80} borderRadius={40} />
        <Skeleton width="40%" height={20} borderRadius={4} style={{ marginTop: 12 }} />
        <Skeleton width="30%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width="100%" height={120} borderRadius={16} style={{ marginTop: 20 }} />
      <Skeleton width="100%" height={120} borderRadius={16} style={{ marginTop: 16 }} />
    </View>
  );

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title={t('profiles.title')}
          showBack
          onBack={() => router.back()}
        />
        <ErrorState onRetry={() => refetch()} />
      </View>
    );
  }

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : '';

  return (
    <View style={styles.container}>
      <Header
        title={t('profiles.title')}
        showBack
        onBack={() => router.back()}
        rightAction={
          !editing ? (
            <Button
              title={t('profiles.editProfile')}
              onPress={startEditing}
              variant="ghost"
              size="sm"
              icon={<Edit3 size={14} color={colors.gold[500]} />}
            />
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                title={t('common.cancel')}
                onPress={() => setEditing(false)}
                variant="ghost"
                size="sm"
                icon={<X size={14} color={colors.text.muted} />}
              />
              <Button
                title={t('common.save')}
                onPress={handleSave}
                loading={updateMutation.isPending}
                size="sm"
                icon={<Save size={14} color={colors.navy[900]} />}
              />
            </View>
          )
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold[500]}
          />
        }
      >
        {isLoading ? (
          renderSkeleton()
        ) : profile ? (
          <>
            <View style={styles.avatarSection}>
              <Avatar name={fullName} size={80} />
              {editing ? (
                <View style={styles.editNameFields}>
                  <Input
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={t('auth.email').split(' ')[0]}
                    error={fieldErrors.first_name}
                    style={{ flex: 1 }}
                  />
                  <Input
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last"
                    error={fieldErrors.last_name}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.name}>{fullName}</Text>
                  <Text style={styles.email}>{profile.email}</Text>
                </>
              )}
              {profile.role && (
                <Badge
                  label={profile.role}
                  variant="info"
                  size="md"
                  style={{ marginTop: 8 }}
                />
              )}
            </View>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.infoGrid}>
                <InfoRow icon={<Mail size={16} color={colors.text.muted} />} label="Email" value={profile.email} />
                <InfoRow icon={<User size={16} color={colors.text.muted} />} label="Role" value={profile.role} />
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Student Information</Text>
              <View style={styles.infoGrid}>
                <InfoRow icon={<Hash size={16} color={colors.text.muted} />} label={t('profiles.studentNumber')} value={profile.student_number ?? 'N/A'} />
                <InfoRow icon={<BookOpen size={16} color={colors.text.muted} />} label={t('profiles.program')} value={profile.program ?? 'N/A'} />
                <InfoRow
                  icon={<Activity size={16} color={colors.text.muted} />}
                  label={t('profiles.status')}
                  value={profile.status ?? 'N/A'}
                  valueColor={
                    profile.status?.toLowerCase() === 'active'
                      ? colors.status.success
                      : colors.text.secondary
                  }
                />
                {profile.enrollment_date && (
                  <InfoRow
                    icon={<User size={16} color={colors.text.muted} />}
                    label="Enrolled"
                    value={formatDate(profile.enrollment_date)}
                  />
                )}
              </View>
            </Card>

            {(profile.medical_certificates ?? []).length > 0 && (
              <Card style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Heart size={18} color={colors.gold[500]} />
                  <Text style={styles.sectionTitle}>{t('profiles.medicalStatus')}</Text>
                </View>
                {profile.medical_certificates!.map((mc) => (
                  <View key={mc.id} style={styles.medicalItem}>
                    <View style={styles.medicalInfo}>
                      <Text style={styles.medicalIssuer}>{mc.issuer}</Text>
                      <Text style={styles.medicalDates}>
                        {formatDate(mc.issue_date)} – {formatDate(mc.expiry_date)}
                      </Text>
                    </View>
                    <Badge
                      label={mc.status}
                      variant={getMedicalStatusVariant(mc.status)}
                      size="sm"
                    />
                  </View>
                ))}
              </Card>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={infoStyles.row}>
      {icon}
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    color: colors.text.muted,
    width: 120,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  skeletonContent: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  editNameFields: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 12,
  },
  email: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 4,
  },
  section: {
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  infoGrid: {
    gap: 4,
  },
  medicalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.navy[700],
  },
  medicalInfo: {
    flex: 1,
    gap: 2,
  },
  medicalIssuer: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  medicalDates: {
    fontSize: 12,
    color: colors.text.muted,
  },
});
