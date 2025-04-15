
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
      duration: 0.3, 
      delay: delay 
    }}
    whileHover={{ 
      scale: 1.02, 
      transition: { duration: 0.2 } 
    }}
    whileTap={{ scale: 0.98 }}
  >
    {children}
  </motion.div>
);
