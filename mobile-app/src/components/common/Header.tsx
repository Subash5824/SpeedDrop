import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { headerStyles } from '@/styles/components/common/Header.styles';
import { Colors } from '@/constants/colors';

import { Ionicons as Icon } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  onLeftPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
  sharerId?: string;
  sharerName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  sharerId,
  sharerName,
}) => {
  return (
    <View style={headerStyles.header}>
      <View style={headerStyles.left}>
        {leftIcon && (
          <TouchableOpacity onPress={onLeftPress}>
            <Icon name={leftIcon as any} size={24} color={Colors.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={headerStyles.title}>{title}</Text>
          {subtitle && <Text style={headerStyles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      <View style={headerStyles.right}>
        {sharerId && sharerName && (
          <View style={headerStyles.sharerInfo}>
            <Text style={headerStyles.sharerId}>{sharerId}</Text>
          </View>
        )}
        {rightIcon && (
          <TouchableOpacity onPress={onRightPress}>
            <Icon name={rightIcon as any} size={24} color={Colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};