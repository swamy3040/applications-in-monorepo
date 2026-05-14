import { Button } from "../../../@/components/ui/button";
import {
  LayoutDashboard,
  Receipt,
  FolderTree,
  Settings,
  LogOut,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col h-full">
      <div className="p-8">
        <h2 className="text-xl font-bold text-blue-500 tracking-tight flex items-center gap-2">
          <span className="text-2xl">💰</span> Smart Spending
        </h2>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "secondary" : "ghost"}
            className={`w-full justify-start gap-3 h-11 ${
              activeTab === item.id
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="size-4" />
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-400 hover:bg-red-900/20 hover:text-red-300"
          onClick={onLogout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
