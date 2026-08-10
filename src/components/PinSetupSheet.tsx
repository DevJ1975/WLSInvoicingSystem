import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Sheet } from './Sheet';
import { PinPad } from './PinPad';
import { clearPin, setPin as savePin, verifyPin } from '../lib/pin';

export type PinFlow = 'set' | 'change' | 'off';

type Step = 'current' | 'new' | 'confirm';

const TITLES: Record<PinFlow, string> = {
  set: 'Turn on PIN',
  change: 'Change PIN',
  off: 'Turn off PIN',
};

// Guided PIN entry used from Settings. `set` chooses + confirms a new PIN;
// `change` verifies the current PIN then chooses a new one; `off` verifies the
// current PIN then removes it.
export function PinSetupSheet({
  visible,
  flow,
  uid,
  onClose,
  onDone,
}: {
  visible: boolean;
  flow: PinFlow;
  uid: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [step, setStep] = useState<Step>('new');
  const [entry, setEntry] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset the flow each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setStep(flow === 'set' ? 'new' : 'current');
    setEntry('');
    setFirstPin('');
    setError('');
    setBusy(false);
  }, [visible, flow]);

  const prompt =
    step === 'current'
      ? 'Enter your current PIN'
      : step === 'confirm'
        ? 'Re-enter to confirm'
        : flow === 'set'
          ? 'Choose a 4-digit PIN'
          : 'Enter a new 4-digit PIN';

  async function handleComplete(pin: string) {
    setError('');

    if (step === 'current') {
      setBusy(true);
      const ok = await verifyPin(uid, pin);
      setBusy(false);
      setEntry('');
      if (!ok) {
        setError('Incorrect PIN.');
        return;
      }
      if (flow === 'off') {
        setBusy(true);
        await clearPin(uid);
        setBusy(false);
        onDone('App PIN turned off.');
        return;
      }
      setStep('new');
      return;
    }

    if (step === 'new') {
      setFirstPin(pin);
      setEntry('');
      setStep('confirm');
      return;
    }

    // step === 'confirm'
    if (pin !== firstPin) {
      setEntry('');
      setFirstPin('');
      setStep('new');
      setError('PINs did not match. Start again.');
      return;
    }
    setBusy(true);
    await savePin(uid, pin);
    setBusy(false);
    onDone(flow === 'change' ? 'PIN changed.' : 'App PIN turned on.');
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={TITLES[flow]}>
      <View className="items-center py-2">
        <Text className="mb-6 text-sm text-slate-500">{prompt}</Text>
        <PinPad value={entry} onChange={setEntry} onComplete={handleComplete} disabled={busy} />
        {error ? <Text className="mt-4 text-sm text-wls-red">{error}</Text> : null}
      </View>
    </Sheet>
  );
}
