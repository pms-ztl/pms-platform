import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout, biometricEnabled, enableBiometric, disableBiometric } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleBiometricToggle = async () => {
    try {
      if (biometricEnabled) {
        await disableBiometric();
      } else {
        await enableBiometric();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const menuItems = [
    {
      icon: 'person-outline',
      label: 'Edit Profile',
      onPress: () => {},
    },
    {
      icon: 'notifications-outline',
      label: 'Notifications',
      onPress: () => navigation.navigate('HomeTab', { screen: 'Notifications' }),
    },
    {
      icon: 'settings-outline',
      label: 'Settings',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: 'finger-print',
      label: 'Biometric Login',
      onPress: handleBiometricToggle,
      rightElement: (
        <View className={`w-12 h-6 rounded-full ${biometricEnabled ? 'bg-primary-500' : 'bg-gray-300'}`}>
          <View className={`w-5 h-5 bg-white rounded-full mt-0.5 ${biometricEnabled ? 'ml-6' : 'ml-0.5'}`} />
        </View>
      ),
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => {},
    },
    {
      icon: 'document-text-outline',
      label: 'Terms & Privacy',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white p-6 items-center border-b border-gray-100">
          <View className="w-24 h-24 bg-primary-100 rounded-full items-center justify-center">
            <Text className="text-3xl font-bold text-primary-600">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900 mt-4">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-gray-500 mt-1">{user?.email}</Text>
          <View className="bg-primary-100 px-3 py-1 rounded-full mt-2">
            <Text className="text-primary-700 font-medium">{user?.role}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="mt-6 px-6">
          <View className="bg-white rounded-2xl overflow-hidden">
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.onPress}
                className={`flex-row items-center justify-between p-4 ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                    <Ionicons name={item.icon as any} size={20} color="#6b7280" />
                  </View>
                  <Text className="ml-3 text-gray-900 font-medium">{item.label}</Text>
                </View>
                {item.rightElement || (
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <View className="px-6 mt-6 mb-8">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white rounded-2xl p-4 flex-row items-center justify-center"
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            <Text className="ml-2 text-danger-600 font-medium">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text className="text-center text-gray-400 text-sm mb-8">Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
