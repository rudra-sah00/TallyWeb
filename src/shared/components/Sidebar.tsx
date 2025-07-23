import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import {
  BarChart3,
  ShoppingCart,
  Package,
  CreditCard,
  FileText,
  Calculator,
  BookOpen,
  Settings,
  Menu,
  X,
  Building2,
  LogOut
} from 'lucide-react';
import AppConfigService from '../../services/config/appConfig';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout?: () => void;
}

interface SidebarLinkProps {
  link: {
    label: string;
    href?: string;
    icon: React.ReactNode;
    onClick?: () => void;
  };
  className?: string;
  open?: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = React.memo(({ link, className, open = true }) => {
  return (
    <button
      onClick={link.onClick}
      className={cn(
        "flex items-center gap-3 group/sidebar py-3 px-3 rounded-lg transition-all duration-300 ease-out w-full text-left",
        "hover:bg-gray-100 dark:hover:bg-neutral-700 hover:scale-[1.02]",
        !open && "justify-center px-2",
        className
      )}
      title={!open ? link.label : undefined}
    >
      <div className="shrink-0 transition-transform duration-300 ease-out group-hover/sidebar:scale-110">
        {link.icon}
      </div>
      <motion.span
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          x: open ? 0 : -10,
          width: open ? "auto" : 0,
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.25, 0.1, 0.25, 1],
          opacity: { duration: open ? 0.4 : 0.2, delay: open ? 0.1 : 0 }
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition-transform duration-300 ease-out whitespace-nowrap overflow-hidden"
      >
        {link.label}
      </motion.span>
    </button>
  );
});

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout }) => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hoverTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = React.useCallback(() => {
    if (onLogout) {
      onLogout();
    } else {
      // Fallback to the old method if no onLogout prop is provided
      const appConfig = AppConfigService.getInstance();
      appConfig.resetConfig();
      window.location.reload();
    }
  }, [onLogout]);

  // Handle mouse enter/leave for hover effect with proper debouncing
  const handleMouseEnter = React.useCallback(() => {
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setOpen(true);
      }, 100);
    }
  }, [isMobile]);

  const handleMouseLeave = React.useCallback(() => {
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setOpen(false);
      }, 300);
    }
  }, [isMobile]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  const links = React.useMemo(() => [
    {
      label: "Dashboard",
      id: "dashboard",
      icon: <BarChart3 className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('dashboard');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Sales",
      id: "sales",
      icon: <ShoppingCart className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('sales');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Purchases",
      id: "purchases",
      icon: <Package className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('purchases');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Inventory",
      id: "inventory",
      icon: <Package className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('inventory');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Expenses",
      id: "expenses",
      icon: <CreditCard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('expenses');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Reports",
      id: "reports",
      icon: <FileText className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('reports');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "GST",
      id: "gst",
      icon: <Calculator className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('gst');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Ledger",
      id: "ledger",
      icon: <BookOpen className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('ledger');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Company",
      id: "company",
      icon: <Building2 className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('company');
        if (isMobile) setOpen(false);
      }
    },
    {
      label: "Settings",
      id: "settings",
      icon: <Settings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        onViewChange('settings');
        if (isMobile) setOpen(false);
      }
    },
  ], [onViewChange, isMobile]);

  return (
    <>
      {/* Mobile menu button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-white rounded-lg shadow-lg border border-gray-200"
        onClick={() => setOpen(!open)}
      >
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </motion.div>
      </motion.button>

      {/* Mobile overlay */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: open ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="lg:hidden fixed inset-0 bg-black z-40"
          style={{ 
            pointerEvents: open ? 'auto' : 'none',
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <motion.div 
        initial={false}
        animate={{ 
          width: open ? 256 : 64,
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.25, 0.1, 0.25, 1] // Custom cubic-bezier for smooth easing
        }}
        className={cn(
          "fixed top-0 left-0 h-full bg-gray-50 dark:bg-neutral-800 z-50 border-r border-neutral-200 dark:border-neutral-700 overflow-hidden",
          "transform lg:translate-x-0 shadow-lg",
          isMobile ? (open ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        )}
        style={{
          transition: isMobile ? 'transform 0.3s ease-out' : 'none'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-center">
              <motion.div
                animate={{
                  justifyContent: open ? "flex-start" : "center",
                }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex items-center space-x-2 w-full"
              >
                <motion.div
                  animate={{
                    scale: open ? 1 : 1.1,
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <Building2 className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <motion.span
                  initial={false}
                  animate={{
                    opacity: open ? 1 : 0,
                    x: open ? 0 : -20,
                    width: open ? "auto" : 0,
                  }}
                  transition={{ 
                    duration: 0.4, 
                    ease: [0.25, 0.1, 0.25, 1],
                    opacity: { duration: open ? 0.4 : 0.2, delay: open ? 0.1 : 0 }
                  }}
                  className="font-medium text-black dark:text-white text-lg whitespace-nowrap overflow-hidden"
                >
                  Tally Web
                </motion.span>
              </motion.div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="px-3 space-y-1">
              {links.map((link, idx) => (
                <motion.div 
                  key={idx} 
                  initial={false}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "rounded-lg transition-colors duration-200",
                    currentView === link.id && "bg-blue-50 dark:bg-blue-950"
                  )}
                >
                  <SidebarLink 
                    link={link}
                    open={open}
                    className={cn(
                      currentView === link.id && "text-blue-600 dark:text-blue-400"
                    )}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
            <SidebarLink
              open={open}
              link={{
                label: "Admin",
                icon: (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                    A
                  </div>
                ),
                onClick: handleLogout
              }}
            />
            <motion.div
              initial={false}
              animate={{ 
                opacity: open ? 1 : 0,
                height: open ? "auto" : 0,
                marginTop: open ? 8 : 0,
              }}
              transition={{ 
                duration: 0.4, 
                ease: [0.25, 0.1, 0.25, 1],
                opacity: { duration: open ? 0.4 : 0.2, delay: open ? 0.1 : 0 }
              }}
              className="px-3 overflow-hidden"
            >
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors w-full py-2 hover:bg-red-50 rounded-lg px-2"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">Logout</span>
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
