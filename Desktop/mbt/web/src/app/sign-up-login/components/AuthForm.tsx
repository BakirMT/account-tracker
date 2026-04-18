'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, BookOpen, TrendingUp, Shield, Users } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '@/lib/authContext';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { supabase } from '@/lib/supabase';


interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}



export default function AuthForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [publicStats, setPublicStats] = useState<null | {
    activeStudents: number;
    collectedThisMonth: number;
    transactions: number;
    monthLabel: string;
  }>(null);
  const router = useRouter();
  const { login } = useAuth();

  const loginForm = useForm<LoginFormData>({ defaultValues: { email: '', password: '', remember: false } });

  useEffect(() => {
    let cancelled = false;

    async function loadPublicStats() {
      try {
        const now = new Date();
        const monthLabel = now.toLocaleString('en-IN', { month: 'short' });
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const [studentsRes, txnsRes] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('transactions').select('type, amount, date, status').neq('status', 'voided'),
        ]);

        if (studentsRes.error || txnsRes.error) {
          if (!cancelled) setPublicStats(null);
          return;
        }

        const txns = (txnsRes.data ?? []) as Array<any>;
        const monthTxns = txns.filter(t => typeof t.date === 'string' && t.date.slice(0, 7) === monthKey);
        const collectedThisMonth = monthTxns
          .filter(t => t.type === 'income')
          .reduce((a, t) => a + (Number(t.amount) || 0), 0);

        if (!cancelled) {
          setPublicStats({
            activeStudents: studentsRes.count ?? 0,
            collectedThisMonth,
            transactions: txns.length,
            monthLabel,
          });
        }
      } catch {
        if (!cancelled) setPublicStats(null);
      }
    }

    loadPublicStats();
    return () => { cancelled = true; };
  }, []);

  const preparePassword = (pwd: string) => pwd.length < 6 ? pwd.padEnd(6, '_') : pwd;

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const finalPassword = preparePassword(data.password);
    const result = await login(data.email, finalPassword);
    
    // Auto-create Admin if missing in a fresh DB
    if (!result.success && data.email === 'admin@accounttracker.edu') {
      try {
        const { supabase } = await import('@/lib/supabase');
        // Try creating it if it doesn't exist
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: finalPassword,
        });
        
        if (!authError && authData.user) {
           await supabase.from('profiles').insert({
             id: authData.user.id,
             name: 'Admin',
             role: 'admin',
           });
           toast.success('Admin account auto-created in your new DB!');
           router.push('/dashboard');
           return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    setIsLoading(false);
    
    if (result.success) {
      toast.success('Welcome back! Redirecting...');
      router.push('/dashboard');
    } else {
      loginForm.setError('email', { message: result.error });
      toast.error(result.error ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Toaster position="bottom-right" richColors />

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 flex-col justify-between p-10 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-blue-400 translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">AccountTracker</p>
            <p className="text-blue-200 text-xs">Collage Finance Management</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Track every student account with precision
            </h1>
            <p className="text-blue-200 mt-3 text-sm leading-relaxed">
              Record income and expenses, monitor balances, and generate reports — all from one centralised dashboard built for school administrators.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: TrendingUp, text: 'Real-time balance tracking per student' },
              { icon: Shield, text: 'Role-based access: admin and student views' },
              { icon: Users, text: 'Auto-fill student details from student number' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={`feature-${i}`} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-blue-100 text-sm">{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats bar */}
        {publicStats && (
          <div className="relative flex gap-6">
            {[
              { value: String(publicStats.activeStudents), label: 'Active Students' },
              { value: publicStats.collectedThisMonth.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }), label: `Collected ${publicStats.monthLabel}` },
              { value: String(publicStats.transactions), label: 'Transactions' },
            ].map((s, i) => (
              <div key={`stat-${i}`}>
                <p className="font-bold text-white text-xl font-mono">{s.value}</p>
                <p className="text-blue-300 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <AppLogo size={32} />
            <span className="font-bold text-slate-800">AccountTracker</span>
          </div>

          <div className="mb-8">
            <div className="py-2 text-sm font-medium text-slate-900 bg-slate-100 rounded-lg text-center">
              Sign In
            </div>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
                <p className="text-sm text-slate-500 mt-1">Sign in to your AccountTracker account</p>
              </div>

              {/* Email */}
              <div>
                <label className="form-label" htmlFor="login-email">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  className={`form-input ${loginForm.formState.errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="you@school.edu"
                  {...loginForm.register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })}
                />
                {loginForm.formState.errors.email && (
                  <p className="form-error"><span>⚠</span> {loginForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label mb-0" htmlFor="login-password">Password</label>
                  <button type="button" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Forgot password?</button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input pr-10 ${loginForm.formState.errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                    placeholder="3 to 15 characters"
                    {...loginForm.register('password', { 
                      required: 'Password is required', 
                      minLength: { value: 3, message: 'Password must be at least 3 characters' },
                      maxLength: { value: 15, message: 'Password cannot exceed 15 characters' }
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="form-error"><span>⚠</span> {loginForm.formState.errors.password.message}</p>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  {...loginForm.register('remember')}
                />
                <label htmlFor="remember" className="text-sm text-slate-600">Remember me for 30 days</label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign In to Dashboard'}
              </button>


            </form>
        </div>
      </div>
    </div>
  );
}