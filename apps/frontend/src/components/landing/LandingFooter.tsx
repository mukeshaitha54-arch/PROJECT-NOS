"use client";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer page-width py-8">
      <a className="brand footer-brand" href="#top">
        <span className="brand-mark footer-mark" aria-hidden="true">
          <svg viewBox="0 0 40 40">
            <path d="M12 28V12h9.5a6.5 6.5 0 0 1 0 13H12m8 0 8 3" />
          </svg>
        </span>
        <span>
          NOS<span className="brand-period">.</span>
        </span>
      </a>
      <span className="mirror-text">
        Built for resilience. Designed to never drop a datapoint.
      </span>
      <span className="mirror-text">
        © {currentYear} NOS Neural Operations Sentinel
      </span>
    </footer>
  );
}
