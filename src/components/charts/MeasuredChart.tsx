'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

interface ChartSize {
  width: number;
  height: number;
}

interface MeasuredChartProps {
  className: string;
  children: (size: ChartSize) => ReactNode;
  fallbackClassName?: string;
}

/**
 * Recharts can warn when it renders before its parent has a measurable size.
 * This wrapper waits for a positive ResizeObserver measurement and then passes
 * numeric dimensions directly to the chart.
 */
export function MeasuredChart({
  className,
  children,
  fallbackClassName = 'rounded-xl bg-[#FAFAFA]',
}: MeasuredChartProps) {
  const frameRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<ChartSize | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width < 1 || height < 1) return;

      setSize((previous) => {
        if (previous?.width === width && previous.height === height) {
          return previous;
        }

        return { width, height };
      });
    };

    const scheduleMeasure = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(measure);
    };

    measure();

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div ref={rootRef} className={className}>
      {size ? children(size) : <div className={`h-full w-full ${fallbackClassName}`} aria-hidden="true" />}
    </div>
  );
}
