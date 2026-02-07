import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = React.useState(true);
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Notifications */}
      <View className="mt-6 px-6">
        <Text className="text-sm font-medium text-gray-500 uppercase mb-2">
          Notifications
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-gray-900">Push Notifications</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: '#e5e7eb', true: '#d946ef' }}
              thumbColor="white"
            />
          </View>
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="mail-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-gray-900">Email Notifications</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#e5e7eb', true: '#d946ef' }}
              thumbColor="white"
            />
          </View>
        </View>
      </View>

      {/* Appearance */}
      <View className="mt-6 px-6">
        <Text className="text-sm font-medium text-gray-500 uppercase mb-2">
          Appearance
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden">
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="moon-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-gray-900">Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#e5e7eb', true: '#d946ef' }}
              thumbColor="white"
            />
          </View>
        </View>
      </View>

      {/* Account */}
      <View className="mt-6 px-6">
        <Text className="text-sm font-medium text-gray-500 uppercase mb-2">
          Account
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden">
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="key-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-gray-900">Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-gray-900">Privacy Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View className="mt-6 px-6 mb-8">
        <Text className="text-sm font-medium text-gray-500 uppercase mb-2">
          About
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden">
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-gray-900">About PMS</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="code-outline" size={20} color="#6b7280" />
              <Text className="ml-3 text-gray-900">Version</Text>
            </View>
            <Text className="text-gray-500">1.0.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
