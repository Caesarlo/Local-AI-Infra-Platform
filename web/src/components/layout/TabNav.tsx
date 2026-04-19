import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Models", path: "/models" },
  { label: "API Keys", path: "/keys" },
  { label: "Usage", path: "/usage" },
  { label: "Logs", path: "/logs" },
];

function isTabActive(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function TabNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-3">
      {tabs.map((tab) => {
        const active = isTabActive(location.pathname, tab.path);
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className={cn(
              "flex h-[50px] w-[100px] items-center justify-center rounded-2xl text-sm transition-colors",
              active
                ? "bg-[#111111] font-semibold text-white"
                : "bg-[#EEEEEE] font-normal text-[#3F3F3F] hover:bg-[#E0E0E0]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
