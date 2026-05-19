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
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  BarChart3,
  PieChart,
  Calendar,
} from "lucide-react";
import type { User } from "@repo/contract-expense-tracker";
import { useQuery } from "@tanstack/react-query";
import { Transactions } from "./dashboard/Transactions";
import { Categories } from "./dashboard/Categories";

// 👇 1. Import your oRPC client
import { orpc } from "../lib/orpc";

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // 👇 2. Fetch real data from your running backend
  const { data: expenses, isLoading } = useQuery(
    orpc.expenses.list.queryOptions(),
  );

  // 👇 3. Calculate dynamic totals safely
  const totalIncome =
    expenses
      ?.filter((e) => e.type === "INCOME")
      .reduce((sum, e) => sum + e.amount, 0) || 0;

  const totalExpense =
    expenses
      ?.filter((e) => e.type === "EXPENSE")
      .reduce((sum, e) => sum + e.amount, 0) || 0;

  const totalBalance = totalIncome - totalExpense;

  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden">
      {/* 1. LEFT SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 3. TOP HEADER */}
        <Header title={activeTab} userName={user.userName} />

        {/* 4. SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {activeTab === "overview" && (
              <>
                {/* ==========================================
                    ROW 1: TOTALS CARDS
                ========================================== */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs font-bold text-slate-500 uppercase">
                        Total Balance
                      </CardTitle>
                      <Wallet className="size-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${totalBalance.toFixed(2)}
                      </div>
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
                        +${totalIncome.toFixed(2)}
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
                        -${totalExpense.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {isLoading ? (
                  <div className="flex justify-center p-20">
                    <Loader2 className="size-8 text-blue-500 animate-spin" />
                  </div>
                ) : expenses && expenses.length > 0 ? (
                  <>
                    {/* ==========================================
                        ROW 2: RECENT TRANSACTIONS TABLE
                    ========================================== */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">
                          Recent Transactions
                        </h3>
                        <Button
                          variant="link"
                          className="text-blue-500"
                          onClick={() => setActiveTab("transactions")}
                        >
                          View All
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 text-sm">
                              <th className="pb-3 font-medium">Description</th>
                              <th className="pb-3 font-medium">Type</th>
                              <th className="pb-3 font-medium text-right">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* .slice(0,5) ensures we only show the 5 most recent items here */}
                            {expenses.slice(0, 5).map((expense) => (
                              <tr
                                key={expense.id}
                                className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors"
                              >
                                <td className="py-4 font-medium text-slate-200">
                                  {expense.description}
                                </td>
                                <td className="py-4">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full font-bold ${
                                      expense.type === "INCOME"
                                        ? "bg-green-500/10 text-green-400"
                                        : "bg-red-500/10 text-red-400"
                                    }`}
                                  >
                                    {expense.type}
                                  </span>
                                </td>
                                <td
                                  className={`py-4 text-right font-bold ${
                                    expense.type === "INCOME"
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {expense.type === "INCOME" ? "+" : "-"}$
                                  {expense.amount.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ==========================================
                        ROW 3: CHARTS PLACEHOLDERS
                    ========================================== */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="bg-slate-900 border-slate-800 shadow-xl h-72 flex flex-col items-center justify-center text-slate-500">
                        <BarChart3 className="size-10 mb-4 opacity-50" />
                        <p className="font-medium">Cash Flow Chart</p>
                        <p className="text-xs opacity-70">
                          Awaiting Backend Analytics API
                        </p>
                      </Card>

                      <Card className="bg-slate-900 border-slate-800 shadow-xl h-72 flex flex-col items-center justify-center text-slate-500">
                        <PieChart className="size-10 mb-4 opacity-50" />
                        <p className="font-medium">Category Breakdown</p>
                        <p className="text-xs opacity-70">
                          Awaiting Backend Analytics API
                        </p>
                      </Card>
                    </div>

                    {/* ==========================================
                        ROW 4: TIME-BASED ANALYSIS PLACEHOLDERS
                    ========================================== */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="bg-slate-900 border-slate-800 shadow-xl flex items-center p-6 space-x-4">
                        <div className="p-3 bg-blue-500/10 rounded-full">
                          <Calendar className="size-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-400">
                            This Week
                          </p>
                          <p className="text-xl font-bold text-white">
                            Pending...
                          </p>
                        </div>
                      </Card>

                      <Card className="bg-slate-900 border-slate-800 shadow-xl flex items-center p-6 space-x-4">
                        <div className="p-3 bg-purple-500/10 rounded-full">
                          <Calendar className="size-6 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-400">
                            This Month
                          </p>
                          <p className="text-xl font-bold text-white">
                            Pending...
                          </p>
                        </div>
                      </Card>

                      <Card className="bg-slate-900 border-slate-800 shadow-xl flex items-center p-6 space-x-4">
                        <div className="p-3 bg-amber-500/10 rounded-full">
                          <Calendar className="size-6 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-400">
                            This Year
                          </p>
                          <p className="text-xl font-bold text-white">
                            Pending...
                          </p>
                        </div>
                      </Card>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-20 flex flex-col items-center justify-center text-center">
                    <div className="size-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <Plus className="size-8 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">
                      No transactions yet
                    </h3>
                    <p className="text-slate-500 text-sm max-w-xs mb-6">
                      Connect your account or add your first transaction
                      manually to see the analysis.
                    </p>
                    <Button
                      onClick={() => setActiveTab("transactions")}
                      className="bg-blue-600 hover:bg-blue-500 font-bold px-8"
                    >
                      Add Your First Transaction
                    </Button>
                  </div>
                )}
              </>
            )}

            {activeTab === "transactions" && (
              <Transactions setActiveTab={setActiveTab} />
            )}

            {activeTab === "categories" && <Categories />}

            {activeTab === "settings" && (
              <div className="text-slate-500 italic text-center p-20">
                Settings module coming soon.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
