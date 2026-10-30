import './utils/polyfills';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Platform } from 'react-native';

import { Ionicons as Icon } from '@expo/vector-icons';

// Import Screens
import HomeScreen from './screens/HomeScreen';
import SenderScreen from './screens/SenderScreen';
import ReceiverScreen from './screens/ReceiverScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';

// Import Constants
import { Colors } from './constants/colors';

// Import Offline & Error Shielding
import ErrorBoundary from './components/common/ErrorBoundary';
import { NetworkProvider } from './context/NetworkContext';
import OfflineBanner from './components/common/OfflineBanner';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <ErrorBoundary>
      <NetworkProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
          <OfflineBanner />
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }): React.ReactElement => {
                  const icons: Record<string, [any, any]> = {
                    Home: ['home', 'home-outline'],
                    Send: ['send', 'send-outline'],
                    Receive: ['download', 'download-outline'],
                    History: ['time', 'time-outline'],
                    Settings: ['settings', 'settings-outline'],
                  };
                  const [focusedIcon, unfocusedIcon] = icons[route.name] || ['apps-outline', 'apps-outline'];
                  const iconName = focused ? focusedIcon : unfocusedIcon;
                  // @ts-ignore
                  return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarStyle: {
                  backgroundColor: Colors.backgroundSecondary,
                  borderTopColor: Colors.border,
                  paddingBottom: 5,
                  paddingTop: 5,
                  height: 60,
                  borderTopWidth: 1,
                },
                tabBarLabelStyle: {
                  fontSize: 11,
                  fontWeight: '500',
                },
                headerStyle: {
                  backgroundColor: Colors.backgroundSecondary,
                  borderBottomColor: Colors.border,
                  borderBottomWidth: 1,
                  elevation: 0,
                  ...(Platform.OS === 'web' ? { boxShadow: 'none' } : { shadowOpacity: 0 }),
                },
                headerTitleStyle: {
                  color: Colors.text,
                  fontWeight: 'bold',
                  fontSize: 18,
                },
                headerTintColor: Colors.primary,
                headerTitleAlign: 'center',
              })}
            >
              <Tab.Screen 
                name="Home" 
                component={HomeScreen} 
                options={{ title: 'SpeedDrop' }}
              />
              <Tab.Screen 
                name="Send" 
                component={SenderScreen} 
                options={{ title: 'Send Files' }}
              />
              <Tab.Screen 
                name="Receive" 
                component={ReceiverScreen} 
                options={{ title: 'Receive Files' }}
              />
              <Tab.Screen 
                name="History" 
                component={HistoryScreen} 
                options={{ title: 'History' }}
              />
              <Tab.Screen 
                name="Settings" 
                component={SettingsScreen} 
                options={{ title: 'Settings' }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
