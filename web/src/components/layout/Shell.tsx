import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { NodeMonitor } from "./NodeMonitor";

export type ShellContextValue = {
  setActions: (actions: React.ReactNode) => void;
};

export function Shell() {
  const [actions, setActions] = useState<React.ReactNode>(null);

  return (
    <div className="h-screen overflow-hidden bg-page-gradient">
      <div className="flex h-full gap-2.5 p-3">
        <aside className="w-70 shrink-0">
          <NodeMonitor />
        </aside>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          <Header actions={actions} />
          <main className="glass-card min-h-0 flex-1 overflow-hidden">
            <div className="scrollbar-glass h-full overflow-y-auto p-5 pr-3">
              <Outlet context={{ setActions } satisfies ShellContextValue} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
