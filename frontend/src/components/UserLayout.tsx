import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import BackgroundScanWidget from "./BackgroundScanWidget";

export default function UserLayout() {
  return (
    <div className="app-shell" id="app-shell">
      <Sidebar />
      <BackgroundScanWidget />
      <div className="app-main-content">
        <Outlet />
      </div>
    </div>
  );
}
