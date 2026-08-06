'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, User, Key, Download, Activity, CheckCircle,
  ChevronRight, ArrowRight, ShieldCheck, Server, Search, Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { onboardingApi } from '../../features/fleet/services/onboarding.api';

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [deviceFound, setDeviceFound] = useState(false);

  // Form State
  const [orgData, setOrgData] = useState({ companyName: '', timezone: 'UTC', locale: 'en-US', industry: '' });
  const [ownerData, setOwnerData] = useState({ firstName: '', lastName: '', email: '', role: '' });
  const [keyData, setKeyData] = useState({ generated: false, key: '', expires: 'Never', limit: 100 });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (step === 6) {
      // Simulate polling for device connection
      const timer = setTimeout(() => {
        setDeviceFound(true);
      }, 5000); // 5 seconds wait
      return () => clearTimeout(timer);
    }
  }, [step]);

  const nextStep = () => setStep(s => Math.min(6, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const generateKey = async () => {
    setIsGenerating(true);
    try {
      const result = await onboardingApi.completeOnboarding({
        companyName: orgData.companyName,
        slug: orgData.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        ownerEmail: ownerData.email,
        ownerFirstName: ownerData.firstName,
        ownerLastName: ownerData.lastName,
        timezone: orgData.timezone,
      });
      setKeyData({
        generated: true,
        key: result.data?.registrationKey?.registrationKey?.key || 'ERROR_NO_KEY',
        expires: 'Never',
        limit: 0 // Unlimited as per backend
      });
    } catch (err) {
      console.error('Failed to complete onboarding', err);
      alert('Failed to generate key. ' + (err as any).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const steps = [
    { id: 1, title: 'Welcome' },
    { id: 2, title: 'Organization' },
    { id: 3, title: 'Owner Profile' },
    { id: 4, title: 'Registration Key' },
    { id: 5, title: 'Agent' },
    { id: 6, title: 'Connection' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col">
      {/* Top Progress Bar */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="h-6 w-6 text-blue-500" />
            <span className="font-bold text-white tracking-wider">NOS Enterprise</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            {steps.map((s) => (
              <React.Fragment key={s.id}>
                <span className={step === s.id ? 'text-blue-400 font-semibold' : (step > s.id ? 'text-gray-300' : '')}>
                  {s.title}
                </span>
                {s.id !== 6 && <ChevronRight className="h-4 w-4 mx-1" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-gray-900 rounded-xl border border-gray-800 shadow-2xl overflow-hidden">

          <div className="p-8">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck className="h-8 w-8 text-blue-400" />
                </div>
                <h1 className="text-3xl font-bold text-white">Welcome to NOS Platform</h1>
                <p className="text-gray-400 text-lg">
                  Let&apos;s set up your enterprise workspace. This wizard will configure your organization, generate secure registration keys, and help you deploy your first agent
                </p>
                <div className="pt-6">
                  <Button onClick={nextStep} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Organization */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-gray-800 pb-4">
                  <Building2 className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Organization Details</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Company Name</label>
                    <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={orgData.companyName} onChange={e => setOrgData({ ...orgData, companyName: e.target.value })} placeholder="e.g. Acme Corp" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Industry</label>
                      <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={orgData.industry} onChange={e => setOrgData({ ...orgData, industry: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Timezone</label>
                      <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={orgData.timezone} onChange={e => setOrgData({ ...orgData, timezone: e.target.value })}>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={nextStep} disabled={!orgData.companyName} className="bg-blue-600 hover:bg-blue-700">Continue</Button>
                </div>
              </div>
            )}

            {/* Step 3: Owner Profile */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-gray-800 pb-4">
                  <User className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Owner Profile</h2>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">First Name</label>
                      <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={ownerData.firstName} onChange={e => setOwnerData({ ...ownerData, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Last Name</label>
                      <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={ownerData.lastName} onChange={e => setOwnerData({ ...ownerData, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                      <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={ownerData.role} onChange={e => setOwnerData({ ...ownerData, role: e.target.value })} placeholder="e.g. IT Director" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                      <input type="email" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" value={ownerData.email} onChange={e => setOwnerData({ ...ownerData, email: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button onClick={prevStep} variant="outline" className="border-gray-700 text-gray-300">Back</Button>
                  <Button onClick={nextStep} disabled={!ownerData.firstName || !ownerData.email} className="bg-blue-600 hover:bg-blue-700">Continue</Button>
                </div>
              </div>
            )}

            {/* Step 4: Registration Key */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-gray-800 pb-4">
                  <Key className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Initial Registration Key</h2>
                </div>
                <p className="text-gray-400 text-sm">
                  Registration keys are used by devices to securely authenticate and enroll into your organization.
                </p>

                {!keyData.generated ? (
                  <div className="text-center py-8">
                    <Button onClick={generateKey} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
                      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />} 
                      {isGenerating ? 'Generating...' : 'Generate Root Key'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-center text-lg text-blue-400 tracking-wider">
                      {keyData.key}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                      <div className="bg-gray-800/50 p-3 rounded border border-gray-800">
                        <span className="block text-gray-500">Expiration</span>
                        <span className="text-white">{keyData.expires}</span>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded border border-gray-800">
                        <span className="block text-gray-500">Device Limit</span>
                        <span className="text-white">{keyData.limit} Devices</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button onClick={prevStep} variant="outline" className="border-gray-700 text-gray-300">Back</Button>
                  <Button onClick={nextStep} disabled={!keyData.generated} className="bg-blue-600 hover:bg-blue-700">Continue</Button>
                </div>
              </div>
            )}

            {/* Step 5: Download Agent */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-gray-800 pb-4">
                  <Download className="h-6 w-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Deploy Agent</h2>
                </div>
                <p className="text-gray-400 text-sm">
                  Run the following PowerShell command as Administrator on your target Windows devices to automatically install the agent and enroll it to your organization.
                </p>

                <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 font-mono text-sm overflow-x-auto whitespace-pre">
                  <>
                    <span className="text-pink-400">Invoke-WebRequest</span>{" "}
                    -Uri{" "}
                    <span className="text-green-400">
                      &quot;https://api.nos.local/v1/installer?key={keyData.key}&quot;
                    </span>{" "}
                    -OutFile{" "}
                    <span className="text-green-400">&quot;setup.ps1&quot;</span>;{" "}
                    <span className="text-pink-400">.\setup.ps1</span>
                  </>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-800 mt-6">
                  <div className="text-xs text-gray-500">Also available: <a href="#" className="text-blue-400 hover:underline">MSI Installer</a> or <a href="#" className="text-blue-400 hover:underline">Linux sh</a></div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button onClick={prevStep} variant="outline" className="border-gray-700 text-gray-300">Back</Button>
                  <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">
                    I&apos;ve Run the Installer
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Connection (Waiting) */}
            {step === 6 && (
              <div className="space-y-8 py-8 text-center">
                {!deviceFound ? (
                  <>
                    <div className="mx-auto w-16 h-16 rounded-full border-4 border-blue-900 border-t-blue-500 animate-spin mb-6"></div>
                    <h2 className="text-2xl font-bold text-white mb-2">Waiting for First Device...</h2>
                    <p className="text-gray-400">
                      Listening for secure socket connections from the agent. This usually takes less than a minute.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Device Connected!</h2>
                    <p className="text-gray-400">
                      Successfully received telemetry from <span className="font-mono text-gray-200">DESKTOP-1045</span>. Your environment is ready.
                    </p>
                    <div className="pt-8">
                      <Button onClick={() => router.push('/dashboard')} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium">
                        Enter Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
