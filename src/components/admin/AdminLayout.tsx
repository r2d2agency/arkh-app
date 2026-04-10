import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AIAssistant from "@/components/church/AIAssistant";

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
      <AIAssistant />
    </div>
  );
};

export default AdminLayout;
