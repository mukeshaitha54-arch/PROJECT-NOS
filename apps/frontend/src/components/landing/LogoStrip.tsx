"use client";

export function LogoStrip() {
  return (
    <section className="logo-strip page-width" aria-label="Connected platforms">
      <p>CONNECTS NATIVELY WITH YOUR INFRASTRUCTURE AND RUNTIMES</p>
      <div className="integrations">
        <span>
          <b className="integration-crm">L</b> Linux (Ubuntu/Debian)
        </span>
        <span>
          <b className="integration-chat">W</b> Windows Server
        </span>
        <span>
          <b className="integration-billing">M</b> macOS Darwin
        </span>
        <span>
          <b className="integration-docs">D</b> Docker Engine
        </span>
        <span>
          <b className="integration-forms">K</b> Kubernetes
        </span>
        <span className="more-tools">+ edge daemons</span>
      </div>
    </section>
  );
}
