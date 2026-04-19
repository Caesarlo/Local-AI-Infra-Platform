import { Input } from "@/components/ui/Input";
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
        <Input
          prefixIcon={<Search className="h-3.5 w-3.5" />}
          placeholder="搜索项目 / Key"
          className="w-[150px]"
        />
      </div>
    </header>
  );
}
