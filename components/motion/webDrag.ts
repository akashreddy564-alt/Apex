import { Platform, type ViewStyle } from 'react-native';

/**
 * Web only: CSS touch-action for a region inside a GestureDetector, so a drag
 * there does not scroll the page. Native views never get the prop.
 */
export const webNoScrollStyle: ViewStyle | null =
  Platform.OS === 'web' ? ({ touchAction: 'none' } as ViewStyle) : null;
