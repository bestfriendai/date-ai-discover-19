
import { motion } from 'framer-motion';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedCard = ({ children, delay = 0 }: AnimatedCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ 
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay: delay 
    }}
    whileHover={{ 
      scale: 1.03,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }}
    whileTap={{ scale: 0.98 }}
    className="h-full"
  >
    {children}
  </motion.div>
);
