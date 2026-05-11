import { useState, useEffect } from "react";
import { orpc } from "../lib/orpc";

export const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // When the screen loads, grab the token from the web address
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    setToken(tokenFromUrl);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setMessage("Error: No reset token found in the URL.");
      return;
    }

    if (!newPassword) {
      setMessage("Please enter a new password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await orpc.resetPassword({ token: token, newPassword: newPassword });
      setMessage("Success! Your password has been updated.");
      setNewPassword(""); // clear the box
    } catch (error) {
      console.error("Reset failed:", error);
      setMessage("Failed to reset password. The link might be expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-full bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md">
        <h1 className="text-center text-blue-500 font-bold text-3xl mb-6">
          Reset Password
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              className="outline-none focus:border-blue-500 transition-all w-full bg-slate-900 border border-slate-700 rounded-lg p-4 pr-12 text-white disabled:opacity-50"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 p-4 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save New Password"}
          </button>
        </form>
        {message && (
          <p className="mt-4 text-center text-sm font-bold text-green-400">
            {message}
          </p>
        )}

        <div className="mt-6 text-center text-sm">
          {/* A simple link to take them back to the main app */}
          <a href="/" className="text-blue-500 font-bold hover:text-blue-400">
            Go to Login
          </a>
        </div>
      </div>
    </div>
  );
};
