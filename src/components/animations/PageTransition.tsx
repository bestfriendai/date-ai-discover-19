
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { 
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  in: { 
    opacity: 1,
    y: 0,
    scale: 1
  },
  out: { 
    opacity: 0,
    y: -20,
    scale: 0.98
  }
};

const pageTransition = {
  type: "spring",
  stiffness: 350,
  damping: 30
};

export const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={pageTransition}
    className="h-full w-full"
  >
    {children}
  </motion.div>
);
