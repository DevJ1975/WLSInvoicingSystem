import { Image } from 'react-native';

export function Logo({ width = 160 }: { width?: number }) {
  // Logo aspect ratio is ~372x216.
  const height = Math.round((width * 216) / 372);
  return (
    <Image
      source={require('../../assets/wls-logo.png')}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="Workplace Learning System"
    />
  );
}
