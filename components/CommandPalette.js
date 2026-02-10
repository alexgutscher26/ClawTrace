'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    CreditCard,
    Settings,
    Server,
    LayoutDashboard,
    FileText,
    LogOut,
} from 'lucide-react';

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { useFleet } from '@/context/FleetContext';
import { supabase } from '@/lib/supabase';

/**
 * Renders a command palette for executing commands and searching agents.
 *
 * The CommandPalette component manages its open state and fetches agents from the API when opened.
 * It listens for keyboard shortcuts to toggle its visibility and provides a list of commands and agents
 * that can be selected to navigate to different routes or perform actions. The component also handles
 * user sign-out functionality.
 *
 * @returns {JSX.Element|null} The rendered command palette or null if the session is not available.
 */
export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const [agents, setAgents] = React.useState([]);
    const { session, api } = useFleet();
    const router = useRouter();

    React.useEffect(() => {
        /**
         * Toggles the open state when 'k' is pressed with meta or ctrl key.
         */
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    React.useEffect(() => {
        if (open && session) {
            api('/api/agents')
                .then((res) => setAgents(res.agents || []))
                .catch((err) => console.error('Failed to fetch agents for command palette', err));
        }
    }, [open, session, api]);

    const runCommand = React.useCallback((command) => {
        setOpen(false);
        command();
    }, []);

    if (!session) return null;

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search agents..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                    <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/docs'))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Documentation</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/pricing'))}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>Billing</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push('/dashboard/settings'))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Agents">
                    {agents.map((agent) => (
                        <CommandItem
                            key={agent.id}
                            onSelect={() => runCommand(() => router.push(`/dashboard/agents/${agent.id}`))}
                        >
                            <Server className="mr-2 h-4 w-4" />
                            <span>{agent.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{agent.status}</span>
                        </CommandItem>
                    ))}
                    {agents.length === 0 && (
                        <CommandItem disabled>No agents found</CommandItem>
                    )}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Account">
                    <CommandItem onSelect={() => runCommand(async () => {
                        await supabase.auth.signOut();
                        router.push('/');
                        window.location.reload();
                    })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
