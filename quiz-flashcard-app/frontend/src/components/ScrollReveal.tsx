import React, { useEffect, useRef, useState, ReactNode } from 'react';

type AnimationType =
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'scale-up'
  | 'scale-in'
  | 'rotate-in'
  | 'blur-in'
  | 'clip-up'
  | 'clip-left'
  | 'bar-grow';

interface ScrollRevealProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;
  duration?: 'fast' | 'normal' | 'slow' | 'slower';
  threshold?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  stagger?: boolean;
  staggerFast?: boolean;
}

const animationClasses: Record<AnimationType, string> = {
  'fade-up': 'scroll-fade-up',
  'fade-down': 'scroll-fade-down',
  'fade-left': 'scroll-fade-left',
  'fade-right': 'scroll-fade-right',
  'scale-up': 'scroll-scale-up',
  'scale-in': 'scroll-scale-in',
  'rotate-in': 'scroll-rotate-in',
  'blur-in': 'scroll-blur-in',
  'clip-up': 'scroll-clip-up',
  'clip-left': 'scroll-clip-left',
  'bar-grow': 'scroll-bar-grow',
};

const durationClasses: Record<string, string> = {
  fast: 'scroll-duration-fast',
  normal: '',
  slow: 'scroll-duration-slow',
  slower: 'scroll-duration-slower',
};

const delayClasses: Record<number, string> = {
  100: 'scroll-delay-100',
  200: 'scroll-delay-200',
  300: 'scroll-delay-300',
  400: 'scroll-delay-400',
  500: 'scroll-delay-500',
  600: 'scroll-delay-600',
  700: 'scroll-delay-700',
  800: 'scroll-delay-800',
};

export function ScrollReveal({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 'normal',
  threshold = 0.1,
  className = '',
  as: Component = 'div',
  stagger = false,
  staggerFast = false,
}: ScrollRevealProps): React.ReactElement {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  const animationClass = animationClasses[animation];
  const durationClass = durationClasses[duration];
  const delayClass = delay > 0 ? delayClasses[delay] || '' : '';
  const staggerClass = stagger ? 'scroll-stagger' : staggerFast ? 'scroll-stagger-fast' : '';

  const classes = [
    animationClass,
    durationClass,
    delayClass,
    staggerClass,
    isVisible ? 'visible' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return React.createElement(
    Component,
    { ref, className: classes },
    children
  );
}

// Wrapper component for section reveals
interface SectionRevealProps {
  children: ReactNode;
  className?: string;
}

export function SectionReveal({ children, className = '' }: SectionRevealProps): React.ReactElement {
  return (
    <ScrollReveal animation="fade-up" className={className}>
      {children}
    </ScrollReveal>
  );
}

// Staggered list reveal
interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  fast?: boolean;
}

export function StaggerReveal({ children, className = '', fast = false }: StaggerRevealProps): React.ReactElement {
  return (
    <ScrollReveal
      animation="fade-up"
      stagger={!fast}
      staggerFast={fast}
      className={className}
    >
      {children}
    </ScrollReveal>
  );
}

export default ScrollReveal;
