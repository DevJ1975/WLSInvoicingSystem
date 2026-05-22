import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';

// A bottom-sheet style modal used for create/edit forms.
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="max-h-[88vh] rounded-t-3xl bg-white">
            <View className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
              <Text className="text-base font-semibold text-wls-ink">{title}</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text className="text-2xl leading-none text-slate-400">×</Text>
              </Pressable>
            </View>
            <ScrollView className="px-5" contentContainerStyle={{ paddingVertical: 16 }}>
              {children}
            </ScrollView>
            {footer ? (
              <View className="flex-row justify-end gap-3 border-t border-slate-200 px-5 py-3">
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
