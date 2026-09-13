import { Tabs } from 'expo-router';
import { Footprints, ListOrdered, Mountain } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#09090B' },
        headerTintColor: '#F4F4F5',
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#09090B',
          borderTopColor: '#27272A',
          borderTopWidth: 1,
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#8B9A6D',
        tabBarInactiveTintColor: '#71717A',
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'monospace',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
        sceneStyle: { backgroundColor: '#09090B' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trails',
          tabBarIcon: ({ color }) => (
            <Mountain size={20} strokeWidth={1.6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color }) => (
            <Footprints size={20} strokeWidth={1.6} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rankings"
        options={{
          title: 'Rankings',
          tabBarIcon: ({ color }) => (
            <ListOrdered size={20} strokeWidth={1.6} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
