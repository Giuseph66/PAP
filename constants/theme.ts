/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Cores com melhor contraste AA
const tintColorLight = '#0A66C2'; // azul com bom contraste
const tintColorDark = '#4FC3F7';

export const Colors = {
  light: {
    text: '#0B0F14',
    textSecondary: '#6B7280',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#3E505F',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,
    // adiciona border para melhor contraste de divisórias
    // @ts-ignore
    border: '#E5E7EB',
  },
  dark: {
    text: '#E7EDF3',
    textSecondary: '#9CA3AF',
    background: '#0F141A',
    tint: tintColorDark,
    icon: '#B0BAC5',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorDark,
    // @ts-ignore
    border: '#27323D',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
