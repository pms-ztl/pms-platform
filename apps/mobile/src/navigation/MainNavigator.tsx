import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import GoalsScreen from '../screens/goals/GoalsScreen';
import GoalDetailScreen from '../screens/goals/GoalDetailScreen';
import CreateGoalScreen from '../screens/goals/CreateGoalScreen';
import ReviewsScreen from '../screens/reviews/ReviewsScreen';
import ReviewDetailScreen from '../screens/reviews/ReviewDetailScreen';
import FeedbackScreen from '../screens/feedback/FeedbackScreen';
import GiveFeedbackScreen from '../screens/feedback/GiveFeedbackScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  GoalsTab: undefined;
  ReviewsTab: undefined;
  FeedbackTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Notifications: undefined;
};

export type GoalsStackParamList = {
  Goals: undefined;
  GoalDetail: { goalId: string };
  CreateGoal: { parentId?: string };
};

export type ReviewsStackParamList = {
  Reviews: undefined;
  ReviewDetail: { reviewId: string };
};

export type FeedbackStackParamList = {
  Feedback: undefined;
  GiveFeedback: { recipientId?: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const GoalsStack = createNativeStackNavigator<GoalsStackParamList>();
const ReviewsStack = createNativeStackNavigator<ReviewsStackParamList>();
const FeedbackStack = createNativeStackNavigator<FeedbackStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </HomeStack.Navigator>
  );
}

function GoalsStackNavigator() {
  return (
    <GoalsStack.Navigator>
      <GoalsStack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ headerShown: false }}
      />
      <GoalsStack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{ title: 'Goal Details' }}
      />
      <GoalsStack.Screen
        name="CreateGoal"
        component={CreateGoalScreen}
        options={{ title: 'New Goal', presentation: 'modal' }}
      />
    </GoalsStack.Navigator>
  );
}

function ReviewsStackNavigator() {
  return (
    <ReviewsStack.Navigator>
      <ReviewsStack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ headerShown: false }}
      />
      <ReviewsStack.Screen
        name="ReviewDetail"
        component={ReviewDetailScreen}
        options={{ title: 'Review' }}
      />
    </ReviewsStack.Navigator>
  );
}

function FeedbackStackNavigator() {
  return (
    <FeedbackStack.Navigator>
      <FeedbackStack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ headerShown: false }}
      />
      <FeedbackStack.Screen
        name="GiveFeedback"
        component={GiveFeedbackScreen}
        options={{ title: 'Give Feedback', presentation: 'modal' }}
      />
    </FeedbackStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </ProfileStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'GoalsTab':
              iconName = focused ? 'flag' : 'flag-outline';
              break;
            case 'ReviewsTab':
              iconName = focused ? 'clipboard' : 'clipboard-outline';
              break;
            case 'FeedbackTab':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#d946ef',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="GoalsTab"
        component={GoalsStackNavigator}
        options={{ tabBarLabel: 'Goals' }}
      />
      <Tab.Screen
        name="ReviewsTab"
        component={ReviewsStackNavigator}
        options={{ tabBarLabel: 'Reviews' }}
      />
      <Tab.Screen
        name="FeedbackTab"
        component={FeedbackStackNavigator}
        options={{ tabBarLabel: 'Feedback' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
