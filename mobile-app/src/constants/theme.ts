import { Colors } from './colors';
import { Platform } from 'react-native';

export const Theme = {
  colors: Colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold' as const,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold' as const,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal' as const,
    },
    caption: {
      fontSize: 12,
      fontWeight: 'normal' as const,
    },
    small: {
      fontSize: 10,
      fontWeight: 'normal' as const,
    },
  },
  shadows: {
    sm: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
      // Web-compatible boxShadow
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    md: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
      // Web-compatible boxShadow
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    lg: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
      // Web-compatible boxShadow
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    },
  },
};

// Helper to get platform-specific shadow styles
export const getShadowStyle = (size: 'sm' | 'md' | 'lg') => {
  const shadow = Theme.shadows[size];
  if (Platform.OS === 'web') {
    return { boxShadow: shadow.boxShadow };
  }
  return {
    shadowColor: shadow.shadowColor,
    shadowOffset: shadow.shadowOffset,
    shadowOpacity: shadow.shadowOpacity,
    shadowRadius: shadow.shadowRadius,
    elevation: shadow.elevation,
  };
};