
import os

file_path = r'c:\Users\madaj\OneDrive\Desktop\fleet\app\page.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Part 1: Restore useHashRouter
router_code = """
function useHashRouter() {
  const [route, setRoute] = useState({ view: 'landing', params: {} });
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.slice(1) || '/';
      if (hash === '/' || hash === '') return { view: 'landing', params: {} };
      if (hash === '/login') return { view: 'login', params: {} };
      if (hash === '/register') return { view: 'register', params: {} };
      if (hash === '/dashboard') return { view: 'dashboard', params: {} };
      if (hash === '/pricing') return { view: 'pricing', params: {} };
      if (hash === '/settings') return { view: 'settings', params: {} };
      if (hash === '/changelog') return { view: 'changelog', params: {} };
      const m = hash.match(/^\\/agent\\/(.+)$/);
      if (m) return { view: 'agent', params: { id: m[1] } };
      return { view: 'landing', params: {} };
    };
    const handle = () => setRoute(parseHash());
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);
  const navigate = useCallback((p) => { window.location.hash = p; }, []);
  return { ...route, navigate };
}
"""

if 'function useHashRouter' not in content:
    # Insert before const CHANGELOG_DATA
    if 'const CHANGELOG_DATA = [' in content:
        content = content.replace('const CHANGELOG_DATA = [', router_code + '\n\nconst CHANGELOG_DATA = [')
    else:
        # Fallback if CHANGELOG_DATA not found closely
        # Try inserting after timeAgo function
        if 'return `${Math.floor(diff / 86400)}d ago`;\n}' in content:
             content = content.replace('return `${Math.floor(diff / 86400)}d ago`;\n}', 'return `${Math.floor(diff / 86400)}d ago`;\n}\n' + router_code)

# Part 2: Restore views and return in App
app_render_code = """
  const viewProps = { navigate, session, api, masterPassphrase, branding, setGlobalBranding };

  const views = {
    landing: <LandingView {...viewProps} />,
    login: <LoginView {...viewProps} />,
    register: <RegisterView {...viewProps} />,
    pricing: <PricingView {...viewProps} />,
    dashboard: <DashboardView {...viewProps} onSetBranding={setBranding} />,
    agent: <AgentDetailView {...viewProps} agentId={params.id} />,
    settings: <SettingsView {...viewProps} />,
    changelog: <ChangelogView {...viewProps} />
  };

  return (
    <div className="min-h-screen bg-black">
      <Toaster richColors position="top-right" theme="dark" />
      {session && ['dashboard', 'agent', 'settings', 'changelog'].includes(view) && (
        <Navbar navigate={navigate} session={session} branding={branding} />
      )}
      {session && ['dashboard', 'agent', 'settings'].includes(view) && (
        <MasterKeyModal onSetKey={setMasterPassphrase} />
      )}
      {views[view] || <LandingView {...viewProps} />}
    </div>
  );
"""

# We look for the place where we have `if (loading) return <LoadingScreen />;` and followed by empty space or missing return
target_loading = 'if (loading) return <LoadingScreen />;'
if target_loading in content:
    # Check if return is already there?
    if 'const views =' not in content:
        # We need to insert it.
        # Find the location
        idx = content.find(target_loading)
        if idx != -1:
            end_idx = idx + len(target_loading)
            # Check what's after
            post_content = content[end_idx:]
            # It likely has some newlines and then `// ============ NAVBAR ============` or `function Navbar`
            # We want to insert 'app_render_code' right after target_loading
            content = content[:end_idx] + '\n\n' + app_render_code + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched app/page.js successfully.")
