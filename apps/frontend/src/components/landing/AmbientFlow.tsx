"use client";

import { useEffect, useState, useRef } from "react";

interface WavePathItem {
  key: string;
  className: string;
  d: string;
}

export function AmbientFlow() {
  const [paths, setPaths] = useState<WavePathItem[]>([]);
  const [dimensions, setDimensions] = useState({ width: 1440, height: 4800 });
  const containerRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    function generatePaths() {
      const width = 1440;
      const height = Math.max(
        document.documentElement.scrollHeight || 4800,
        window.innerHeight * 3,
      );
      setDimensions({ width, height });

      const bandSpacing = 950;
      const bandCount = Math.ceil(height / bandSpacing) + 1;

      function makeWavePoints(
        centerY: number,
        phase: number,
        amplitude: number,
        widthFactor = 1,
      ) {
        const points = [];
        const startX = -width * 0.24;
        const endX = width * 1.24;
        const samples = 24;
        for (let i = 0; i <= samples; i++) {
          const progress = i / samples;
          const x = startX + (endX - startX) * progress;
          const wave = Math.sin(progress * Math.PI * 2.5 + phase);
          const secondaryWave = Math.sin(
            progress * Math.PI * 5.5 + phase * 1.35,
          );
          const taper = Math.sin(Math.PI * progress) * 0.25 + 0.75;
          const y =
            centerY +
            (wave * amplitude + secondaryWave * amplitude * 0.22) *
              taper *
              widthFactor;
          points.push({ x, y });
        }
        return points;
      }

      function makeWavePath(points: { x: number; y: number }[]) {
        let path = `M${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];
          const midX = (current.x + next.x) / 2;
          const midY = (current.y + next.y) / 2;
          path += ` Q${current.x} ${current.y} ${midX} ${midY}`;
        }
        const last = points[points.length - 1];
        path += ` L${last.x} ${last.y}`;
        return path;
      }

      function makeBandPath(
        centerY: number,
        phase: number,
        amplitude: number,
        thickness: number,
      ) {
        const centerLine = makeWavePoints(centerY, phase, amplitude);
        const topEdge = centerLine.map((point, index) => {
          const progress = index / (centerLine.length - 1);
          const widthVariation =
            0.72 + Math.sin(progress * Math.PI * 3 + phase) * 0.18;
          return {
            x: point.x,
            y: point.y - (thickness * widthVariation) / 2,
          };
        });
        const bottomEdge = centerLine
          .map((point, index) => {
            const progress = index / (centerLine.length - 1);
            const widthVariation =
              0.72 + Math.sin(progress * Math.PI * 3 + phase) * 0.18;
            return {
              x: point.x,
              y: point.y + (thickness * widthVariation) / 2,
            };
          })
          .reverse();
        return `${makeWavePath([...topEdge, ...bottomEdge])} Z`;
      }

      const generated: WavePathItem[] = [];

      for (let band = 0; band < bandCount; band++) {
        const centerY = band * bandSpacing + 240 + Math.sin(band * 1.7) * 170;
        const phase = band * 1.91;
        const bandMod = band % 3;

        // Glow layer
        generated.push({
          key: `glow-${band}`,
          className: `aurora-glow aurora-band-${bandMod}`,
          d: makeBandPath(centerY, phase, 156, 450),
        });

        // Body layer
        generated.push({
          key: `body-${band}`,
          className: `aurora-body aurora-band-${bandMod}`,
          d: makeBandPath(centerY, phase, 156, 235),
        });

        // Glowing filaments / threads
        for (let strand = 0; strand < 4; strand++) {
          generated.push({
            key: `thread-${band}-${strand}`,
            className: `aurora-thread aurora-thread-${strand} aurora-band-${bandMod}`,
            d: makeWavePath(
              makeWavePoints(
                centerY + (strand - 1.5) * 27,
                phase + strand * 0.34,
                138,
                0.9,
              ),
            ),
          });
        }
      }

      setPaths(generated);
    }

    generatePaths();
    const handleResize = () => generatePaths();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <svg
      ref={containerRef}
      className="ambient-flow"
      aria-hidden="true"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      style={{ height: `${dimensions.height}px` }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="aurora-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#3D8BFF" stopOpacity="0" />
          <stop offset=".14" stopColor="#3D8BFF" stopOpacity=".2" />
          <stop offset=".37" stopColor="#60A5FA" stopOpacity=".55" />
          <stop offset=".56" stopColor="#93C5FD" stopOpacity=".75" />
          <stop offset=".72" stopColor="#38BDF8" stopOpacity=".5" />
          <stop offset=".88" stopColor="#2563EB" stopOpacity=".22" />
          <stop offset="1" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((p) => (
        <path key={p.key} className={p.className} d={p.d} />
      ))}
    </svg>
  );
}
