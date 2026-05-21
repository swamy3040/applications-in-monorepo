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
  PieChart as PieIcon,
  Sparkles,
  Percent,
  Flame,
} from "lucide-react";
import { ChartContainer, ChartTooltip } from "../../@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import type { User } from "@repo/contract-expense-tracker";
import { useQuery } from "@tanstack/react-query";
import { Transactions } from "./dashboard/Transactions";
import { Categories } from "./dashboard/Categories";
import { orpc } from "../lib/orpc";

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
}

const barChartConfig = {
  Income: { label: "Income", color: "#22c55e" },
  Expenses: { label: "Expenses", color: "#ef4444" },
} as const;

const PIE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // 👇 1. The Single Backend Call
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => orpc.dashboard.getSummary.call(),
  });

  // 👇 2. The ONLY frontend logic left: Adding colors to the Pie Chart!
  const pieChartData =
    dashboardData?.expenseBreakdown.map((item, index) => ({
      ...item,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    })) || [];

  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={activeTab} userName={user.userName} />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {activeTab === "overview" && (
              <>
                {/* ROW 1: TOTALS (Directly from API overview) */}
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
                        ${(dashboardData?.overview.balance || 0).toFixed(2)}
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
                        +$
                        {(dashboardData?.overview.totalIncome || 0).toFixed(2)}
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
                        -$
                        {(dashboardData?.overview.totalExpenses || 0).toFixed(
                          2,
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {isLoading ? (
                  <div className="flex justify-center p-20">
                    <Loader2 className="size-8 text-blue-500 animate-spin" />
                  </div>
                ) : dashboardData &&
                  (dashboardData.overview.totalIncome > 0 ||
                    dashboardData.overview.totalExpenses > 0) ? (
                  <>
                    {/* ROW 2: BAR CHART (Directly from API monthlyCashFlow) */}
                    <Card className="bg-slate-900 border-slate-800 shadow-xl p-6 flex flex-col justify-between w-full">
                      <div className="flex items-center space-x-2 text-slate-300 font-bold mb-4">
                        <BarChart3 className="size-4 text-blue-500" />
                        <span>Monthly Cash Flow Trends</span>
                      </div>
                      <ChartContainer
                        config={barChartConfig}
                        className="h-64 w-full text-xs"
                      >
                        <BarChart
                          data={dashboardData.monthlyCashFlow}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="month"
                            stroke="#64748b"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#64748b"
                            tickLine={false}
                            axisLine={false}
                          />
                          <ChartTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-white font-bold shadow-xl">
                                    <p className="text-xs text-slate-400 mb-1">
                                      {payload[0].payload.month}
                                    </p>
                                    <p className="text-green-400">
                                      Income: ${payload[0].value}
                                    </p>
                                    <p className="text-red-400">
                                      Expense: ${payload[1].value}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="Income"
                            fill="var(--color-Income)"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="Expenses"
                            fill="var(--color-Expenses)"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ChartContainer>
                    </Card>

                    {/* ROW 3: TRANSACTIONS & PIE CHART */}
                    <div className="grid gap-6 md:grid-cols-5 items-start">
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl md:col-span-3 h-full min-h-[380px]">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold">
                            Recent Transactions
                          </h3>
                          <Button
                            variant="link"
                            className="text-blue-500 p-0 h-auto"
                            onClick={() => setActiveTab("transactions")}
                          >
                            View All
                          </Button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-500 text-sm">
                                <th className="pb-3 font-medium">Date</th>
                                <th className="pb-3 font-medium">Category</th>
                                <th className="pb-3 font-medium text-right">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {dashboardData.recentTransactions.map(
                                (expense) => (
                                  <tr
                                    key={expense.id}
                                    className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors"
                                  >
                                    <td className="py-4 font-medium text-slate-400 text-sm">
                                      {new Date(
                                        expense.date,
                                      ).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 font-medium text-slate-200">
                                      {expense.category}
                                    </td>
                                    <td className="py-4 text-right font-bold text-slate-200">
                                      ${expense.amount.toFixed(2)}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* PIE CHART */}
                      <Card className="bg-slate-900 border-slate-800 shadow-xl h-full min-h-[380px] flex flex-col md:col-span-2 p-6 justify-between">
                        <div className="flex items-center space-x-2 text-slate-300 font-bold mb-2">
                          <PieIcon className="size-4 text-blue-500" />
                          <span>Category Breakdown</span>
                        </div>

                        {pieChartData.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                            <p className="font-medium">
                              No expense categories found
                            </p>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col justify-center w-full">
                            <ChartContainer
                              config={{}}
                              className="mx-auto aspect-square w-full max-h-[240px] text-xs"
                            >
                              <RechartsPieChart>
                                <ChartTooltip
                                  cursor={false}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-white font-bold shadow-xl flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{
                                                backgroundColor: data.fill,
                                              }}
                                            />
                                            <span className="text-sm">
                                              {data.name}
                                            </span>
                                          </div>
                                          <span className="text-slate-400 font-normal">
                                            Amount:{" "}
                                            <span style={{ color: data.fill }}>
                                              ${data.amount.toFixed(2)}
                                            </span>
                                          </span>
                                          <span className="text-slate-400 font-normal">
                                            Share:{" "}
                                            <span className="text-white">
                                              {data.percentage}%
                                            </span>
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Pie
                                  data={pieChartData}
                                  dataKey="amount"
                                  nameKey="name"
                                  innerRadius={55}
                                  outerRadius={80}
                                  strokeWidth={2}
                                  stroke="#0f172a"
                                  minAngle={15}
                                  paddingAngle={2}
                                >
                                  {pieChartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.fill}
                                    />
                                  ))}
                                </Pie>
                              </RechartsPieChart>
                            </ChartContainer>

                            {/* EXACT PERCENTAGE BREAKDOWN */}
                            <div className="flex flex-wrap justify-center gap-4 mt-6">
                              {pieChartData.map((entry, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1.5 text-xs"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: entry.fill }}
                                  />
                                  <span className="text-slate-400">
                                    {entry.name}:
                                  </span>
                                  <span className="text-slate-200 font-bold">
                                    {entry.percentage}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>

                    {/* ROW 4: INSIGHT CARDS (Directly from API highlights & overview) */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="bg-slate-900 border-slate-800 shadow-xl flex items-center p-6 space-x-4">
                        <div className="p-3 bg-red-500/10 rounded-full">
                          <Flame className="size-6 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-400">
                            Top Spending Sector
                          </p>
                          <p className="text-lg font-bold text-white mt-0.5">
                            {dashboardData.highlights.topSpendingCategory ||
                              "N/A"}
                          </p>
                        </div>
                      </Card>

                      <Card className="bg-slate-900 border-slate-800 shadow-xl flex items-center p-6 space-x-4">
                        <div className="p-3 bg-green-500/10 rounded-full">
                          <Percent className="size-6 text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-400">
                            Overall Savings Rate
                          </p>
                          <p className="text-xl font-bold text-green-400 mt-0.5">
                            {dashboardData.overview.savingsRate > 0
                              ? `${dashboardData.overview.savingsRate}%`
                              : "0.0%"}
                          </p>
                        </div>
                      </Card>

                      <Card className="bg-slate-900 border-slate-800 shadow-xl flex items-center p-6 space-x-4">
                        <div className="p-3 bg-blue-500/10 rounded-full">
                          <Sparkles className="size-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-400">
                            AI Budget Advisory
                          </p>
                          <p className="text-sm text-slate-400 italic mt-1">
                            Awaiting AI Core Integration
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
