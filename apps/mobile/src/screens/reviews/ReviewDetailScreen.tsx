import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { reviewsApi } from '../../lib/api';

export default function ReviewDetailScreen() {
  const route = useRoute<any>();
  const { reviewId } = route.params;

  const { data: review, isLoading } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => reviewsApi.get(reviewId),
  });

  if (isLoading || !review?.data) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#d946ef" />
      </View>
    );
  }

  const r = review.data;

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">
          {r.cycle?.name || 'Performance Review'}
        </Text>
        <Text className="text-gray-500 mt-1">
          {r.reviewee?.firstName} {r.reviewee?.lastName}
        </Text>
        <View className="flex-row items-center mt-4">
          <View className="px-3 py-1 rounded-full bg-primary-100">
            <Text className="text-primary-700 font-medium">{r.status}</Text>
          </View>
        </View>
      </View>

      <View className="p-6">
        <View className="flex-row items-center mb-4">
          <Ionicons name="calendar-outline" size={20} color="#6b7280" />
          <View className="ml-3">
            <Text className="text-gray-500 text-sm">Due Date</Text>
            <Text className="text-gray-900 font-medium">
              {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'Not set'}
            </Text>
          </View>
        </View>

        {r.status === 'COMPLETED' && r.overallRating && (
          <View className="bg-primary-50 rounded-xl p-4 mb-4">
            <Text className="text-primary-700 font-medium text-center">
              Overall Rating
            </Text>
            <Text className="text-4xl font-bold text-primary-600 text-center mt-2">
              {r.overallRating}/5
            </Text>
          </View>
        )}

        {r.comments && (
          <View className="mt-4">
            <Text className="text-lg font-semibold text-gray-900 mb-2">Comments</Text>
            <Text className="text-gray-700">{r.comments}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
