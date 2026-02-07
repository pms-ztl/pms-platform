import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { goalsApi } from '../../lib/api';

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'NOT_STARTED', label: 'Not Started' },
];

export default function GoalsScreen() {
  const [statusFilter, setStatusFilter] = useState('all');
  const navigation = useNavigation<any>();

  const { data: goals, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['goals', statusFilter],
    queryFn: () => goalsApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-success-100 text-success-700';
      case 'IN_PROGRESS':
        return 'bg-primary-100 text-primary-700';
      case 'AT_RISK':
        return 'bg-danger-100 text-danger-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const renderGoal = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('GoalDetail', { goalId: item.id })}
      className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-base" numberOfLines={2}>
            {item.title}
          </Text>
          {item.description && (
            <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>

      <View className="mt-3">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-xs text-gray-500">Progress</Text>
          <Text className="text-xs font-medium text-gray-700">{item.progress}%</Text>
        </View>
        <View className="bg-gray-100 rounded-full h-2 overflow-hidden">
          <View
            className="bg-primary-500 h-full rounded-full"
            style={{ width: `${item.progress}%` }}
          />
        </View>
      </View>

      <View className="flex-row items-center mt-3 space-x-2">
        <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
          <Text className="text-xs font-medium">{item.status.replace('_', ' ')}</Text>
        </View>
        {item.targetDate && (
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={12} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-1">
              {new Date(item.targetDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-6 pt-4 pb-2 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Goals</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateGoal')}
            className="bg-primary-500 rounded-full p-2"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <View className="flex-row mt-4 pb-4">
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={statusFilters}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setStatusFilter(item.key)}
                className={`mr-2 px-4 py-2 rounded-full ${
                  statusFilter === item.key
                    ? 'bg-primary-500'
                    : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-medium ${
                    statusFilter === item.key ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* Goals List */}
      <FlatList
        data={goals?.data?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderGoal}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-12">
              <Ionicons name="flag-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-500 mt-4 text-center">
                No goals found.{'\n'}Create your first goal to get started!
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateGoal')}
                className="mt-4 bg-primary-500 px-6 py-3 rounded-full"
              >
                <Text className="text-white font-medium">Create Goal</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
