import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { reviewsApi } from '../../lib/api';

export default function ReviewsScreen() {
  const navigation = useNavigation<any>();

  const { data: reviews, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => reviewsApi.list(),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-success-100 text-success-700';
      case 'IN_PROGRESS':
        return 'bg-primary-100 text-primary-700';
      case 'PENDING':
        return 'bg-warning-100 text-warning-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const renderReview = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ReviewDetail', { reviewId: item.id })}
      className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-base">
            {item.cycle?.name || 'Performance Review'}
          </Text>
          <Text className="text-gray-500 text-sm mt-1">
            {item.reviewee?.firstName} {item.reviewee?.lastName}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>

      <View className="flex-row items-center mt-3 space-x-2">
        <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
          <Text className="text-xs font-medium">{item.status}</Text>
        </View>
        {item.dueDate && (
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={12} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">
              Due {new Date(item.dueDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-4 pb-2 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Reviews</Text>
      </View>

      <FlatList
        data={reviews?.data?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-12">
              <Ionicons name="clipboard-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-500 mt-4">No reviews found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
