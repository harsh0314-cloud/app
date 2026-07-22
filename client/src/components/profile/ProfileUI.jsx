import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Added for smooth navigation

export const EmptyState = ({ icon: Icon, title, description, action, actionLink }) => {
  const navigate = useNavigate();
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        <button 
          onClick={() => navigate(actionLink || '/products')} // Smooth SPA navigation
          className="border border-foreground px-8 py-3 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white"
        >
          {action}
        </button>
      )}
    </motion.div>
  );
};

export const SkeletonCard = () => (
  <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6"></div>
    <div className="flex gap-4">
      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

export const StatCard = ({ title, value, icon: Icon, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    transition={{ duration: 0.2 }}
    className={`p-6 rounded-xl border border-border bg-white dark:bg-gray-800 hover:shadow-lg transition-all duration-300`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{title}</p>
  </motion.div>
);

export const SectionTitle = ({ children }) => (
  <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
    {children}
  </h2>
);

export const ComingSoonCard = ({ title, description, icon: Icon }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
      <Icon size={24} className="text-gray-400" />
    </div>
    <h3 className="font-display text-lg font-bold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
    <span className="mt-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-gray-300 dark:border-gray-600 px-3 py-1 rounded-full">Coming Soon</span>
  </div>
);