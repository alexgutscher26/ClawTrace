import posthog from 'posthog-js';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Zap, Building2 } from 'lucide-react';
import { useFleet } from '@/context/FleetContext';
import { useRouter } from 'next/navigation';

/**
 * Renders the login view for user authentication.
 *
 * This component manages user login through direct email/password input or enterprise SSO. It utilizes hooks to manage state and side effects, including navigation upon successful login. The component handles form submissions for both login methods, displaying appropriate feedback for success or errors.
 *
 * @returns {JSX.Element} The rendered login view component.
 */
export default function LoginView() {
  const { session } = useFleet();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ssoDomain, setSsoDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState('direct');

  useEffect(() => {
    if (session) navigate('/dashboard');
  }, [session, navigate]);

  /**
   * Handles user login by processing the login form submission.
   *
   * This function prevents the default form submission behavior, sets a loading state,
   * and attempts to sign in the user using Supabase's authentication method.
   * If successful, it displays a success message, captures the event with PostHog,
   * and navigates to the dashboard. In case of an error, it shows an error message
   * and ensures the loading state is reset in the end.
   *
   * @param {Event} e - The event object from the form submission.
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back!');
      posthog.capture('user_login_success', { method: 'password' });
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = async (e) => {
    e.preventDefault();
    if (!ssoDomain) {
      toast.error('Enter your enterprise domain');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain: ssoDomain.trim(),
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-6">
      <div className="grid-bg absolute inset-0 opacity-20" />
      <Card className="relative z-10 w-full max-w-md overflow-hidden rounded-none border border-white/20 bg-black">
        <div className="h-1 bg-white" />
        <CardHeader className="pb-2 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center bg-white">
              <Zap className="h-6 w-6 fill-black text-black" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            SYSTEM ACCESS
          </CardTitle>
          <CardDescription className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
            Identify Yourself to console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMode} onValueChange={setAuthMode} className="mb-6 w-full">
            <TabsList className="grid h-10 grid-cols-2 rounded-none border border-white/10 bg-zinc-900 p-1">
              <TabsTrigger
                value="direct"
                className="rounded-none font-mono text-[10px] tracking-wider uppercase data-[state=active]:bg-white data-[state=active]:text-black"
              >
                DIRECT OPS
              </TabsTrigger>
              <TabsTrigger
                value="enterprise"
                className="rounded-none font-mono text-[10px] tracking-wider uppercase data-[state=active]:bg-white data-[state=active]:text-black"
              >
                ENTERPRISE SSO
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct">
              <form onSubmit={handleLogin} className="space-y-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-mono text-[10px] text-zinc-400 uppercase">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    className="h-10 rounded-none border-white/10 bg-zinc-900 text-white focus:border-white/40 focus:ring-0"
                    placeholder="USER@EXAMPLE.COM"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="font-mono text-[10px] text-zinc-400 uppercase"
                  >
                    Security Key
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    className="h-10 rounded-none border-white/10 bg-zinc-900 text-white focus:border-white/40 focus:ring-0"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-none bg-white text-xs font-bold tracking-widest text-black uppercase hover:bg-zinc-200"
                  disabled={loading}
                >
                  {loading ? 'VERIFYING...' : 'INITIATE LOGIN'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="enterprise">
              <div className="space-y-4 pt-2">
                <div className="border border-white/10 bg-zinc-900 p-3">
                  <p className="font-mono text-[10px] leading-relaxed text-zinc-400 uppercase">
                    Accessing as an organization? Redirect to your identity provider via SAML 2.0.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="sso-domain"
                    className="font-mono text-[10px] text-zinc-400 uppercase"
                  >
                    Enterprise Domain
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="sso-domain"
                      type="text"
                      className="h-10 rounded-none border-white/10 bg-zinc-900 pl-10 text-white focus:border-white/40 focus:ring-0"
                      placeholder="ACME.COM"
                      value={ssoDomain}
                      onChange={(e) => setSsoDomain(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSSO}
                  className="h-11 w-full rounded-none border border-white/20 bg-transparent text-xs font-bold tracking-widest text-white uppercase transition-all hover:bg-white hover:text-black"
                  disabled={loading}
                >
                  {loading ? 'REDIRECTING...' : 'SSO AUTHENTICATION'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="mt-2 justify-center border-t border-white/10 pt-4">
          <p className="font-mono text-xs text-zinc-500 italic">
            UNAUTHORIZED ACCESS IS PROHIBITED. IP LOGGED.
          </p>
        </CardFooter>
      </Card>
      <div className="absolute bottom-4 left-4 flex gap-4 font-mono text-[10px] text-zinc-600 uppercase">
        <button onClick={() => navigate('/register')} className="hover:text-white">
          New Operator
        </button>
        <button onClick={() => navigate('/')} className="hover:text-white">
          Terminal Home
        </button>
      </div>
    </div>
  );
}
