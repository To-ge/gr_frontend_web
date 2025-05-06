'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { apiHost } from '@/lib/environments';

type LoginFormInputs = {
  email: string;
  password: string;
};

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>();
  const router = useRouter();

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      const res = await fetch(`${apiHost}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('ログインに失敗しました');
      }

      router.push('/');
    } catch (error) {
      alert('ログインエラー');
    }
  };

  const guestLogin = () => {
    // ゲスト用アカウント情報
    const guestData = {
      email: process.env.NEXT_PUBLIC_GUEST_EMAIL || '',
      password: process.env.NEXT_PUBLIC_GUEST_PASSWORD || '',
    };

    onSubmit(guestData);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-200">
      <h1 className="text-3xl font-bold mb-6 text-gray-500">ログイン</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="w-80 space-y-4">
        <div>
          <label className="block mb-1 text-gray-400">Email</label>
          <input
            type="email"
            {...register('email', { required: 'Emailは必須です' })}
            className="w-full border border-gray-300 px-4 py-2 rounded text-black"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block mb-1 text-gray-400">Password</label>
          <input
            type="password"
            {...register('password', { required: 'Passwordは必須です' })}
            className="w-full border border-gray-300 px-4 py-2 rounded text-black"
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          ログイン
        </button>
      </form>

      {/* ゲストログインボタン */}
      <button
        onClick={guestLogin}
        className="mt-8 text-blue-500 hover:underline font-bold"
      >
        ゲストログイン
      </button>
    </div>
  );
}
