import { useEffect, useState } from "react";
import { orpc } from "./lib/orpc";
import type { Todo, User } from "@repo/contract";
import { UserAuth } from "./components/UserAuth";
import { ResetPassword } from "./components/ResetPassword";

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [editingTodoID, setEditingTodoID] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<"AUTH" | "WORKSPACE" | "INITIAL">("INITIAL");
  const [newName, setNewName] = useState<string>("");
  const [isNewNameEditing, setIsNewNameEditing] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "COMPLETED">(
    "ALL",
  );

  const handleNameUpdate = async () => {
    try {
      const updatedUser = await orpc.updateProfile({ userName: newName });
      setCurrentUser(updatedUser);
      setIsNewNameEditing(false);
    } catch (e) {
      console.error("Failed to update name: ", e);
      alert("Could not update name. Please try again.");
    }
  };

  const checkAuth = async () => {
    try {
      const me = await orpc.getMe(); // This returns the actual user from the cookie
      if (me) {
        setCurrentUser(me); // ✅ Store the whole profile
        setView("WORKSPACE");
      } else {
        setView("AUTH");
      }
    } catch (e) {
      setView("AUTH");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (email: string) => {
    try {
      await orpc.requestPasswordReset({ email });
      console.log("Reset request sent to backend!");
    } catch (e) {
      console.error("Password reset request failed: ", e);
    }
  };

  const handleLogin = async (userName: string, password: string) => {
    try {
      // 1. Call the REAL backend login procedure
      // This is where the server sends the "Set-Cookie" instruction
      const loggedInUser = await orpc.login({
        userName: userName,
        password: password,
      });

      // 2. If successful, update our local UI state
      setCurrentUser(loggedInUser);
      setView("WORKSPACE");
      console.log("Cookie has been set by the browser!");
    } catch (e) {
      console.error("Login failed at the server level:", e);
      alert("Login failed. Check server logs.");
    }
  };

  const handleRegister = async (
    userName: string,
    email: string,
    password: string,
  ) => {
    try {
      const created = await orpc.createUser({
        userName: userName,
        email: email,
        password: password,
      });

      await handleLogin(created.userName, password); // Auto-login after registration

      console.log("Registration successful, auto-logging in...");
    } catch (e) {
      console.error("Registration failed: ", e);
      alert("This username or email might already be taken.");
    }
  };

  const handleLogout = async () => {
    try {
      // 1. Call the backend to destroy the cookie
      await orpc.logout();
      setCurrentUser(null);
      setTodos([]); // Security: Don't leave User A's todos in memory
      setView("AUTH");

      console.log("Logged out and cookie cleared.");
    } catch (e) {
      console.error("Logout failed:", e);
      // Force back to AUTH anyway if the session is broken
      setView("AUTH");
    }
  };

  //Todo handlers: Create, Toggle, Delete, Update, Fetch
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      const result = await orpc.createTodo({
        title: newTodoTitle,
      });
      console.log("successfully created: ", result);
      setTodos((prev) => [...prev, result]);
      setNewTodoTitle("");
    } catch (error) {
      console.error("Failed to create todo: ", error);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      // 1. Call the server and get the ACTUAL updated data
      const updatedTodoFromServer = await orpc.toggleTodo(id); // 2. Sync the Mirror (UI) with the Truth (Server)

      setTodos((prev) =>
        prev.map((todo) => (todo.id === id ? updatedTodoFromServer : todo)),
      );
    } catch (error) {
      console.error("Toggle failed:", error); // If it fails, the checkbox won't change, which is correct!
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const wasDeleted = await orpc.deleteTodo(id);

      if (wasDeleted) {
        setTodos((prev) => prev.filter((todo) => todo.id !== id));
        console.log(`Item ${id} removed from UI.`);
      } else {
        alert("Could not delete: This item might have been removed already.");
        fetchTodos(); // Re-sync with server to get the latest state
      }
    } catch (error) {
      console.error("Critical Delete Error:", error);
      alert("Something went wrong with the connection.");
    }
  };

  const handleUpdate = async ({ id, title }: { id: number; title: string }) => {
    try {
      const updatedTodo = await orpc.updateTodo({ id, title });
      setTodos((prev) =>
        prev.map((todo) => (todo.id === id ? updatedTodo : todo)),
      );
      setEditingTodoID(null);
      setEditingTitle("");
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const fetchTodos = async () => {
    // Only fetch if the user has successfully passed the Auth check
    if (view !== "WORKSPACE") return;

    try {
      setLoading(true);

      const data = await orpc.listTodo({
        searchQuery: searchInput,
        status: activeTab,
      }); // Backend handles everything else!
      setTodos(data);
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkAuth();
    };
    init();
  }, []);

  // This effect should now watch the 'view'
  useEffect(() => {
    if (view === "WORKSPACE") {
      const delayDebounceFn = setTimeout(() => {
        fetchTodos();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [view, currentUser, activeTab, searchInput]); // Trigger only when we officially enter the workspace

  const isResetScreen = window.location.pathname === "/reset-password";

  if (isResetScreen) {
    return <ResetPassword />;
  }

  return (
    <div>
      {view === "INITIAL" ? (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-400 border-t-transparent"></div>
        </div>
      ) : view === "AUTH" ? (
        <UserAuth
          onLogin={handleLogin}
          onRegister={handleRegister}
          onRequestReset={handleRequestReset}
        />
      ) : (
        <div className="flex min-h-screen flex-col items-center bg-slate-900 text-white p-8">
          <div className="w-full max-w-2xl flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-12 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex-1">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">
                  Logged in as
                </p>

                {isNewNameEditing ? (
                  /* --- EDIT MODE --- */
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-slate-900 border border-blue-500 rounded px-2 py-1 text-blue-400 outline-none text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleNameUpdate}
                      className="text-xs bg-green-600 hover:bg-green-500 px-2 py-1 rounded font-bold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsNewNameEditing(false)}
                      className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  /* --- DISPLAY MODE --- */
                  <div className="flex items-center gap-3">
                    <p className="text-blue-400 font-medium">
                      {currentUser?.userName}
                    </p>
                    <button
                      onClick={() => {
                        setIsNewNameEditing(true);
                        setNewName(currentUser?.userName || ""); // Pre-fill with current name
                      }}
                      className="text-[10px] text-slate-500 hover:text-blue-400 uppercase font-bold border border-slate-700 px-2 py-0.5 rounded transition-colors"
                    >
                      Edit Name
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-slate-700 hover:bg-red-900/40 text-slate-300 hover:text-red-400 rounded-lg text-sm font-bold transition-all"
              >
                Logout
              </button>
            </div>
            <h1 className="mb-8 text-4xl font-bold text-blue-400">Todo List</h1>
            <form
              onSubmit={handleCreate}
              className="mb-8 flex w-full max-w-md gap-2"
            >
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 focus:border-blue-500 outline-none"
              />

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-6 py-2 font-bold hover:bg-blue-500 transition-colors"
              >
                          Add
              </button>
            </form>

            <div className="w-full max-w-md flex flex-col">
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search todos..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 pl-10 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="flex justify-between items-center my-4">
                <button
                  className={`rounded-lg px-6 py-2 font-bold transition-colors
                ${
                  activeTab === "ALL"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
                  onClick={() => setActiveTab("ALL")}
                >
                  ALL
                </button>
                <button
                  className={`rounded-lg px-6 py-2 font-bold transition-colors
                ${
                  activeTab === "PENDING"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
                  onClick={() => setActiveTab("PENDING")}
                >
                  PENDING
                </button>
                <button
                  className={`rounded-lg px-6 py-2 font-bold transition-colors
                ${
                  activeTab === "COMPLETED"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
                  onClick={() => setActiveTab("COMPLETED")}
                >
                  COMPLETED
                </button>
              </div>
            </div>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                 
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-400 border-t-transparent"></div>
                 
                <p className="animate-pulse text-lg">
                  Connecting to Port 3000...
                </p>
                   
              </div>
            ) : (
              <ul className="w-full max-w-md space-y-3">
                 
                {todos.length === 0 ? (
                  <p className="text-slate-400">No todos found.</p>
                ) : (
                  todos.map((todo) => (
                    <li
                      key={todo.id}
                      className="flex justify-between items-center rounded-lg bg-slate-800 p-4 shadow-lg border border-slate-700"
                    >
                             
                      <div className="flex items-center gap-3">
                                 
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggle(todo.id)}
                          className="h-5 w-5 cursor-pointer rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500"
                        />
                                 
                        <span
                          className={`text-lg ${todo.completed ? "line-through text-slate-500" : ""}`}
                        >
                                              {todo.title}         
                        </span>
                               
                      </div>
                                      {/* Status badge stays here */}       
                      <div className="flex gap-2">
                                          {/* EDIT BUTTON: Opens the pop-up */} 
                               
                        <button
                          onClick={() => {
                            setEditingTodoID(todo.id);
                            setEditingTitle(todo.title);
                          }}
                          className="text-slate-400 hover:text-blue-400 p-1"
                        >
                                              Edit          
                        </button>
                                          {/* DELETE BUTTON */}         
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete Task"
                        >
                                     
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                                         
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                                       
                          </svg>
                                   
                        </button>
                               
                      </div>
                           
                    </li>
                  ))
                )}
              </ul>
            )}
            {editingTodoID !== null && (
              <div className="mt-4 flex w-full max-w-md gap-2">
                 
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 focus:border-blue-500 outline-none"
                />
                 
                <button
                  onClick={() =>
                    handleUpdate({ id: editingTodoID, title: editingTitle })
                  }
                  className="rounded-lg bg-green-600 px-6 py-2 font-bold hover:bg-green-500 transition-colors"
                >
                              Save  
                </button>
                 
                <button
                  onClick={() => {
                    setEditingTodoID(null);
                    setEditingTitle("");
                  }}
                  className="rounded-lg bg-slate-600 px-6 py-2 font-bold hover:bg-slate-500 transition-colors"
                >
                              Cancel  
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
