"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  User,
  Key,
  Download,
  Activity,
  CheckCircle,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Server,
  Search,
  Loader2,
  Copy,
  Check,
  Terminal,
  FileCode,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { onboardingApi } from "../../features/fleet/services/onboarding.api";

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [deviceFound, setDeviceFound] = useState(false);

  // Form State
  const [orgData, setOrgData] = useState({
    companyName: "",
    timezone: "UTC",
    locale: "en-US",
    industry: "",
  });
  const [ownerData, setOwnerData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });
  const [keyData, setKeyData] = useState({
    generated: false,
    key: "",
    expires: "Never",
    limit: 100,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const apiBase = () => {
    if (typeof window !== "undefined") {
      if (
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        return `${window.location.origin}/api/v1`;
      }
      return (
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api/v1"
      );
    }
    return "http://nos.is-local.org/api/v1";
  };

  const handleCopyCmd = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyKey = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // fallback
    }
  };

  const downloadScript = () => {
    const url = `${apiBase()}/fleet/installer/windows?registrationKey=${encodeURIComponent(keyData.key)}&serverUrl=${encodeURIComponent(apiBase())}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "install-nos-agent.ps1";
    a.click();
  };

  const downloadAgentExe = () => {
    const url = `${apiBase()}/fleet/installer/agent`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "NOS-Agent.exe";
    a.click();
  };

  useEffect(() => {
    if (step === 6) {
      // Simulate polling for device connection
      const timer = setTimeout(() => {
        setDeviceFound(true);
      }, 5000); // 5 seconds wait
      return () => clearTimeout(timer);
    }
  }, [step]);

  const nextStep = () => setStep((s) => Math.min(6, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const generateKey = async () => {
    setIsGenerating(true);
    try {
      const result = await onboardingApi.completeOnboarding({
        companyName: orgData.companyName,
        slug: orgData.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        ownerEmail: ownerData.email,
        ownerFirstName: ownerData.firstName,
        ownerLastName: ownerData.lastName,
        timezone: orgData.timezone,
      });
      const plainKey =
        result.data?.registrationKey?.key ||
        result.data?.key ||
        result.data?.registrationKey?.plainKey ||
        result.data?.registrationKey?.registrationKey?.key ||
        "";
      setKeyData({
        generated: true,
        key: plainKey,
        expires: "Never",
        limit: 0, // Unlimited as per backend
      });
    } catch (err) {
      console.error("Failed to complete onboarding", err);
      alert("Failed to generate key. " + (err as any).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const steps = [
    { id: 1, title: "Welcome" },
    { id: 2, title: "Organization" },
    { id: 3, title: "Owner Profile" },
    { id: 4, title: "Registration Key" },
    { id: 5, title: "Agent" },
    { id: 6, title: "Connection" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col">
      {/* Top Progress Bar */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="h-6 w-6 text-[#3D8BFF]" />
            <span className="font-bold text-white tracking-wider">
              NOS Enterprise
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            {steps.map((s) => (
              <React.Fragment key={s.id}>
                <span
                  className={
                    step === s.id
                      ? "text-[#3D8BFF] font-semibold"
                      : step > s.id
                        ? "text-gray-300"
                        : ""
                  }
                >
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
        <div className="max-w-2xl w-full bg-[#111217] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
          <div className="p-8">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mb-6">
                  <ShieldCheck className="h-8 w-8 text-[#3D8BFF]" />
                </div>
                <h1 className="text-3xl font-bold text-white">
                  Welcome to NOS Platform
                </h1>
                <p className="text-gray-400 text-lg">
                  Let&apos;s set up your enterprise workspace. This wizard will
                  configure your organization, generate secure registration
                  keys, and help you deploy your first agent
                </p>
                <div className="pt-6">
                  <Button
                    onClick={nextStep}
                    className="w-full sm:w-auto bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/20 active:scale-[0.97]"
                  >
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Organization */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-gray-800 pb-4">
                  <Building2 className="h-6 w-6 text-[#3D8BFF]" />
                  <h2 className="text-xl font-bold text-white">
                    Organization Details
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20"
                      value={orgData.companyName}
                      onChange={(e) =>
                        setOrgData({ ...orgData, companyName: e.target.value })
                      }
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Industry
                      </label>
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20"
                        value={orgData.industry}
                        onChange={(e) =>
                          setOrgData({ ...orgData, industry: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Timezone
                      </label>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/60"
                        value={orgData.timezone}
                        onChange={(e) =>
                          setOrgData({ ...orgData, timezone: e.target.value })
                        }
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">
                          Pacific Time
                        </option>
                        <option value="Europe/London">London</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={nextStep}
                    disabled={!orgData.companyName}
                    className="bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] active:scale-[0.97]"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Owner Profile */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-gray-800 pb-4">
                  <User className="h-6 w-6 text-[#3D8BFF]" />
                  <h2 className="text-xl font-bold text-white">
                    Owner Profile
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/60"
                        value={ownerData.firstName}
                        onChange={(e) =>
                          setOwnerData({
                            ...ownerData,
                            firstName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/60"
                        value={ownerData.lastName}
                        onChange={(e) =>
                          setOwnerData({
                            ...ownerData,
                            lastName: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/60"
                        value={ownerData.role}
                        onChange={(e) =>
                          setOwnerData({ ...ownerData, role: e.target.value })
                        }
                        placeholder="e.g. IT Director"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/60"
                        value={ownerData.email}
                        onChange={(e) =>
                          setOwnerData({ ...ownerData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <Button
                    onClick={prevStep}
                    variant="outline"
                    className="border-gray-700 text-gray-300 active:scale-[0.97]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={!ownerData.firstName || !ownerData.email}
                    className="bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] active:scale-[0.97]"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Registration Key */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 border-b border-gray-800 pb-4">
                  <Key className="h-6 w-6 text-[#3D8BFF]" />
                  <h2 className="text-xl font-bold text-white">
                    Initial Registration Key
                  </h2>
                </div>
                <p className="text-gray-400 text-sm">
                  Registration keys are used by devices to securely authenticate
                  and enroll into your organization.
                </p>

                {!keyData.generated ? (
                  <div className="text-center py-8">
                    <Button
                      onClick={generateKey}
                      disabled={isGenerating}
                      className="bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] active:scale-[0.97]"
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Key className="mr-2 h-4 w-4" />
                      )}
                      {isGenerating ? "Generating..." : "Generate Root Key"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-center text-lg text-[#3D8BFF] tracking-wider flex items-center justify-between gap-3">
                      <span className="flex-1 select-all">{keyData.key}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyKey(keyData.key)}
                        className="border-gray-700 text-xs shrink-0"
                      >
                        {copiedKey ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                      <div className="bg-gray-800/50 p-3 rounded border border-gray-800">
                        <span className="block text-gray-500">Expiration</span>
                        <span className="text-white">{keyData.expires}</span>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded border border-gray-800">
                        <span className="block text-gray-500">
                          Device Limit
                        </span>
                        <span className="text-white">Unlimited Devices</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    onClick={prevStep}
                    variant="outline"
                    className="border-gray-700 text-gray-300 active:scale-[0.97]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={!keyData.generated}
                    className="bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] active:scale-[0.97]"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Download Agent */}
            {step === 5 &&
              (() => {
                const scriptUrl = `${apiBase()}/fleet/installer/windows?registrationKey=${encodeURIComponent(keyData.key)}&serverUrl=${encodeURIComponent(apiBase())}`;
                const psCommand = `Invoke-WebRequest -Uri "${scriptUrl}" -OutFile "install-nos-agent.ps1"; .\\install-nos-agent.ps1`;

                return (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 border-b border-gray-800 pb-4">
                      <Download className="h-6 w-6 text-[#3D8BFF]" />
                      <h2 className="text-xl font-bold text-white">
                        Deploy Agent
                      </h2>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Run the following PowerShell command as Administrator on
                      your target Windows devices to automatically install the
                      agent and enroll it to your organization.
                    </p>

                    <div className="relative group bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono text-xs overflow-x-auto">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800 text-gray-400">
                        <span className="flex items-center gap-1.5 font-sans font-semibold text-gray-300">
                          <Terminal className="w-3.5 h-3.5 text-[#3D8BFF]" />
                          PowerShell (Run as Administrator)
                        </span>
                        <button
                          onClick={() => handleCopyCmd(psCommand)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 transition font-sans font-medium"
                        >
                          {copiedCmd ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Command
                            </>
                          )}
                        </button>
                      </div>
                      <code className="text-emerald-400 select-all block whitespace-pre-wrap break-all">
                        {psCommand}
                      </code>
                    </div>

                    {/* Direct Download Options */}
                    <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Alternative Manual Installation Files:
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={downloadScript}
                          className="border-gray-700 bg-gray-800/80 text-gray-200 hover:bg-gray-700 text-xs flex items-center gap-1.5"
                        >
                          <FileCode className="w-3.5 h-3.5 text-[#3D8BFF]" />
                          Download Installer Script (.ps1)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={downloadAgentExe}
                          className="border-gray-700 bg-gray-800/80 text-gray-200 hover:bg-gray-700 text-xs flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          Download Agent (.exe)
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-gray-800">
                      <Button
                        onClick={prevStep}
                        variant="outline"
                        className="border-gray-700 text-gray-300 active:scale-[0.97]"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={nextStep}
                        className="bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] active:scale-[0.97]"
                      >
                        I&apos;ve Run the Installer
                      </Button>
                    </div>
                  </div>
                );
              })()}

            {/* Step 6: Connection (Waiting) */}
            {step === 6 && (
              <div className="space-y-8 py-8 text-center">
                {!deviceFound ? (
                  <>
                    <div className="mx-auto w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-[#3D8BFF] animate-spin mb-6"></div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Waiting for First Device...
                    </h2>
                    <p className="text-gray-400">
                      Listening for secure socket connections from the agent.
                      This usually takes less than a minute.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Device Connected!
                    </h2>
                    <p className="text-gray-400">
                      Successfully received telemetry from{" "}
                      <span className="font-mono text-gray-200">
                        DESKTOP-1045
                      </span>
                      . Your environment is ready.
                    </p>
                    <div className="pt-8">
                      <Button
                        onClick={() => router.push("/dashboard")}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium active:scale-[0.97]"
                      >
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
