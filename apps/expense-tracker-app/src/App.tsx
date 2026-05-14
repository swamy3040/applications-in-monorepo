import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "./lib/orpc";
import { UserAuth } from "./components/UserAuth";
import { ResetPassword } from "./components/ResetPassword";
import { Dashboard } from "./components/Dashboard";
import type { User } from "@repo/contract-expense-tracker";

function App() {
  // Track the current URL path to handle "Reset Password" routing
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<"AUTH" | "WORKSPACE" | "INITIAL">("INITIAL");

  // 1. The Gatekeeper Query (Checks for HttpOnly Cookie)
  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery(orpc.auth.getMe.queryOptions());

  // 2. Listen for browser URL changes
  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener("popstate", handleLocationChange);

    // Sync View State based on Auth Status
    if (!isLoading) {
      if (user) {
        setCurrentUser(user);
        setView("WORKSPACE");
      } else {
        setView("AUTH");
      }
    }

    return () => window.removeEventListener("popstate", handleLocationChange);
  }, [user, isLoading]);

  // 3. Logout Logic
  const handleLogout = async () => {
    try {
      await orpc.auth.logout.call();
      setCurrentUser(null);
      setView("AUTH");
      await refetch();
    } catch (err) {
      setView("AUTH");
    }
  };

  // 4. Routing Priority (Reset Screen)
  if (currentPath === "/reset-password") {
    return <ResetPassword />;
  }

  // 5. Loading State
  if (view === "INITIAL" || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-400 border-t-transparent"></div>
      </div>
    );
  }

  // 6. Auth View
  if (view === "AUTH") {
    return (
      <UserAuth
        onLogin={async (userName, password) => {
          await orpc.auth.login.call({ userName, password });
          await refetch();
        }}
        onRegister={async (userName, email, password) => {
          await orpc.auth.register.call({ userName, email, password });
        }}
        onRequestReset={async (email) => {
          await orpc.auth.requestPasswordReset.call({ email });
        }}
      />
    );
  }

  // 7. Workspace View (Temporary Logout Test)
  return <Dashboard user={currentUser} onLogout={handleLogout} />;
}

export default App;
