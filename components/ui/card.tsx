import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
  shadow?: boolean;
  borderRadius?: number;
}

export function Card({
  children,
  style,
  padding = 16,
  margin = 0,
  shadow = true,
  borderRadius = 12,
}: CardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const cardStyle: ViewStyle = {
    backgroundColor: colors.background,
    borderRadius,
    padding,
    margin,
    borderWidth: 1,
    borderColor: colors.border,
    ...style,
  };

  if (shadow) {
    Object.assign(cardStyle, {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    });
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}
