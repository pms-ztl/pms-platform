import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { goalsApi, reviewsApi, notificationsApi } from '../../lib/api';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const { data: goals, refetch: refetchGoals, isRefetching: isRefetchingGoals } = useQuery({
    queryKey: ['goals-summary'],
    queryFn: () => goalsApi.list({ status: 'IN_PROGRESS' }),
  });

  const { data: pendingReviews, refetch: refetchReviews, isRefetching: isRefetchingReviews } = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: () => reviewsApi.getPending(),
  });

  const { data: notifications, refetch: refetchNotifications, isRefetching: isRefetchingNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ unreadOnly: true }),
  });

  const isRefreshing = isRefetchingGoals || isRefetchingReviews || isRefetchingNotifications;

  const handleRefresh = () => {
    refetchGoals();
    refetchReviews();
    refetchNotifications();
  };

  const unreadCount = notifications?.data?.length || 0;
  const activeGoals = goals?.data?.data?.length || 0;
  const pendingReviewsCount = pendingReviews?.data?.length || 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6 bg-white">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-gray-500 text-sm">Welcome back,</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {user?.firstName} {user?.lastName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              className="relative p-2"
            >
              <Ionicons name="notifications-outline" size={28} color="#374151" />
              {unreadCount > 0 && (
                <View className="absolute top-1 right-1 bg-danger-500 rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="px-6 py-4">
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={() => navigation.navigate('GoalsTab')}
              className="flex-1 bg-primary-500 rounded-2xl p-4"
            >
              <Ionicons name="flag" size={24} color="white" />
              <Text className="text-white text-2xl font-bold mt-2">{activeGoals}</Text>
              <Text className="text-white/80 text-sm">Active Goals</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ReviewsTab')}
              className="flex-1 bg-warning-500 rounded-2xl p-4"
            >
              <Ionicons name="clipboard" size={24} color="white" />
              <Text className="text-white text-2xl font-bold mt-2">
                {pendingReviewsCount}
              </Text>
              <Text className="text-white/80 text-sm">Pending Reviews</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</Text>
          <View className="flex-row flex-wrap">
            <TouchableOpacity
              onPress={() => navigation.navigate('GoalsTab', { screen: 'CreateGoal' })}
              className="w-1/2 pr-2 mb-4"
            >
              <View className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center">
                <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
                  <Ionicons name="add" size={24} color="#d946ef" />
                </View>
                <Text className="ml-3 font-medium text-gray-900">New Goal</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('FeedbackTab', { screen: 'GiveFeedback' })}
              className="w-1/2 pl-2 mb-4"
            >
              <View className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center">
                <View className="w-10 h-10 bg-success-100 rounded-full items-center justify-center">
                  <Ionicons name="chatbubble" size={20} color="#22c55e" />
                </View>
                <Text className="ml-3 font-medium text-gray-900">Give Feedback</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ReviewsTab')}
              className="w-1/2 pr-2"
            >
              <View className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center">
                <View className="w-10 h-10 bg-warning-100 rounded-full items-center justify-center">
                  <Ionicons name="document-text" size={20} color="#f59e0b" />
                </View>
                <Text className="ml-3 font-medium text-gray-900">My Reviews</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileTab')}
              className="w-1/2 pl-2"
            >
              <View className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center">
                <View className="w-10 h-10 bg-secondary-100 rounded-full items-center justify-center">
                  <Ionicons name="person" size={20} color="#64748b" />
                </View>
                <Text className="ml-3 font-medium text-gray-900">Profile</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Goals */}
        {goals?.data?.data && goals.data.data.length > 0 && (
          <View className="px-6 py-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">Recent Goals</Text>
              <TouchableOpacity onPress={() => navigation.navigate('GoalsTab')}>
                <Text className="text-primary-600 font-medium">See All</Text>
              </TouchableOpacity>
            </View>
            <View className="space-y-3">
              {goals.data.data.slice(0, 3).map((goal: any) => (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() =>
                    navigation.navigate('GoalsTab', {
                      screen: 'GoalDetail',
                      params: { goalId: goal.id },
                    })
                  }
                  className="bg-white rounded-xl p-4 border border-gray-100"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900" numberOfLines={1}>
                        {goal.title}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        {goal.progress}% complete
                      </Text>
                    </View>
                    <View className="ml-4">
                      <View className="w-12 h-12 rounded-full border-4 border-primary-500 items-center justify-center">
                        <Text className="text-primary-600 font-bold text-sm">
                          {goal.progress}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <View
                      className="bg-primary-500 h-full rounded-full"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
