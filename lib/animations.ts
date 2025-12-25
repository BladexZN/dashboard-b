/**
 * Apple-Style Animation Utilities for Framer Motion
 * Provides spring configurations and animation variants for consistent UI animations
 */

// Spring configurations - Apple uses physics-based animations
export const springConfig = {
  // Standard spring for most UI elements
  default: { type: "spring" as const, stiffness: 300, damping: 30 },

  // Snappy spring for buttons and small interactions
  snappy: { type: "spring" as const, stiffness: 500, damping: 30 },

  // Gentle spring for larger elements like modals and drawers
  gentle: { type: "spring" as const, stiffness: 200, damping: 25 },

  // Bouncy spring for attention-grabbing animations
  bouncy: { type: "spring" as const, stiffness: 400, damping: 15 },

  // Slow spring for page transitions
  slow: { type: "spring" as const, stiffness: 100, damping: 20 },
};

// Fade variants
export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: springConfig.default
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  },
};

// Scale + Fade variants (for modals, cards, popovers)
export const scaleVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springConfig.default,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// Slide from right variants (for drawers, side panels)
export const slideRightVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: springConfig.gentle,
  },
  exit: {
    x: "100%",
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// Slide from left variants
export const slideLeftVariants = {
  hidden: { x: "-100%" },
  visible: {
    x: 0,
    transition: springConfig.gentle,
  },
  exit: {
    x: "-100%",
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// Slide from bottom variants (for mobile sheets, notifications)
export const slideUpVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: springConfig.gentle,
  },
  exit: {
    y: "100%",
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// Slide from top variants (for dropdowns)
export const slideDownVariants = {
  hidden: {
    opacity: 0,
    y: -10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig.snappy,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15 },
  },
};

// Stagger children animation (for lists, grids)
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  hidden: {
    opacity: 0,
    y: 10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig.default,
  },
};

// Fast stagger for quick lists
export const fastStaggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

// Button interactions
export const buttonTap = { scale: 0.97 };
export const buttonHover = { scale: 1.02 };

// Card hover effects
export const cardHover = {
  y: -4,
  transition: springConfig.snappy,
};

export const cardTap = {
  scale: 0.98,
};

// Backdrop animation
export const backdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  },
};

// Icon animations
export const iconSpin = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export const iconPulse = {
  animate: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

// Notification badge bounce
export const badgeBounce = {
  initial: { scale: 0 },
  animate: {
    scale: 1,
    transition: springConfig.bouncy,
  },
};

// Checkbox check animation
export const checkVariants = {
  unchecked: { pathLength: 0 },
  checked: {
    pathLength: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

// Page transition variants
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: springConfig.gentle,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

// Tooltip variants
export const tooltipVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 5
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springConfig.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.1 },
  },
};

// Reduced motion fallback
export const reducedMotionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
  exit: { opacity: 0, transition: { duration: 0.01 } },
};
