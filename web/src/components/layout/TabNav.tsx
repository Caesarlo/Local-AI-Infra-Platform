import { Button } from "@/components/ui/Button";
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
    <nav className="flex items-center gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.path}
          variant={isTabActive(location.pathname, tab.path) ? "primary" : "ghost"}
          size="md"
          onClick={() => navigate(tab.path)}
        >
          {tab.label}
        </Button>
      ))}
    </nav>
  );
}
