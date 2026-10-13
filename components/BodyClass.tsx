'use client';
import { useLayoutEffect } from 'react';

/**
 * WordPress styles key off body classes (home, single-product, archive, …). The root
 * layout can't know them, so each page declares its own: an inline script applies them
 * before first paint, and the effect keeps them right on client-side navigation.
 */
export default function BodyClass({ value }: { value: string }) {
  useLayoutEffect(() => {
    document.body.className = value;
  }, [value]);
  return <script dangerouslySetInnerHTML={{ __html: `document.body.className=${JSON.stringify(value)}` }} />;
}
