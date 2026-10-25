import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { cardStyles } from '@/styles/components/common/Card.styles';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  elevated?: boolean;
  noPadding?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  rightAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  elevated = false,
  noPadding = false,
  style,
  titleStyle,
  rightAction,
}) => {
  const cardStyle = [
    cardStyles.card,
    elevated && cardStyles.elevated,
    noPadding && cardStyles.noPadding,
    style,
  ];

  return (
    <View style={cardStyle}>
      {title && (
        <View style={cardStyles.titleWithAction}>
          <Text style={[cardStyles.title, titleStyle]}>{title}</Text>
          {rightAction && rightAction}
        </View>
      )}
      {children}
    </View>
  );
};