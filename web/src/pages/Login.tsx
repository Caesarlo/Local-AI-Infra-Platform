import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

type Mode = "admin" | "user";

const modeConfig = {
  admin: {
    title: "管理员登录",
    emailLabel: "管理员邮箱",
    passwordLabel: "密码",
    auxLink: "忘记 Token？",
    submitText: "登录控制台",
  },
  user: {
    title: "用户登录",
    emailLabel: "用户邮箱 / 账号",
    passwordLabel: "密码",
    auxLink: "获取访问凭证",
    submitText: "进入平台",
  },
};

export default function Login() {
  const [mode, setMode] = useState<Mode>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const config = modeConfig[mode];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password }, mode);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-page-gradient flex flex-col items-center justify-center px-4 py-16">
      {/* Brand header */}
      <div className="mb-8 text-center">
        <img
          src="/img/main.png"
          alt="AI Infra Platform"
          className="h-60 w-auto mb-3 mx-auto"
        />
      </div>

      {/* Main card */}
      <div className="glass-card w-full max-w-[420px] p-8">
        {/* Segmented tabs */}
        <div className="glass-inner flex p-1 mb-8 shadow-glass-sm">
          {(["admin", "user"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 text-sm font-medium transition-all ${
                mode === m
                  ? m === "admin"
                    ? "tab-active-admin"
                    : "tab-active"
                  : "tab-inactive"
              }`}
            >
              {modeConfig[m].title}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">
              {config.emailLabel}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={config.emailLabel}
              required
              className="glass-input w-full h-[52px] px-4 text-sm"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">
              {config.passwordLabel}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={config.passwordLabel}
              required
              className="glass-input w-full h-[52px] px-4 text-sm"
            />
          </div>

          {/* Options row */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-white/50 accent-[#334455]"
              />
              <span className="text-xs text-text-muted">记住此设备</span>
            </label>
            <button
              type="button"
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              {config.auxLink}
            </button>
          </div>

          {/* Primary action */}
          <button
            type="submit"
            disabled={loading}
            className="btn-gradient w-full h-[52px] mt-1 disabled:opacity-60"
          >
            {loading ? "登录中…" : config.submitText}
          </button>

          {/* Ghost action */}
          <a
            href="/docs"
            className="btn-ghost w-full h-[44px] flex items-center justify-center"
          >
            查看公开文档
          </a>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center space-y-1.5">
        <p className="text-2xs text-text-subtle">
          仅限授权用户访问，所有操作将写入审计日志
        </p>
        <p className="text-2xs text-text-subtle">
          HTTPS 传输 · 访问控制 · 审计留痕
        </p>
      </div>
    </div>
  );
}
