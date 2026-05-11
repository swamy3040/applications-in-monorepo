import { useState } from "react";

interface UserAuthProps {
  onLogin: (userName: string, password: string) => Promise<void>;
  onRegister: (
    userName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  onRequestReset: (email: string) => Promise<void>;
}

export const UserAuth = ({
  onLogin,
  onRegister,
  onRequestReset,
}: UserAuthProps) => {
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isForgotPassword) {
        if (!email.trim()) {
          alert("Please enter your email.");
          return;
        }
        await onRequestReset(email.trim());
        alert(
          "If an account with that email exists, a reset link has been sent.",
        );
      } else if (isRegister) {
        // Handle Registration
        if (!userName.trim() || !password.trim() || !email.trim()) {
          alert("Please fill all fields.");
          return;
        }
        await onRegister(userName.trim(), email.trim(), password.trim());
      } else {
        // Handle Login
        if (!userName.trim() || !password.trim()) {
          alert("Please fill all fields.");
          return;
        }
        await onLogin(userName.trim(), password.trim());
      }
      setUserName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Authentication error:", error);
      alert("An error occurred. Please check the console or server logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = (mode: "Login" | "Register" | "ForgotPassword") => {
    if (isSubmitting) return;
    setUserName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    if (mode === "ForgotPassword") {
      setIsForgotPassword(true);
      setIsRegister(false);
    } else if (mode === "Register") {
      setIsRegister(true);
      setIsForgotPassword(false);
    } else {
      setIsRegister(false);
      setIsForgotPassword(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md">
        <h1 className="text-center capitalize text-blue-500 font-bold text-3xl mb-6">
          {isForgotPassword
            ? "Reset Password"
            : isRegister
              ? "create account"
              : "Login"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isForgotPassword && (
            <input
              type="text"
              placeholder="Username"
              className="outline-none focus:border-blue-500 transition-all w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white disabled:opacity-50"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          )}

          {!isForgotPassword && (
            <div className="relative w-full">
              <input
                type={showPassword ? "type" : "password"}
                placeholder="Password"
                className="outline-none focus:border-blue-500 transition-all w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white disabled:opacity-50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          )}

          {(isRegister || isForgotPassword) && (
            <input
              type="email"
              placeholder="Email Address"
              className="outline-none focus:border-blue-500 transition-all w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white disabled:opacity-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full p-4 rounded-lg font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isRegister
                ? "bg-green-600 hover:bg-green-500"
                : "bg-blue-600 hover:bg-blue-500"
            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSubmitting && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isSubmitting
              ? "Processing..."
              : isForgotPassword
                ? "Send Reset Link"
                : isRegister
                  ? "Register"
                  : "Login"}
          </button>
        </form>

        {/* FOOTER LINKS */}
        <div className="mt-6 text-center text-sm">
          {isForgotPassword ? (
            <p
              className="text-blue-500 font-bold cursor-pointer hover:text-blue-400"
              onClick={() => handleToggleMode("Login")}
            >
              Back to Login
            </p>
          ) : (
            <p className="text-slate-400">
              {isRegister
                ? "Already have an account? "
                : "Need a secure account? "}
              <span
                className="text-blue-500 font-bold cursor-pointer hover:text-blue-400"
                onClick={() =>
                  handleToggleMode(isRegister ? "Login" : "Register")
                }
              >
                {isRegister ? "Sign In" : "Register"}
              </span>

              {!isRegister && (
                <>
                  <span> | </span>
                  <span
                    className="text-blue-500 font-bold cursor-pointer hover:text-blue-400"
                    onClick={() => handleToggleMode("ForgotPassword")}
                  >
                    Forgot Password?
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
