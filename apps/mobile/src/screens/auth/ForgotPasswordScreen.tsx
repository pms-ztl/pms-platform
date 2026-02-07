import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigation = useNavigation();

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setIsSuccess(true);
    } catch (error) {
      // Still show success to prevent email enumeration
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 justify-center items-center">
          <View className="w-20 h-20 bg-success-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="checkmark" size={48} color="#22c55e" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            Check Your Email
          </Text>
          <Text className="text-gray-500 text-center mb-8">
            We've sent password reset instructions to {email}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-primary-500 rounded-xl py-4 px-8"
          >
            <Text className="text-white font-semibold">Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6">
          {/* Header */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="py-4"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View className="mt-8">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Forgot Password?
            </Text>
            <Text className="text-gray-500">
              Enter your email address and we'll send you instructions to reset
              your password.
            </Text>
          </View>

          {/* Form */}
          <View className="mt-8">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Email Address
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              className="bg-primary-500 rounded-xl py-4 items-center mt-6"
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Send Reset Instructions
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
