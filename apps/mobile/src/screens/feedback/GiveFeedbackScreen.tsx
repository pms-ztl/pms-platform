import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { feedbackApi } from '../../lib/api';

const feedbackTypes = [
  { key: 'PRAISE', label: 'Praise', icon: 'heart-outline', color: '#22c55e' },
  { key: 'CONSTRUCTIVE', label: 'Constructive', icon: 'bulb-outline', color: '#f59e0b' },
  { key: 'SUGGESTION', label: 'Suggestion', icon: 'chatbubble-outline', color: '#3b82f6' },
];

export default function GiveFeedbackScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [recipientId, setRecipientId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [type, setType] = useState('PRAISE');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: {
      recipientId: string;
      type: string;
      content: string;
      isAnonymous: boolean;
    }) => feedbackApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to send feedback');
    },
  });

  const handleSubmit = () => {
    if (!recipientId || !content.trim()) {
      Alert.alert('Error', 'Please select a recipient and enter your feedback');
      return;
    }

    createMutation.mutate({
      recipientId,
      type,
      content: content.trim(),
      isAnonymous,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 p-6">
        {/* Recipient */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            To <Text className="text-danger-500">*</Text>
          </Text>
          <TouchableOpacity
            onPress={() => {
              // Open user picker modal
              Alert.alert('Select Recipient', 'User picker would open here');
            }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center"
          >
            <Ionicons name="person-outline" size={20} color="#6b7280" />
            <Text className={`ml-3 ${recipientName ? 'text-gray-900' : 'text-gray-400'}`}>
              {recipientName || 'Select a person'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feedback Type */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Type</Text>
          <View className="flex-row space-x-2">
            {feedbackTypes.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setType(item.key)}
                className={`flex-1 p-3 rounded-xl items-center ${
                  type === item.key
                    ? 'bg-primary-50 border-2 border-primary-500'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color={type === item.key ? '#d946ef' : item.color}
                />
                <Text
                  className={`mt-1 text-sm font-medium ${
                    type === item.key ? 'text-primary-700' : 'text-gray-700'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Your Feedback <Text className="text-danger-500">*</Text>
          </Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[150px]"
            placeholder="Share your thoughts..."
            placeholderTextColor="#9ca3af"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Anonymous Toggle */}
        <View className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4">
          <View className="flex-row items-center">
            <Ionicons
              name={isAnonymous ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color="#6b7280"
            />
            <View className="ml-3">
              <Text className="font-medium text-gray-900">Send Anonymously</Text>
              <Text className="text-gray-500 text-sm">
                Your identity will be hidden
              </Text>
            </View>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#e5e7eb', true: '#d946ef' }}
            thumbColor="white"
          />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View className="p-6 border-t border-gray-100">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-primary-500 rounded-xl py-4 items-center"
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Send Feedback</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
