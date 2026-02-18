import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '../../src/lib/constants';

// Simple icon component using text (avoids dependency on icon library)
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    tickets: '📋',
    clock: '⏰',
    profile: '👤',
  };
  return (
    <>{/* Using text for now; swap for vector icons when ready */}</>
  );
}

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
          title: 'My Day',
          headerTitle: 'GleamOps',
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          headerTitle: 'My Schedule',
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: 'Work',
          headerTitle: 'Work Execution',
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
        name="sync-inbox"
        options={{
          title: 'Sync',
          headerTitle: 'Sync Inbox',
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
