import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Status } from "@/components/ui/StatusDot";
import { StatusDot } from "@/components/ui/StatusDot";
import { useAuth } from "@/hooks/useAuth";
import { useHardwareMetrics } from "@/hooks/useHardwareMetrics";
import { LogOut, Settings } from "lucide-react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-text-muted">{children}</p>;
}

function InnerCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-inner rounded-[10px] px-3.5 py-3">{children}</div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[13px]">
      <span className="text-text-muted">{label}</span>{" "}
      <span className="font-medium text-text-secondary">{value}</span>
    </p>
  );
}

function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <InnerCard>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </InnerCard>
  );
}

export function NodeMonitor() {
  const { data, isLoading, isError } = useHardwareMetrics();
  const { logout } = useAuth();

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-5 py-6">
        <div className="flex items-center gap-2.5">
          <img
            src="/img/GPU.png"
            alt="logo"
            className="h-12 w-16 rounded-lg object-cover"
          />
          <span className="text-[20px] font-bold text-text-primary">
            AI Infra Platform
          </span>
        </div>

        {/* Server info */}
        {isLoading ? (
          <SkeletonCard rows={2} />
        ) : isError ? (
          <InnerCard>
            <p className="text-[13px] text-text-muted">无法获取节点信息</p>
          </InnerCard>
        ) : (
          <InnerCard>
            <p className="text-[14px] font-semibold text-text-primary">
              {data!.server.name}
            </p>
            <p className="mt-1.5 text-[12px] text-text-muted">
              {data!.server.subtitle}
            </p>
          </InnerCard>
        )}

        {/* Resources */}
        <SectionLabel>Resources</SectionLabel>
        {isLoading ? (
          <SkeletonCard rows={5} />
        ) : isError ? (
          <InnerCard>
            <p className="text-[13px] text-text-muted">—</p>
          </InnerCard>
        ) : (
          <InnerCard>
            <div className="flex flex-col gap-2">
              <MetricLine label="GPU" value={data!.resources.gpu} />
              <MetricLine label="VRAM" value={data!.resources.vram} />
              <MetricLine label="CPU" value={data!.resources.cpu} />
              <MetricLine label="RAM" value={data!.resources.ram} />
              <MetricLine label="Network" value={data!.resources.network} />
            </div>
          </InnerCard>
        )}

        {/* Services */}
        <SectionLabel>Services</SectionLabel>
        {isLoading ? (
          <SkeletonCard rows={5} />
        ) : isError ? (
          <InnerCard>
            <p className="text-[13px] text-text-muted">—</p>
          </InnerCard>
        ) : (
          <InnerCard>
            <div className="flex flex-col gap-2">
              <MetricLine label="Requests" value={data!.services.requests} />
              <MetricLine label="Queue" value={data!.services.queue} />
              {/* StatusDot for live health indicator */}
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-text-muted">Status</span>
                <StatusDot
                  status={(data!.services.status as Status) ?? "offline"}
                  withLabel
                />
              </div>
              <MetricLine
                label="Latency P95"
                value={data!.services.latencyP95}
              />
              <MetricLine label="Error Rate" value={data!.services.errorRate} />
            </div>
          </InnerCard>
        )}

        {/* Alerts */}
        <SectionLabel>Alerts</SectionLabel>
        {isLoading ? (
          <SkeletonCard rows={2} />
        ) : !data || data.alerts.length === 0 ? (
          <p className="text-[13px] text-text-subtle">无告警</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {data.alerts.map((alert) => (
              <Badge
                key={alert.id}
                variant={alert.level === "error" ? "error" : "warning"}
                className="w-full justify-start"
              >
                {alert.message}
              </Badge>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Profile card */}
        <InnerCard>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="glass-round-icon h-9 w-9 shrink-0">
                <span className="text-xs font-semibold text-text-secondary">
                  A
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-text-primary">
                  Ops Admin
                </p>
                <p className="text-[12px] text-text-muted">Platform Owner</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                leftIcon={<Settings className="h-3.5 w-3.5" />}
              >
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                leftIcon={<LogOut className="h-3.5 w-3.5" />}
                onClick={logout}
              >
                Logout
              </Button>
            </div>
          </div>
        </InnerCard>
      </div>
    </div>
  );
}
