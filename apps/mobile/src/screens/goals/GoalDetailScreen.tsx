import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { goalsApi } from '../../lib/api';
import Slider from '@react-native-community/slider';

export default function GoalDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { goalId } = route.params;

  const [showProgressModal, setShowProgressModal] = useState(false);
  const [newProgress, setNewProgress] = useState(0);
  const [progressNote, setProgressNote] = useState('');

  const { data: goal, isLoading } = useQuery({
    queryKey: ['goal', goalId],
    queryFn: () => goalsApi.get(goalId),
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ progress, note }: { progress: number; note?: string }) =>
      goalsApi.updateProgress(goalId, progress, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowProgressModal(false);
      setProgressNote('');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update progress');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => goalsApi.delete(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete goal');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading || !goal?.data) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#d946ef" />
      </View>
    );
  }

  const g = goal.data;

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

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="p-6 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">{g.title}</Text>
          {g.description && (
            <Text className="text-gray-600 mt-2">{g.description}</Text>
          )}
          <View className="flex-row items-center mt-4 space-x-2">
            <View className={`px-3 py-1 rounded-full ${getStatusColor(g.status)}`}>
              <Text className="font-medium">{g.status.replace('_', ' ')}</Text>
            </View>
            <View className="px-3 py-1 rounded-full bg-gray-100">
              <Text className="text-gray-700 font-medium">{g.type}</Text>
            </View>
          </View>
        </View>

        {/* Progress */}
        <View className="p-6 border-b border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">Progress</Text>
            <TouchableOpacity
              onPress={() => {
                setNewProgress(g.progress);
                setShowProgressModal(true);
              }}
              className="bg-primary-100 px-4 py-2 rounded-full"
            >
              <Text className="text-primary-700 font-medium">Update</Text>
            </TouchableOpacity>
          </View>

          <View className="items-center">
            <View className="w-32 h-32 rounded-full border-8 border-primary-500 items-center justify-center">
              <Text className="text-3xl font-bold text-primary-600">{g.progress}%</Text>
            </View>
          </View>

          <View className="mt-4 bg-gray-100 rounded-full h-3 overflow-hidden">
            <View
              className="bg-primary-500 h-full rounded-full"
              style={{ width: `${g.progress}%` }}
            />
          </View>
        </View>

        {/* Details */}
        <View className="p-6 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Details</Text>

          <View className="space-y-4">
            {g.targetDate && (
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <View className="ml-3">
                  <Text className="text-gray-500 text-sm">Target Date</Text>
                  <Text className="text-gray-900 font-medium">
                    {new Date(g.targetDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <View className="ml-3">
                <Text className="text-gray-500 text-sm">Created</Text>
                <Text className="text-gray-900 font-medium">
                  {new Date(g.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {g.owner && (
              <View className="flex-row items-center">
                <Ionicons name="person-outline" size={20} color="#6b7280" />
                <View className="ml-3">
                  <Text className="text-gray-500 text-sm">Owner</Text>
                  <Text className="text-gray-900 font-medium">
                    {g.owner.firstName} {g.owner.lastName}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Key Results */}
        {g.keyResults && g.keyResults.length > 0 && (
          <View className="p-6 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Key Results
            </Text>
            <View className="space-y-3">
              {g.keyResults.map((kr: any, index: number) => (
                <View
                  key={kr.id || index}
                  className="bg-gray-50 rounded-xl p-4"
                >
                  <Text className="text-gray-900 font-medium">{kr.title}</Text>
                  <View className="mt-2">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-xs text-gray-500">
                        {kr.currentValue} / {kr.targetValue}
                      </Text>
                      <Text className="text-xs font-medium text-gray-700">
                        {Math.round((kr.currentValue / kr.targetValue) * 100)}%
                      </Text>
                    </View>
                    <View className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <View
                        className="bg-primary-500 h-full rounded-full"
                        style={{
                          width: `${Math.min((kr.currentValue / kr.targetValue) * 100, 100)}%`,
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View className="p-6">
          <TouchableOpacity
            onPress={handleDelete}
            className="flex-row items-center justify-center py-3"
          >
            <Ionicons name="trash-outline" size={20} color="#dc2626" />
            <Text className="text-danger-600 font-medium ml-2">Delete Goal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Progress Update Modal */}
      {showProgressModal && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 mx-6 w-full max-w-sm">
            <Text className="text-xl font-semibold text-gray-900 mb-6">
              Update Progress
            </Text>

            <Text className="text-center text-4xl font-bold text-primary-600 mb-4">
              {newProgress}%
            </Text>

            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={newProgress}
              onValueChange={setNewProgress}
              minimumTrackTintColor="#d946ef"
              maximumTrackTintColor="#e5e7eb"
              thumbTintColor="#d946ef"
            />

            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-4"
              placeholder="Add a note (optional)"
              placeholderTextColor="#9ca3af"
              value={progressNote}
              onChangeText={setProgressNote}
              multiline
              numberOfLines={3}
            />

            <View className="flex-row mt-6 space-x-3">
              <TouchableOpacity
                onPress={() => setShowProgressModal(false)}
                className="flex-1 border border-gray-200 rounded-xl py-3 items-center"
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  updateProgressMutation.mutate({
                    progress: newProgress,
                    note: progressNote || undefined,
                  })
                }
                disabled={updateProgressMutation.isPending}
                className="flex-1 bg-primary-500 rounded-xl py-3 items-center"
              >
                {updateProgressMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-medium">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
