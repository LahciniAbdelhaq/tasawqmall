'use client';
import { useActionState, useState } from 'react';
import { saveSettings } from '@/app/admin/actions/settings';
import { SaveBar } from './ui';

/**
 * Generic settings form: holds one settings group as state and posts it as JSON.
 * `children(value, set)` renders the fields.
 */
export default function SettingsForm<T extends Record<string, unknown>>({ group, initial, children, onSaved, label }: {
  group: string;
  initial: T;
  children: (v: T, set: (patch: Partial<T>) => void) => React.ReactNode;
  onSaved?: () => void;
  label?: string;
}) {
  const [value, setValue] = useState<T>(initial);
  const [state, action] = useActionState(async (prev: Parameters<typeof saveSettings>[0], f: FormData) => {
    const r = await saveSettings(prev, f);
    if (r?.ok) onSaved?.();
    return r;
  }, null);
  return (
    <form action={action}>
      <input type="hidden" name="key" value={group} />
      <input type="hidden" name="value" value={JSON.stringify(value)} />
      {children(value, (patch) => setValue((v) => ({ ...v, ...patch })))}
      <SaveBar state={state} label={label} />
    </form>
  );
}
