'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function MasterKeyModal({ onSetKey }) {
  const [passphrase, setPassphrase] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-master-key-modal', handleOpen);

    const saved = sessionStorage.getItem('master_passphrase');
    if (!saved) setIsOpen(true);
    else onSetKey(saved);

    return () => window.removeEventListener('open-master-key-modal', handleOpen);
  }, [onSetKey]);

  const handleSave = (e) => {
    e.preventDefault();
    if (passphrase.length < 8) return toast.error('Key must be at least 8 characters');
    sessionStorage.setItem('master_passphrase', passphrase);
    onSetKey(passphrase);
    setIsOpen(false);
    toast.success('Master Key active (Session only)');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="rounded-none border-white/20 bg-black text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight uppercase italic">
            <Shield className="h-5 w-5 text-emerald-400" /> E2EE Master Key Required
          </DialogTitle>
          <DialogDescription className="mt-2 font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Your fleet configurations are end-to-end encrypted. Enter your master key to decrypt
            them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] text-zinc-500 uppercase">Master Passphrase</Label>
            <Input
              type="password"
              placeholder="••••••••••••••••"
              className="h-11 rounded-none border-white/10 bg-zinc-900"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
            />
          </div>
          <p className="border border-white/5 bg-white/5 p-3 font-mono text-[9px] leading-relaxed text-zinc-600">
            NOTICE: THIS KEY IS NEVER SENT TO THE SERVER. IT IS STORED ONLY IN YOUR BROWSER'S
            VOLATILE MEMORY. IF YOU FORGET THIS KEY, ENCRYPTED CONFIGURATIONS CANNOT BE RECOVERED.
          </p>
          <Button
            type="submit"
            className="h-11 w-full rounded-none bg-white font-bold tracking-widest text-black uppercase hover:bg-zinc-200"
          >
            UNLOCK CONFIGURATIONS
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
