import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { goalsApi } from '../../lib/api';

const goalTypes = [
  { key: 'INDIVIDUAL', label: 'Individual', icon: 'person-outline' },
  { key: 'TEAM', label: 'Team', icon: 'people-outline' },
  { key: 'DEPARTMENT', label: 'Department', icon: 'business-outline' },
  { key: 'COMPANY', label: 'Company', icon: 'globe-outline' },
];

export default function CreateGoalScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const parentId = route.params?.parentId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('INDIVIDUAL');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      type: string;
      targetDate?: string;
      parentId?: string;
    }) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create goal');
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      targetDate: targetDate?.toISOString(),
      parentId,
    });
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 p-6">
        {/* Title */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Goal Title <Text className="text-danger-500">*</Text>
          </Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder="What do you want to achieve?"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Description
          </Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            placeholder="Add more details about this goal"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Type */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Goal Type</Text>
          <View className="flex-row flex-wrap">
            {goalTypes.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setType(item.key)}
                className={`mr-2 mb-2 px-4 py-3 rounded-xl flex-row items-center ${
                  type === item.key
                    ? 'bg-primary-500'
                    : 'bg-gray-100 border border-gray-200'
                }`}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={type === item.key ? 'white' : '#6b7280'}
                />
                <Text
                  className={`ml-2 font-medium ${
                    type === item.key ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Target Date */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Target Date
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center"
          >
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            <Text className={`ml-3 ${targetDate ? 'text-gray-900' : 'text-gray-400'}`}>
              {targetDate ? targetDate.toLocaleDateString() : 'Select a date'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={targetDate || new Date()}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setTargetDate(selectedDate);
                }
              }}
            />
          )}
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
            <Text className="text-white font-semibold text-base">Create Goal</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
