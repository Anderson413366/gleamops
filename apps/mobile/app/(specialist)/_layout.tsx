import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '../../src/lib/constants';

export default function SpecialistLayout() {
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
        name="my-sites"
        options={{
          title: 'My Sites',
          headerTitle: 'My Sites',
        }}
      />
      <Tabs.Screen
        name="quick-report"
        options={{
          title: 'Quick Report',
          headerTitle: 'Quick Report',
        }}
      />
      <Tabs.Screen
        name="[siteId]/procedures"
        options={{
          href: null,
          title: 'Procedures',
          headerTitle: 'Cleaning Procedures',
        }}
      />
    </Tabs>
  );
}

