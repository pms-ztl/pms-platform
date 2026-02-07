import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../../lib/api';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'GOAL':
        return 'flag-outline';
      case 'REVIEW':
        return 'clipboard-outline';
      case 'FEEDBACK':
        return 'chatbubble-outline';
      default:
        return 'notifications-outline';
    }
  };

  const renderNotification = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => markAsReadMutation.mutate(item.id)}
      className={`p-4 border-b border-gray-100 ${item.read ? 'bg-white' : 'bg-primary-50'}`}
    >
      <View className="flex-row">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center ${
            item.read ? 'bg-gray-100' : 'bg-primary-100'
          }`}
        >
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={20}
            color={item.read ? '#6b7280' : '#d946ef'}
          />
        </View>
        <View className="flex-1 ml-3">
          <Text className={`font-medium ${item.read ? 'text-gray-700' : 'text-gray-900'}`}>
            {item.title}
          </Text>
          <Text className="text-gray-500 text-sm mt-1">{item.message}</Text>
          <Text className="text-gray-400 text-xs mt-2">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        {!item.read && (
          <View className="w-2 h-2 bg-primary-500 rounded-full mt-2" />
        )}
      </View>
    </TouchableOpacity>
  );

  const unreadCount = notifications?.data?.filter((n: any) => !n.read).length || 0;

  return (
    <View className="flex-1 bg-white">
      {unreadCount > 0 && (
        <View className="flex-row items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
          <Text className="text-gray-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={() => markAllAsReadMutation.mutate()}>
            <Text className="text-primary-600 font-medium">Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-12">
              <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-500 mt-4">No notifications</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
