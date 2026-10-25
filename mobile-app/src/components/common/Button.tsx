import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { buttonStyles } from '@/styles/components/common/Button.styles';
import { Colors } from '@/constants/colors';

import { Ionicons as Icon } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const getButtonStyle = () => {
    let variantStyle = {};
    switch (variant) {
      case 'primary':
        variantStyle = buttonStyles.primary;
        break;
      case 'secondary':
        variantStyle = buttonStyles.secondary;
        break;
      case 'danger':
        variantStyle = buttonStyles.danger;
        break;
      case 'success':
        variantStyle = buttonStyles.success;
        break;
      case 'outline':
        variantStyle = buttonStyles.outline;
        break;
    }
    
    let sizeStyle = {};
    switch (size) {
      case 'small':
        sizeStyle = buttonStyles.small;
        break;
      case 'large':
        sizeStyle = buttonStyles.large;
        break;
    }
    
    return [buttonStyles.button, variantStyle, sizeStyle, disabled && buttonStyles.disabled, style];
  };

  const getTextStyle = () => {
    let textVariantStyle = {};
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
        textVariantStyle = buttonStyles.textPrimary;
        break;
      case 'secondary':
      case 'outline':
        textVariantStyle = buttonStyles.textSecondary;
        break;
    }
    
    return [buttonStyles.text, textVariantStyle, textStyle];
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? Colors.primary : Colors.text} />
      ) : (
        <>
          {icon && <Icon name={icon as any} size={20} color={variant === 'outline' ? Colors.primary : Colors.text} />}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};