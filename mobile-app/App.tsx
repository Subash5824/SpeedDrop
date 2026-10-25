import './src/utils/polyfills';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, Text } from 'react-native';

// Import Icons using require
import { Ionicons as Icon } from '@expo/vector-icons';
type IoniconsName = React.ComponentProps<typeof Icon>['name'];

// Import Screens
import HomeScreen from './src/screens/HomeScreen';
import SenderScreen from './src/screens/SenderScreen';
import ReceiverScreen from './src/screens/ReceiverScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Import Constants
import { Colors } from './src/constants/colors';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: IoniconsName = 'home';
              
              if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
              else if (route.name === 'Send') iconName = focused ? 'send' : 'send-outline';
              else if (route.name === 'Receive') iconName = focused ? 'download' : 'download-outline';
              else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
              else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
              
              return <Icon name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textMuted,
            tabBarStyle: {
              backgroundColor: Colors.backgroundSecondary,
              borderTopColor: Colors.border,
              height: 60,
            },
            headerStyle: {
              backgroundColor: Colors.backgroundSecondary,
              borderBottomColor: Colors.border,
              borderBottomWidth: 1,
            },
            headerTitleStyle: {
              color: Colors.text,
              fontWeight: 'bold',
            },
            headerTintColor: Colors.primary,
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'SpeedDrop' }} />
          <Tab.Screen name="Send" component={SenderScreen} options={{ title: 'Send Files' }} />
          <Tab.Screen name="Receive" component={ReceiverScreen} options={{ title: 'Receive Files' }} />
          <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}