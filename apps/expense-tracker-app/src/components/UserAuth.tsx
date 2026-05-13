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
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (isForgotPassword) {
        if (!email.trim()) throw new Error("Please enter your email address.");
        await onRequestReset(email.trim());
        setFeedback({
          type: "success",
          msg: "Success! Check the server console for your link.",
        });
        setEmail("");
      } else if (isRegister) {
        if (!userName.trim() || !password.trim() || !email.trim())
          throw new Error("Please fill in all registration fields.");

        await onRegister(userName.trim(), email.trim(), password.trim());

        // FIX: Reset password visibility and switch to login
        setShowPassword(false);
        setIsRegister(false);
        setFeedback({
          type: "success",
          msg: "Registration successful! Please login now.",
        });

        setUserName("");
        setEmail("");
        setPassword("");
      } else {
        if (!userName.trim() || !password.trim())
          throw new Error("Username and password are required.");
        await onLogin(userName.trim(), password.trim());
      }
    } catch (error: any) {
      setFeedback({
        type: "error",
        msg: error.message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = (mode: "Login" | "Register" | "ForgotPassword") => {
    if (isSubmitting) return;

    setUserName("");
    setEmail("");
    setPassword("");
    setFeedback(null);
    setShowPassword(false); // Reset eye icon when manually toggling

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
    <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-900 p-4">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md">
        <h1 className="text-center capitalize text-blue-500 font-bold text-3xl mb-6">
          {isForgotPassword
            ? "Reset Password"
            : isRegister
              ? "Create Account"
              : "Login"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isForgotPassword && (
            <input
              type="text"
              placeholder="Username"
              value={userName}
              required
              onChange={(e) => setUserName(e.target.value)}
              className="outline-none focus:border-blue-500 transition-all w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white"
            />
          )}

          {!isForgotPassword && (
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="outline-none focus:border-blue-500 transition-all w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          )}

          {(isRegister || isForgotPassword) && (
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="outline-none focus:border-blue-500 transition-all w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white"
            />
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full p-4 rounded-lg font-bold text-white transition-all ${isRegister ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500"} disabled:opacity-50`}
          >
            {isSubmitting
              ? "Processing..."
              : isForgotPassword
                ? "Send Reset Link"
                : isRegister
                  ? "Register"
                  : "Login"}
          </button>
        </form>

        <div className="mt-6">
          {feedback && (
            <div
              className={`p-4 rounded-lg text-sm font-bold border animate-in fade-in zoom-in duration-300 ${feedback.type === "success" ? "bg-green-900/30 border-green-500 text-green-400" : "bg-red-900/30 border-red-500 text-red-400"}`}
            >
              {feedback.msg}
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-slate-400 flex justify-center gap-2">
          <span
            onClick={() => handleToggleMode(isRegister ? "Login" : "Register")}
            className="text-blue-500 font-bold cursor-pointer hover:underline"
          >
            {isForgotPassword
              ? "Back to Login"
              : isRegister
                ? "Sign In"
                : "Register"}
          </span>
          {!isForgotPassword && !isRegister && (
            <>
              <span>|</span>
              <span
                onClick={() => handleToggleMode("ForgotPassword")}
                className="text-blue-500 font-bold cursor-pointer hover:underline"
              >
                Forgot Password?
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
