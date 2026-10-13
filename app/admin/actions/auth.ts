'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { clearAdminSession, requireAdmin, setAdminSession } from '@/lib/auth';
import { fail, ok, str, type Result } from '@/lib/form';

export async function adminLogin(_: Result, f: FormData): Promise<Result> {
  const email = str(f, 'email').toLowerCase();
  const user = await db.adminUser.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(str(f, 'password'), user.passwordHash))) return fail('Identifiants incorrects.');
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setAdminSession(user.id);
  redirect('/admin');
}

export async function adminLogout() {
  await clearAdminSession();
  redirect('/admin/login');
}

export async function changePassword(_: Result, f: FormData): Promise<Result> {
  const me = await requireAdmin();
  if (!(await bcrypt.compare(str(f, 'current'), me.passwordHash))) return fail('Mot de passe actuel incorrect.');
  const next = str(f, 'next');
  if (next.length < 8) return fail('Le nouveau mot de passe doit contenir au moins 8 caractères.');
  if (next !== str(f, 'confirm')) return fail('Les deux mots de passe ne correspondent pas.');
  await db.adminUser.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return ok('Mot de passe modifié.');
}

export async function saveAdminUser(_: Result, f: FormData): Promise<Result> {
  const me = await requireAdmin();
  if (me.role !== 'admin') return fail('Seul un administrateur peut gérer les comptes.');
  const email = str(f, 'email').toLowerCase();
  const name = str(f, 'name');
  const password = str(f, 'password');
  const role = str(f, 'role') === 'editor' ? 'editor' : 'admin';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) return fail('Nom et e-mail valides obligatoires.');
  if (password.length < 8) return fail('Mot de passe : 8 caractères minimum.');
  if (await db.adminUser.findUnique({ where: { email } })) return fail('Un compte existe déjà avec cet e-mail.');
  await db.adminUser.create({ data: { email, name, role, passwordHash: await bcrypt.hash(password, 10) } });
  return ok('Compte créé.');
}

export async function deleteAdminUser(f: FormData) {
  const me = await requireAdmin();
  const id = Number(f.get('id'));
  if (me.role !== 'admin' || id === me.id) return;
  await db.adminUser.delete({ where: { id } });
}
