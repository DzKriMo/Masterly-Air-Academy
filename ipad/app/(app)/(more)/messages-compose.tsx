import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/SearchBar';
import { Card } from '@/components/ui/Card';
import { MessagesService } from '@/services/messages.service';
import { SearchService } from '@/services/search.service';
import { messageSchema, type MessageFormData } from '@/utils/validators';
import { useTranslation } from '@/hooks/useTranslation';

interface SearchUser {
  id: string;
  name: string;
  email: string;
}

export default function MessagesComposeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search', 'users', searchQuery],
    queryFn: async () => {
      const { data } = await SearchService.search(searchQuery);
      const results = data as unknown as SearchUser[];
      return results ?? [];
    },
    enabled: searchQuery.length >= 2,
  });

  const sendMutation = useMutation({
    mutationFn: async (formData: MessageFormData) => {
      await MessagesService.send({
        receiver: formData.receiver,
        subject: formData.subject,
        body: formData.body,
      });
    },
    onSuccess: () => {
      Alert.alert(t('common.success'), t('messages.send'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert(t('common.error'), 'Failed to send message.');
    },
  });

  const handleSend = useCallback(() => {
    const validation = messageSchema.safeParse({
      receiver: selectedUser?.id ?? '',
      subject,
      body,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    sendMutation.mutate(validation.data);
  }, [selectedUser, subject, body, sendMutation, t]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title={t('messages.compose')}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>{t('messages.to')}</Text>
          {selectedUser ? (
            <Card style={styles.selectedUser}>
              <View style={styles.selectedUserRow}>
                <View>
                  <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
                  <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                </View>
                <Button
                  title={t('common.cancel')}
                  onPress={() => {
                    setSelectedUser(null);
                    setSearchQuery('');
                  }}
                  variant="ghost"
                  size="sm"
                />
              </View>
            </Card>
          ) : (
            <>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('common.search') + '...'}
                style={styles.searchBar}
              />
              {searchQuery.length >= 2 && !searching && searchResults && (
                <View style={styles.searchResults}>
                  {searchResults.length === 0 ? (
                    <Text style={styles.noResults}>No users found</Text>
                  ) : (
                    searchResults.slice(0, 5).map((user) => (
                      <Card
                        key={user.id}
                        style={styles.searchResultItem}
                        onPress={() => {
                          setSelectedUser(user);
                          setSearchQuery('');
                        }}
                      >
                        <Text style={styles.searchResultName}>{user.name}</Text>
                        <Text style={styles.searchResultEmail}>{user.email}</Text>
                      </Card>
                    ))
                  )}
                </View>
              )}
            </>
          )}
          {errors.receiver && <Text style={styles.error}>{errors.receiver}</Text>}
        </View>

        <Input
          label={t('messages.subject')}
          value={subject}
          onChangeText={setSubject}
          placeholder={t('messages.subject') + '...'}
          error={errors.subject}
        />

        <Input
          label={t('messages.body')}
          value={body}
          onChangeText={setBody}
          placeholder={t('messages.body') + '...'}
          multiline
          numberOfLines={8}
          error={errors.body}
        />

        <Button
          title={t('messages.send')}
          onPress={handleSend}
          loading={sendMutation.isPending}
          disabled={!selectedUser}
          icon={<Send size={16} color={colors.navy[900]} />}
          style={styles.sendButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  searchBar: {
    backgroundColor: colors.navy[800],
  },
  searchResults: {
    gap: 4,
  },
  searchResultItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  searchResultEmail: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  noResults: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  selectedUser: {
    paddingVertical: 12,
  },
  selectedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  selectedUserEmail: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  error: {
    fontSize: 12,
    color: colors.status.error,
  },
  sendButton: {
    marginTop: 8,
  },
});
