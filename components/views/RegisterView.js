import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

import { useFleet } from '@/context/FleetContext';
import { useRouter } from 'next/navigation';

export default function RegisterView() {
  const { session } = useFleet();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate('/dashboard');
  }, [session, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        toast.success('Account created! Redirecting...');
        navigate('/dashboard');
      } else {
        toast.success('Account created! Check your email to confirm, then sign in.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-6">
      <div className="grid-bg absolute inset-0 opacity-20" />
      <Card className="relative z-10 w-full max-w-md rounded-none border border-white/20 bg-black">
        <CardHeader className="pb-2 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center bg-white">
              <Zap className="h-6 w-6 fill-black text-black" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            NEW OPERATOR
          </CardTitle>
          <CardDescription className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Initialize Account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reg-name" className="font-mono text-xs text-zinc-400 uppercase">
                Full Name
              </Label>
              <Input
                id="reg-name"
                type="text"
                className="h-10 rounded-none border-white/10 bg-zinc-900 text-white focus:border-white/40"
                placeholder="JOHN DOE"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email" className="font-mono text-xs text-zinc-400 uppercase">
                Email Address
              </Label>
              <Input
                id="reg-email"
                type="email"
                className="h-10 rounded-none border-white/10 bg-zinc-900 text-white focus:border-white/40"
                placeholder="USER@EXAMPLE.COM"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password" className="font-mono text-xs text-zinc-400 uppercase">
                Password
              </Label>
              <Input
                id="reg-password"
                type="password"
                className="h-10 rounded-none border-white/10 bg-zinc-900 text-white focus:border-white/40"
                placeholder="MIN 6 CHARACTERS"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="h-10 w-full rounded-none bg-white font-bold tracking-widest text-black uppercase hover:bg-zinc-200"
              disabled={loading}
            >
              {loading ? 'CREATING PROFILE...' : 'ESTABLISH ACCOUNT'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="mt-2 justify-center border-t border-white/10 pt-4">
          <p className="font-mono text-xs text-zinc-500">
            ALREADY REGISTERED?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-white uppercase hover:underline"
            >
              LOGIN
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
