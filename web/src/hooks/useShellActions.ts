import type { ShellContextValue } from "@/components/layout/Shell";
import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";

export function useShellActions(actions: React.ReactNode) {
  const { setActions } = useOutletContext<ShellContextValue>();

  useEffect(() => {
    setActions(actions);
    return () => setActions(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
