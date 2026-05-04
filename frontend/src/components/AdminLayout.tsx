import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
  return (
    <div 
      className="admin-shell" 
      style={{ 
        display: "flex", 
        minHeight: "100vh", 
        width: "100%", 
        overflow: "hidden",
        backgroundColor: "var(--admin-bg-primary)",
        color: "var(--admin-text-primary)"
      }}
    >
      <AdminSidebar />
      <div 
        className="admin-main-content" 
        style={{ 
          flex: 1, 
          height: "100vh",
          overflowY: "auto", 
          position: "relative" 
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
