import type { Variants } from 'framer-motion';

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.15, ease: 'easeOut' } },
};

/** RwaSubmitForm exit — fade down */
export const formHandoffExit: Variants = {
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20, transition: { duration: 0.45, ease: 'easeIn' } },
};

/** AgentCouncilPanel entrance after submit */
export const councilHandoffEnter: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 },
  },
};

/** Agent orb pulse while thinking */
export const orbPulse: Variants = {
  idle: { scale: 1, boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)' },
  thinking: {
    scale: [1, 1.06, 1],
    boxShadow: [
      '0 0 0 0 rgba(139, 92, 246, 0.4)',
      '0 0 20px 4px rgba(139, 92, 246, 0.35)',
      '0 0 0 0 rgba(139, 92, 246, 0)',
    ],
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
  },
};

/** Council cards slide outward on consensus climax */
export const councilCardClimax: Variants = {
  active: { opacity: 1, x: 0, y: 0, scale: 1 },
  exit: (i: number) => ({
    opacity: 0.5,
    x: i % 2 === 0 ? -48 : 48,
    y: i < 2 ? -24 : 24,
    scale: 0.92,
    transition: { duration: 0.6, ease: 'easeInOut' },
  }),
};

/** NFT holographic card spring reveal */
export const nftClimaxReveal: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.8, rotateX: 12 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { type: 'spring', stiffness: 260, damping: 22, delay: 0.25 },
  },
};
