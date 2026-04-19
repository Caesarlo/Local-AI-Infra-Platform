import Audit from "@/pages/Audit";
import CardExample from "@/pages/CardExample";
import Dashboard from "@/pages/Dashboard";
import Keys from "@/pages/Keys";
import Login from "@/pages/Login";
import Logs from "@/pages/Logs";
import Models from "@/pages/Models";
import Usage from "@/pages/Usage";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { Shell } from "@/components/layout/Shell";

export default function App() {
  return (
    <BrowserRouter>
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
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  );
}
