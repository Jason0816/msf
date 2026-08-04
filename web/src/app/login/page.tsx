import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, LogIn, Network, Server, Shield, User } from "lucide-react";
import { LoginLogoShowcase } from "@/components/login/LoginLogoShowcase";
import { GlassFilterDefs } from "@/components/liquid-glass/GlassFilterDefs";
import { SceneBackdrop } from "@/components/liquid-glass/SceneBackdrop";
import { useAuth } from "@/lib/auth";
import { api, apiData } from "@/lib/api";

const features = [
  { icon: Server, label: "DNS 服务" },
  { icon: Shield, label: "代理管理" },
  { icon: Network, label: "网络优化" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [releaseVersion, setReleaseVersion] = useState("未知");

  useEffect(() => {
    let cancelled = false;
    api<any>("/api/v1/version", { skipAuth: true })
      .then((payload) => {
        const version = apiData<{ version?: string }>(payload)?.version;
        if (!cancelled && version) {
          setReleaseVersion(`v ${version}`);
        }
      })
      .catch(() => {
        /* leave as 未知 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      const state = location.state as { from?: unknown } | null;
      const stateRedirect = typeof state?.from === "string" ? state.from : "";
      const redirect = stateRedirect || params.get("redirect") || "/";
      navigate(redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gary-public-page flex">
      <SceneBackdrop />
      <GlassFilterDefs />
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="relative z-10 text-center space-y-4 max-w-lg">
          <div className="flex flex-col items-center gap-6">
            <LoginLogoShowcase />
          </div>
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-4xl font-bold tracking-tight text-foreground xl:text-5xl">
              MSF 管理平台
            </h1>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              统一管理您的网络服务，提供 DNS 分流、代理管理等功能
            </p>
          </div>
          <div className="flex justify-center gap-8 pt-3 opacity-70">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.label} className="flex flex-col items-center gap-2">
                  <div className="gary-solid-plate flex h-12 w-12 items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">{feature.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div
          data-login-version
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground"
        >
          {releaseVersion}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="gary-public-card w-full max-w-md animate-scale-in text-card-foreground">
          <div className="p-8 pb-4">
            <div className="mb-6 flex justify-center lg:hidden">
              <LoginLogoShowcase compact />
            </div>
            <p className="text-base font-medium text-muted-foreground">欢迎使用 MSF</p>
          </div>
          <div className="px-8 pb-8">
            <form className="space-y-5" onSubmit={submit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">用户名</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-primary" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="请输入用户名"
                    className="gary-field w-full py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">密码</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-primary" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入密码"
                    className="gary-field w-full py-3 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label="显示密码"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>}

              <button
                type="submit"
                disabled={busy}
                className="gary-glass-button gary-glass-button--primary mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-medium disabled:opacity-60"
              >
                <LogIn className="h-5 w-5" />
                {busy ? "登录中..." : "登录"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">请使用初始化时创建的账号登录</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
