'use client';
import { useActionState } from 'react';
import { adminLogin } from '../actions/auth';

export default function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action}>
      {state && !state.ok && <div className="alert err">{state.message}</div>}
      <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required autoComplete="username" autoFocus /></div>
      <div className="field"><label htmlFor="password">Mot de passe</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
      <button className="btn" style={{ width: '100%', marginTop: 20, padding: 12 }} disabled={pending}>{pending ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  );
}
