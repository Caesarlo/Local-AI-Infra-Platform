import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { NodeMonitor } from "./NodeMonitor";

export function Shell() {
  return (
    <div className="h-screen overflow-hidden bg-page-gradient">
      <div className="flex h-full gap-2.5 p-3">
        {/* Left sidebar */}
        <aside className="w-[220px] shrink-0">
          <NodeMonitor />
        </aside>

        {/* Right — header card + content card, stacked */}
        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          <Header />
          <main className="glass-card min-h-0 flex-1 overflow-y-auto p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
