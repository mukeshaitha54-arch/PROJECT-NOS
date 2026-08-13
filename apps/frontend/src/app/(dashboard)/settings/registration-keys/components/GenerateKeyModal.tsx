import React, { useState } from 'react';
import { X, Key, Copy, Download, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { fleetApi } from "@/fleet/services/fleet.api";

interface GenerateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess: () => void;
}

export function GenerateKeyModal({ isOpen, onClose, organizationId, onSuccess }: GenerateKeyModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [maxUses, setMaxUses] = useState(100);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await fleetApi.generateRegistrationKey({
        organizationId,
        displayName,
        maxUses,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setGeneratedKey(res.data.plainKey);
      onSuccess();
    } catch (err) {
      console.error('Failed to generate key', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadInstaller = () => {
    const link = document.createElement('a');
    link.href = 'http://localhost:4000/api/v1/device/download';
    link.setAttribute('download', 'NOS_Agent_Installer.exe');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setGeneratedKey(null);
    setDisplayName('');
    setMaxUses(100);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" />
            {generatedKey ? 'Registration Key Generated' : 'Generate New Key'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {generatedKey ? (
            <div className="space-y-6">
              <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-300 font-medium mb-3">
                  IMPORTANT: This key will only be shown once. Copy it now.
                </p>
                <div className="bg-black/50 border border-gray-700 rounded-lg p-3 font-mono text-lg text-white select-all break-all">
                  {generatedKey}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={handleCopy} className="w-full bg-gray-800 hover:bg-gray-700 text-white">
                  {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied to Clipboard' : 'Copy Key'}
                </Button>
                <Button onClick={handleDownloadInstaller} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                  <Download className="w-4 h-4 mr-2" /> Download Installer
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Key Name / Description</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Server Fleet 2026"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Uses</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={maxUses}
                  onChange={e => setMaxUses(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose} className="border-gray-700 text-gray-300">
                  Cancel
                </Button>
                <Button type="submit" disabled={generating || !displayName} className="bg-blue-600 hover:bg-blue-500 text-white">
                  {generating ? 'Generating...' : 'Generate Key'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
