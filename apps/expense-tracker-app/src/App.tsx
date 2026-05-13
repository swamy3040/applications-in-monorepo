import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "./lib/orpc";
import { UserAuth } from "./components/UserAuth";
import { ResetPassword } from "./components/ResetPassword";

function App() {
  // Track the current URL path to handle "Reset Password" routing
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState<any>(null);
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
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-8">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center">
        <p className="text-xs text-slate-500 uppercase font-bold mb-1">
          Authenticated As
        </p>
        <h1 className="text-2xl font-bold text-blue-400 mb-6">
          {currentUser?.userName}
        </h1>

        <div className="flex flex-col gap-4">
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 text-sm text-green-400 font-mono">
            ✓ Session Active (Port 5174)
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
