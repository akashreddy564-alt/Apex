import { WebView } from 'react-native-webview';

export interface FlyoverViewProps {
  html: string;
  onMessage: (data: string) => void;
}

/**
 * The flyover page in a WebView. The base URL gives the page an https origin,
 * so a Mapbox token restricted to URLs can allow it (docs/security.md).
 */
export function FlyoverView({ html, onMessage }: FlyoverViewProps) {
  return (
    <WebView
      source={{ html, baseUrl: 'https://flyover.apex.app/' }}
      originWhitelist={['*']}
      onMessage={(event) => onMessage(event.nativeEvent.data)}
      style={{ flex: 1, backgroundColor: '#09090B' }}
      containerStyle={{ backgroundColor: '#09090B' }}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      webviewDebuggingEnabled={__DEV__}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
