"use client";

export function TestimonialSection() {
  return (
    <section className="testimonial-section page-width">
      <div className="quote-mark">“</div>
      <blockquote>
        “NOS turned our distributed fleet into a seamless, self-healing stream.{" "}
        <em>Zero dropped telemetry</em>, zero alert fatigue, and instant
        cryptographic visibility across thousands of nodes.”
      </blockquote>
      <div className="quote-byline">
        <span className="quote-avatar">PA</span>
        <span>
          <b>Platform Architecture Team</b>
          <small>Cloud Infrastructure & Edge Operations</small>
        </span>
        <span className="quote-rating">★★★★★</span>
      </div>
    </section>
  );
}
