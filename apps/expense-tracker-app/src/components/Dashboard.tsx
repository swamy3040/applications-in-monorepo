// src/pages/Dashboard.tsx
import { useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";
import { Button } from "../../@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../@/components/ui/card";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import type { User } from "@repo/contract-expense-tracker";

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  // This state controls the entire "L-Shape" layout content
  const [activeTab, setActiveTab] = useState("overview");

  if (!user) return null;
  return (
    <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden">
      {/* 1. LEFT SIDEBAR - Handles Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 3. TOP HEADER - Dynamic title based on activeTab */}

        <Header title={activeTab} userName={user.userName} />

        {/* 4. SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">   
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Overview Section - Only show when "overview" is selected */}
            {activeTab === "overview" && (
              <>
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-bold text-slate-500 uppercase">
                        Total Balance
                      </CardTitle>
                      <Wallet className="size-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$0.00</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-bold text-green-500 uppercase">
                        Income
                      </CardTitle>
                      <TrendingUp className="size-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-400">
                        +$0.00
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-bold text-red-500 uppercase">
                        Expenses
                      </CardTitle>
                      <TrendingDown className="size-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-400">
                        -$0.00
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Action Area */}
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-20 flex flex-col items-center justify-center text-center">
                  <div className="size-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Plus className="size-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">
                    No transactions yet
                  </h3>
                  <p className="text-slate-500 text-sm max-w-xs mb-6">
                    Connect your account or add your first transaction manually
                    to see the analysis.
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-500 font-bold px-8">
                    Add Your First Transaction
                  </Button>
                </div>
              </>
            )}

            {/* Placeholder for other tabs */}
            {activeTab !== "overview" && (
              <div className="h-96 flex flex-col items-center justify-center border border-slate-800 rounded-3xl bg-slate-900/20">
                <p className="text-slate-500 italic">
                  The {activeTab} module is coming soon.
                </p>
                <Button
                  variant="link"
                  onClick={() => setActiveTab("overview")}
                  className="text-blue-500 mt-2"
                >
                  Back to Dashboard
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
