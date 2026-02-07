import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { feedbackApi } from '../../lib/api';

export default function FeedbackScreen() {
  const [tab, setTab] = useState<'received' | 'given'>('received');
  const navigation = useNavigation<any>();

  const { data: feedback, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feedback', tab],
    queryFn: () => feedbackApi.list({ type: tab }),
  });

  const renderFeedback = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('FeedbackDetail', { feedbackId: item.id })}
      className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
    >
      <View className="flex-row items-start">
        <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
          <Ionicons name="person" size={20} color="#d946ef" />
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-semibold text-gray-900">
            {tab === 'received'
              ? item.isAnonymous
                ? 'Anonymous'
                : `${item.giver?.firstName} ${item.giver?.lastName}`
              : `${item.recipient?.firstName} ${item.recipient?.lastName}`}
          </Text>
          <Text className="text-gray-600 text-sm mt-1" numberOfLines={2}>
            {item.content}
          </Text>
          <Text className="text-gray-400 text-xs mt-2">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-4 pb-2 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Feedback</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('GiveFeedback')}
            className="bg-primary-500 rounded-full p-2"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="flex-row mt-4 pb-4 border-b border-gray-100">
          <TouchableOpacity
            onPress={() => setTab('received')}
            className={`flex-1 py-2 ${tab === 'received' ? 'border-b-2 border-primary-500' : ''}`}
          >
            <Text className={`text-center font-medium ${tab === 'received' ? 'text-primary-600' : 'text-gray-500'}`}>
              Received
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('given')}
            className={`flex-1 py-2 ${tab === 'given' ? 'border-b-2 border-primary-500' : ''}`}
          >
            <Text className={`text-center font-medium ${tab === 'given' ? 'text-primary-600' : 'text-gray-500'}`}>
              Given
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={feedback?.data?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedback}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-12">
              <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-500 mt-4">No feedback yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
