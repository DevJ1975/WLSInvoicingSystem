import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { COLORS } from '../lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  className = '',
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const base = 'flex-row items-center justify-center gap-2 rounded-xl px-4 py-3';
  const styles: Record<Variant, string> = {
    primary: 'bg-wls-red',
    secondary: 'bg-white border border-slate-300',
    ghost: 'bg-transparent',
  };
  const textStyles: Record<Variant, string> = {
    primary: 'text-white',
    secondary: 'text-wls-ink',
    ghost: 'text-wls-red',
  };
  const isOff = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      className={`${base} ${styles[variant]} ${isOff ? 'opacity-50' : ''} ${className}`}
    >
      {loading && (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : COLORS.red} />
      )}
      <Text className={`text-sm font-semibold ${textStyles[variant]}`}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</View>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <View className="mb-1">
      <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </Text>
      {children}
      {hint ? <Text className="mt-1 text-xs text-slate-400">{hint}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#94A3B8"
      {...props}
      className={`rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-wls-ink ${props.className ?? ''}`}
    />
  );
}

export function Spinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View className="items-center justify-center py-10">
      <ActivityIndicator size={size} color={COLORS.red} />
    </View>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="items-center px-6 py-12">
      <Text className="text-base font-semibold text-wls-ink">{title}</Text>
      {description ? (
        <Text className="mt-1 text-center text-sm text-slate-500">{description}</Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-slate-100',
    sent: 'bg-blue-100',
    paid: 'bg-green-100',
  };
  const textMap: Record<string, string> = {
    draft: 'text-slate-600',
    sent: 'text-blue-700',
    paid: 'text-green-700',
  };
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${map[status] ?? 'bg-slate-100'}`}>
      <Text className={`text-xs font-semibold capitalize ${textMap[status] ?? 'text-slate-600'}`}>
        {status}
      </Text>
    </View>
  );
}
