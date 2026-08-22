"use client";

import { motion, useReducedMotion } from "framer-motion";
import { pageTransition, pageTransitionConfig } from "@/lib/motion";

export function MotionPageTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="dashboard-page-transition"
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      exit={reduceMotion ? undefined : "exit"}
      variants={pageTransition}
      transition={reduceMotion ? { duration: 0 } : pageTransitionConfig}
    >
      {children}
    </motion.div>
  );
}
