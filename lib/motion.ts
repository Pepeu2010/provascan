import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion language for the product. Keep UI feedback quick enough that
 * it never delays classroom work, and reserve springs for direct interaction.
 */
export const motionTokens = {
  duration: {
    fast: 0.14,
    normal: 0.2,
    emphasis: 0.28,
  },
  ease: {
    enter: [0.16, 1, 0.3, 1],
    exit: [0.65, 0, 0.35, 1],
  },
  spring: {
    type: "spring",
    stiffness: 380,
    damping: 30,
    mass: 0.8,
  },
} as const;

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const pageTransitionConfig: Transition = {
  duration: motionTokens.duration.emphasis,
  ease: motionTokens.ease.enter,
};

export const dialogTransition: Transition = {
  ...motionTokens.spring,
  stiffness: 340,
  damping: 27,
};
