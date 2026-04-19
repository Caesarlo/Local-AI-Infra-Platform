import { Search } from "lucide-react";
import { TabNav } from "./TabNav";

type HeaderProps = {
  actions?: React.ReactNode;
};

export function Header({ actions }: HeaderProps) {
  return (
    <header className="glass-card flex h-[72px] shrink-0 items-center justify-between px-5">
      <TabNav />
      <div className="flex items-center gap-3">
        {actions}
        <div className="flex h-[44px] w-[150px] items-center gap-2 rounded-full bg-white/40 px-4 backdrop-blur-sm border border-white/50">
          <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <span className="text-sm text-text-muted">搜索项目 / Key</span>
        </div>
      </div>
    </header>
  );
}
