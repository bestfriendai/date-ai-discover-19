
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { 
    opacity: 0,
    y: 20
  },
  in: { 
    opacity: 1,
    y: 0
  },
  out: { 
    opacity: 0,
    y: -20
  }
};

const pageTransition = {
  type: "spring",
  stiffness: 300,
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
