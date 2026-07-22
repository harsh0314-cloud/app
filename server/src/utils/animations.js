// ============================================
// PREMIUM ANIMATION VARIANTS (Framer Motion)
// ============================================

// Fade Up - Most commonly used
export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Fade Up with Stagger for lists
export const fadeUpStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Fade In
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Fade In Slow
export const fadeInSlow = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Blur Reveal - Premium reveal effect
export const blurReveal = {
  hidden: { opacity: 0, filter: "blur(10px)", scale: 0.98 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Scale In
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Slide In from Left
export const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Slide In from Right
export const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Slide Up (for drawers/modals)
export const slideUp = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    y: "100%",
    transition: {
      duration: 0.4,
      ease: [0.65, 0, 0.35, 1],
    },
  },
};

// Slide from Right (for cart drawer)
export const slideFromRight = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    x: "100%",
    transition: {
      duration: 0.4,
      ease: [0.65, 0, 0.35, 1],
    },
  },
};

// Overlay fade
export const overlayFade = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Hero Text Reveal (line by line)
export const heroTextReveal = {
  hidden: { opacity: 0, y: 80 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 1,
      delay: i * 0.15,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// Image Reveal with Mask
export const imageReveal = {
  hidden: { 
    clipPath: "inset(100% 0 0 0)" 
  },
  visible: {
    clipPath: "inset(0% 0 0 0)",
    transition: {
      duration: 1,
      ease: [0.65, 0, 0.35, 1],
    },
  },
};

// Parallax
export const parallax = {
  initial: { y: 0 },
  animate: (scrollY) => ({
    y: scrollY * 0.3,
    transition: { type: "tween", duration: 0 },
  }),
};

// Nav animation
export const navVariants = {
  hidden: { 
    opacity: 0, 
    y: -20 
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// Page Transition
export const pageTransition = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Scroll-triggered viewport settings
export const viewportSettings = {
  once: true,
  margin: "-80px",
  amount: 0.2,
};

// Magnetic button effect helper
export const magneticHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 25,
  },
};

// Card hover
export const cardHover = {
  rest: { 
    y: 0, 
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)" 
  },
  hover: { 
    y: -8, 
    boxShadow: "0 16px 48px rgba(0,0,0,0.12)" 
  },
  transition: {
    duration: 0.4,
    ease: [0.16, 1, 0.3, 1],
  },
};

// Number counter animation
export const counterAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
};