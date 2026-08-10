import { Pressable, Text, View } from 'react-native';
import { PIN_LENGTH } from '../lib/pin';

// On-screen numeric keypad + filled-dot indicator. Uses its own buttons rather
// than the OS keyboard so it looks and behaves identically on web, iOS, and
// Android and never exposes the PIN to autofill/keyboards.
export function PinPad({
  value,
  onChange,
  onComplete,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
}) {
  function press(digit: string) {
    if (disabled || value.length >= PIN_LENGTH) return;
    const next = value + digit;
    onChange(next);
    if (next.length === PIN_LENGTH) onComplete?.(next);
  }

  function backspace() {
    if (disabled || value.length === 0) return;
    onChange(value.slice(0, -1));
  }

  return (
    <View className="items-center">
      <View className="mb-8 flex-row gap-4">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            className={`h-4 w-4 rounded-full border-2 ${
              i < value.length ? 'border-wls-red bg-wls-red' : 'border-slate-300'
            }`}
          />
        ))}
      </View>

      <View className="w-72 flex-row flex-wrap justify-between gap-y-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <Key key={k} label={k} onPress={() => press(k)} disabled={disabled} />
        ))}
        <View className="h-16 w-16" />
        <Key label="0" onPress={() => press('0')} disabled={disabled} />
        <Key
          label="⌫"
          onPress={backspace}
          disabled={disabled || value.length === 0}
          muted
        />
      </View>
    </View>
  );
}

function Key({
  label,
  onPress,
  disabled,
  muted = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label === '⌫' ? 'Delete' : label}
      className={`h-16 w-16 items-center justify-center rounded-full ${
        muted ? '' : 'bg-slate-100'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Text
        className={`text-2xl ${muted ? 'text-slate-400' : 'font-semibold text-wls-ink'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
