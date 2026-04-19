import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { Shell } from "@/components/layout/Shell";

const Audit = lazy(() => import("@/pages/Audit"));
const CardExample = lazy(() => import("@/pages/CardExample"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Keys = lazy(() => import("@/pages/Keys"));
const Login = lazy(() => import("@/pages/Login"));
const Logs = lazy(() => import("@/pages/Logs"));
const Models = lazy(() => import("@/pages/Models"));
const Usage = lazy(() => import("@/pages/Usage"));

function RouteFallback() {
  return <div className="min-h-screen bg-page-gradient" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/card-example" element={<CardExample />} />

          <Route element={<RequireAuth />}> 
            <Route element={<Shell />}> 
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/models" element={<Models />} />
              <Route path="/models/config/new" element={<Models />} />
              <Route path="/models/config/:id/edit" element={<Models />} />
              <Route path="/keys" element={<Keys />} />
              <Route path="/keys/new" element={<Keys />} />
              <Route path="/keys/:id/edit" element={<Keys />} />
              <Route path="/usage" element={<Usage />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/audit" element={<Audit />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  );
}
