"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  LockOpen,
  AlertTriangle,
  Server,
  Terminal,
  Cpu,
  Mail,
  FileText,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Info,
} from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#05070c] text-zinc-300 font-sans selection:bg-[#3D8BFF]/30 selection:text-white">
      {/* Background Decorative Lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/10 via-cyan-500/5 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/5 to-transparent blur-[140px] rounded-full" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 border-b border-white/[0.08] bg-[#05070c]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 group text-white hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3D8BFF] to-[#00E5FF] p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#070b14] rounded-[7px] flex items-center justify-center">
                <span className="font-mono font-bold text-sm bg-gradient-to-r from-[#3D8BFF] to-[#00E5FF] bg-clip-text text-transparent">
                  N
                </span>
              </div>
            </div>
            <div>
              <span className="font-bold tracking-wider text-sm text-white">
                NOS
              </span>
              <span className="text-[10px] text-zinc-500 font-mono ml-1.5 uppercase">
                Neural OS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/auth/register"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors py-1 px-3 rounded-lg border border-white/[0.08] hover:border-white/[0.2] bg-white/[0.02]"
            >
              <ArrowLeft size={13} />
              <span>Back to Register</span>
            </Link>
            <a
              href="mailto:nos.platformm@gmail.com"
              className="hidden sm:flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Mail size={13} />
              <span>nos.platformm@gmail.com</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Document Body */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Title Header */}
        <div className="space-y-4 border-b border-white/[0.08] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-red-500/10 border border-red-500/30 text-red-400">
            <ShieldAlert size={14} />
            <span>MANDATORY PROTOCOL ADVISORY &amp; LEGAL GOVERNANCE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Terms of Use, Privacy Policy &amp; Security Disclaimer
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-zinc-400 pt-2">
            <div>
              <span className="text-zinc-600">Effective Date:</span> November
              14, 2026
            </div>
            <div>
              <span className="text-zinc-600">Revision:</span>{" "}
              2026.4-HTTP-STRICT
            </div>
            <div>
              <span className="text-zinc-600">License:</span> License 2026
            </div>
            <div>
              <span className="text-zinc-600">Classification:</span> Plaintext
              Public Distribution
            </div>
          </div>
        </div>

        {/* ── CRITICAL AMBER / RED ALERT BOX: HTTP WITHOUT TLS / SSL ── */}
        <section className="relative overflow-hidden rounded-2xl border-2 border-red-500/60 bg-gradient-to-br from-red-950/40 via-red-900/20 to-black/60 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 shrink-0 mt-1">
              <LockOpen size={24} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                CRITICAL WARNING: UNENCRYPTED HTTP TRANSPORT ARCHITECTURE
              </h2>
              <p className="text-xs sm:text-sm text-red-200/90 font-mono uppercase tracking-wider font-semibold">
                NO SSL / TLS ENCRYPTION CERTIFICATES DEPLOYED
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed pt-2 border-t border-red-500/20">
            <p>
              Please review this binding legal disclosure prior to creating an
              account, signing in, enrolling devices, or transmitting telemetric
              payloads.{" "}
              <strong>
                NOS (Neural Operating System / Network Operations Sentinel)
              </strong>{" "}
              is operating within an active testing, research, and rapid
              demonstration deployment environment. The entire web application,
              control plane API, WebSocket transport layer, and agent telemetry
              communication channels run over{" "}
              <strong className="text-red-300 font-mono underline decoration-red-400">
                UNENCRYPTED HYPERTEXT TRANSFER PROTOCOL (HTTP)
              </strong>{" "}
              WITHOUT Secure Sockets Layer (SSL) or Transport Layer Security
              (TLS) certificates.
            </p>
            <p>
              Because this platform operates strictly over unencrypted HTTP
              (port 80 or unencrypted tunnels),{" "}
              <strong className="text-white">
                ALL INFORMATION TRANSMITTED ACROSS THE NETWORK TRAVELS IN
                UNPROTECTED, CLEAR PLAINTEXT
              </strong>
              . This includes, without limitation: user credentials, email
              addresses, cryptographic device access tokens, system architecture
              specifications, internal and private IP addresses, network
              topology data, active process listings, hardware serial numbers,
              and real-time telemetric streams.
            </p>
            <p className="text-red-200 font-medium">
              NO LIABILITY FOR BREACHES, PACKET SNIFFING, OR INTERCEPTION: NOS
              operators, maintainers, engineers, hosts, and academic or
              institutional contributors EXPLICITLY AND IRREVOCABLY DISCLAIM ALL
              LIABILITY FOR ANY SECURITY BREACHES, CREDENTIAL COMPROMISE,
              UNLAWFUL THIRD-PARTY PACKET SNIFFING, MAN-IN-THE-MIDDLE (MitM)
              ATTACKS, IDENTITY THEFT, SYSTEM DAMAGE, HARDWARE MALFUNCTION, DATA
              LOSS, OR REGULATORY NON-COMPLIANCE RESULTING FROM THE USE OF AN
              UNENCRYPTED HTTP TRANSPORT OR THE INHERENT LIMITATIONS OF THIS
              PLATFORM.
            </p>
          </div>
        </section>

        {/* ── DETAILED SECTIONS ── */}
        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">
          {/* Section 1 */}
          <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-md bg-[#3D8BFF]/20 text-[#3D8BFF] flex items-center justify-center font-mono text-xs">
                01
              </span>
              <h3>Acceptance of Terms &amp; Pre-Registration Covenant</h3>
            </div>
            <p>
              By checking the registration consent checkbox, completing the user
              registration workflow, downloading the NOS Native Windows Agent,
              or connecting any computing device to the NOS control plane, you
              (&ldquo;User&rdquo;, &ldquo;Operator&rdquo;, or
              &ldquo;Subscriber&rdquo;) enter into a legally binding agreement
              and express your full, unconditional consent to these Terms of Use
              and Privacy Governance principles. If you do not consent to every
              provision and risk condition established herein, you must
              immediately terminate registration and refrain from accessing or
              utilizing any component of the NOS architecture.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-md bg-[#3D8BFF]/20 text-[#3D8BFF] flex items-center justify-center font-mono text-xs">
                02
              </span>
              <h3>
                Infrastructure Protocol Architecture &amp; Absence of TLS/SSL
                Certificates
              </h3>
            </div>
            <p>
              The platform infrastructure is provisioned without TLS/SSL
              termination. Consequently:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 pl-2">
              <li>
                <strong className="text-zinc-200">
                  No In-Transit Encryption:
                </strong>{" "}
                Packets exchanged between your client browser, the Next.js
                frontend, the NestJS backend, and the Windows C# agent are not
                encrypted via HTTPS/WSS. Intermediate routers, proxy nodes,
                Internet Service Providers (ISPs), and network eavesdroppers
                within your local area network or upstream routing path may
                inspect, capture, or mirror data packets.
              </li>
              <li>
                <strong className="text-zinc-200">
                  Session Vulnerability:
                </strong>{" "}
                Bearer JWT tokens, device access tokens, and WebSocket session
                frames are transmitted as plaintext headers. You are solely
                responsible for ensuring you do not access the NOS platform over
                untrusted, public, or unencrypted wireless networks (such as
                public coffee shop Wi-Fi).
              </li>
              <li>
                <strong className="text-zinc-200">
                  No Guarantee of Authenticity:
                </strong>{" "}
                Because no X.509 certificate authority has validated the domain
                origin, DNS spoofing or ARP poisoning could theoretically
                misdirect your traffic to a rogue host without browser
                certificate warnings being raised.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-md bg-[#3D8BFF]/20 text-[#3D8BFF] flex items-center justify-center font-mono text-xs">
                03
              </span>
              <h3>
                Telemetry Collection Scope &amp; LocalSystem Agent Privileges
              </h3>
            </div>
            <p>
              When the NOS Agent (`NOS.Agent.exe`) is installed and run as a
              Windows service or elevated console application, it operates with
              administrative or `NT AUTHORITY\LocalSystem` permissions to query
              Windows Management Instrumentation (WMI) and native performance
              counters. The agent autonomously collects and transmits:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05] space-y-1">
                <span className="text-[#3D8BFF] font-semibold flex items-center gap-1.5">
                  <Cpu size={14} /> Hardware Profile
                </span>
                <p className="text-zinc-400">
                  CPU model, physical &amp; logical core counts, motherboard
                  serials, RAM stick capacities, BIOS version, disk drive
                  geometry, and GPU identifiers.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05] space-y-1">
                <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                  <Terminal size={14} /> Telemetry &amp; Execution
                </span>
                <p className="text-zinc-400">
                  CPU utilization %, available &amp; used memory, disk I/O
                  throughput (MB/s), active network adapters, MAC addresses,
                  gateway IP, DNS servers, and upload/download bandwidth.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05] space-y-1">
                <span className="text-purple-400 font-semibold flex items-center gap-1.5">
                  <Server size={14} /> Process &amp; Service Registry
                </span>
                <p className="text-zinc-400">
                  Process IDs (PIDs), active executable image names, thread
                  counts, memory footprints, and registered Windows service
                  statuses.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05] space-y-1">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Software &amp; Assets
                </span>
                <p className="text-zinc-400">
                  Installed software packages from Windows Registry, version
                  strings, startup application lists, and system security
                  configurations (Firewall/Antivirus state).
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 pt-1">
              You warrant and affirm that you are the sole legal owner of any
              computer or virtual machine upon which the NOS Agent is deployed,
              or that you possess explicit written authorization from the
              hardware owner to install monitoring software.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-md bg-[#3D8BFF]/20 text-[#3D8BFF] flex items-center justify-center font-mono text-xs">
                04
              </span>
              <h3>
                Absolute Disclaimer of Warranties (&ldquo;AS-IS&rdquo;
                Architecture)
              </h3>
            </div>
            <p>
              THE NOS PLATFORM, FRONTEND DASHBOARD, BACKEND API, DISTRIBUTED
              AGENT BINARIES, INVENTORY EXPLORER, AND ALL ASSOCIATED CODEBASES
              ARE PROVIDED STRICTLY ON AN <strong>&ldquo;AS-IS&rdquo;</strong>{" "}
              AND <strong>&ldquo;AS-AVAILABLE&rdquo;</strong> BASIS, WITHOUT
              WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR
              OTHERWISE.
            </p>
            <p className="text-zinc-400">
              TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, THE
              CONTRIBUTORS AND OPERATORS EXCLUDE AND DISCLAIM ALL IMPLIED
              WARRANTIES, INCLUDING BUT NOT LIMITED TO: WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              NON-INFRINGEMENT, UNINTERRUPTED AVAILABILITY, SECURITY, FREEDOM
              FROM COMPUTER VIRUSES OR MALWARE, AND ACCURACY OF TELEMETRIC
              ESTIMATES OR HARDWARE DIAGNOSTICS.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-md bg-[#3D8BFF]/20 text-[#3D8BFF] flex items-center justify-center font-mono text-xs">
                05
              </span>
              <h3>Strict Limitation of Liability &amp; Capped Damages</h3>
            </div>
            <p>
              IN NO EVENT SHALL NOS PLATFORM MAINTAINERS, CONTRIBUTORS,
              DEVELOPERS, RESEARCHERS, OR HOSTING PROVIDERS BE LIABLE FOR ANY
              DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR
              EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO: LOSS OF REVENUE,
              LOSS OF PROFITS, LOSS OF BUSINESS OPPORTUNITY, CORRUPTION OF
              OPERATING SYSTEM FILES, HARDWARE BRICKING, DATA LOSS, COMPROMISED
              PASSWORDS, NETWORK OUTAGES, RANSOMWARE EXPOSURE, OR ANY REGULATORY
              SANCTIONS OR FINES IMPOSED BY PRIVACY ENFORCEMENT BODIES.
            </p>
            <p className="text-zinc-400">
              THE AGGREGATE CUMULATIVE LIABILITY OF THE PLATFORM AND ITS
              OPERATORS TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THIS
              PLATFORM OR SERVICE SHALL UNDER NO CIRCUMSTANCES EXCEED{" "}
              <strong>ZERO DOLLARS ($0.00 USD)</strong>.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-md bg-[#3D8BFF]/20 text-[#3D8BFF] flex items-center justify-center font-mono text-xs">
                06
              </span>
              <h3>
                User Responsibilities, Credentials &amp; Account Protection
              </h3>
            </div>
            <p>
              As an authenticated user, you agree that you are solely
              responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
              <li>
                Using a unique, sacrificial password that is never reused on any
                critical, banking, or corporate accounts.
              </li>
              <li>
                Safeguarding all device enrollment tokens and API access
                credentials against unauthorized local inspection.
              </li>
              <li>
                Decommissioning and revoking agent tokens via the Device Profile
                interface when an endpoint is sold, retired, or re-imaged.
              </li>
              <li>
                All telemetry dispatched under your organization ID, whether
                initiated manually or by automated background services.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-md bg-[#3D8BFF]/20 text-[#3D8BFF] flex items-center justify-center font-mono text-xs">
                07
              </span>
              <h3>Complete Indemnification Agreement</h3>
            </div>
            <p>
              You agree to indemnify, defend, and hold harmless NOS, its
              authors, affiliates, operators, and agents from and against any
              and all claims, liabilities, damages, losses, costs, expenses, or
              fees (including reasonable legal fees) arising directly or
              indirectly from: (a) your violation of these Terms; (b)
              unauthorized installation of the agent on devices not belonging to
              you; (c) data loss, breaches, or leaks occurring over plaintext
              HTTP; or (d) any regulatory inquiry resulting from your processing
              of system telemetry.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span className="w-6 h-6 rounded-md bg-[#3D8BFF]/20 text-[#3D8BFF] flex items-center justify-center font-mono text-xs">
                08
              </span>
              <h3>Intellectual Property, License 2026 &amp; Modifications</h3>
            </div>
            <p>
              The NOS platform code, UI design systems, Native AOT collector
              routines, and asset exploration pipelines are protected under
              intellectual property agreements and administered under{" "}
              <strong>License 2026</strong>. Operators retain the exclusive
              right to modify, alter, or update these Terms of Use and Privacy
              Disclaimers at any time. Continued access to the dashboard or
              uninterrupted agent heartbeating following any update constitutes
              full ratification of the revised terms.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold text-base">
              <Mail size={18} />
              <h3>Help Desk, Support &amp; Administrative Contact Details</h3>
            </div>
            <p className="text-zinc-300">
              For security disclosures, platform support, agent installation
              assistance, account inquiries, or legal concerns, please reach out
              to the official NOS administrative desk:
            </p>
            <div className="pt-2 space-y-1 font-mono text-xs">
              <div className="flex items-center gap-2 text-white">
                <span className="text-zinc-500">Official Help Email:</span>
                <a
                  href="mailto:nos.platformm@gmail.com"
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors font-bold"
                >
                  nos.platformm@gmail.com
                </a>
              </div>
              <div className="text-zinc-400">
                <span className="text-zinc-500">Governing License:</span>{" "}
                License 2026 (NOS Neural Operations Sentinel)
              </div>
              <div className="text-zinc-400">
                <span className="text-zinc-500">Operational Jurisdiction:</span>{" "}
                Global Research &amp; Autonomous Systems Collective
              </div>
            </div>
          </section>
        </div>

        {/* Action Buttons at bottom */}
        <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#3D8BFF] to-[#00E5FF] hover:from-blue-600 hover:to-cyan-500 text-white font-semibold text-sm transition-all shadow-[0_0_25px_rgba(61,139,255,0.3)] flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>I Understand &amp; Return to Register</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/[0.08] hover:border-white/[0.2] bg-white/[0.02] text-zinc-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>Back to Landing Page</span>
          </Link>
        </div>

        {/* Footer Credit */}
        <div className="text-center text-xs font-mono text-zinc-500 pt-8">
          © 2026 NOS Platform • License 2026 • Help: nos.platformm@gmail.com
        </div>
      </main>
    </div>
  );
}
