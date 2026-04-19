import { Skeleton } from "@/components/ui/Skeleton";
import { useHardwareMetrics } from "@/hooks/useHardwareMetrics";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle } from "lucide-react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-text-muted">{children}</p>
  );
}

function InnerCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-inner rounded-[10px] px-3.5 py-3">{children}</div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[13px] text-text-body">
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
        {/* Title */}
        <p className="text-[18px] font-bold text-text-primary">Node Monitor</p>

        {/* Server info */}
        {isLoading ? (
          <SkeletonCard rows={2} />
        ) : isError ? (
          <InnerCard>
            <p className="text-[13px] text-text-muted">无法获取节点信息</p>
          </InnerCard>
        ) : (
          <InnerCard>
            <p className="text-[14px] font-semibold text-text-primary">{data!.server.name}</p>
            <p className="mt-1.5 text-[12px] text-text-muted">{data!.server.subtitle}</p>
          </InnerCard>
        )}

        {/* Resources */}
        <SectionLabel>Resources</SectionLabel>
        {isLoading ? (
          <SkeletonCard rows={5} />
        ) : isError ? (
          <InnerCard><p className="text-[13px] text-text-muted">—</p></InnerCard>
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
          <InnerCard><p className="text-[13px] text-text-muted">—</p></InnerCard>
        ) : (
          <InnerCard>
            <div className="flex flex-col gap-2">
              <MetricLine label="Requests" value={data!.services.requests} />
              <MetricLine label="Queue" value={data!.services.queue} />
              <MetricLine label="Status" value={data!.services.status} />
              <MetricLine label="Latency P95" value={data!.services.latencyP95} />
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
          <InnerCard>
            <div className="flex flex-col gap-2">
              {data.alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <p className="text-[13px] text-text-body">{alert.message}</p>
                </div>
              ))}
            </div>
          </InnerCard>
        )}

        {/* Spacer pushes profile to bottom */}
        <div className="flex-1" />

        {/* Profile card */}
        <InnerCard>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="glass-round-icon h-9 w-9 shrink-0 bg-[#334455]/20">
                <span className="text-xs font-semibold text-text-secondary">A</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-text-primary">Ops Admin</p>
                <p className="text-[12px] text-text-muted">Platform Owner</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex h-[38px] w-full items-center justify-center rounded-[10px] bg-white/40 text-[13px] font-semibold text-text-secondary transition-colors hover:bg-white/60 border border-white/50"
            >
              Settings / Logout
            </button>
          </div>
        </InnerCard>
      </div>
    </div>
  );
}
