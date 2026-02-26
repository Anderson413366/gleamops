import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '../../src/lib/constants';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.textSecondary,
        tabBarStyle: {
          borderTopColor: Colors.light.border,
          backgroundColor: Colors.light.background,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.light.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          headerTitle: 'GleamOps',
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          headerTitle: 'Work Tickets',
        }}
      />
      <Tabs.Screen
        name="inspections"
        options={{
          title: 'Inspect',
          headerTitle: 'Inspections',
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Route',
          headerTitle: 'Tonight\'s Route',
        }}
      />
      <Tabs.Screen
        name="clock"
        options={{
          title: 'Clock',
          headerTitle: 'Time Clock',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}
