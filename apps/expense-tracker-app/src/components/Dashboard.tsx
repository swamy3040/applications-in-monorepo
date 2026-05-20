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
// Core Recharts components
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
import { orpc, EXPENSES_QUERY_KEY } from "../lib/orpc";

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
}

const barChartConfig = {
  Income: { label: "Income", color: "#22c55e" },
  Expenses: { label: "Expenses", color: "#ef4444" },
} as const;

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: expenses, isLoading: isExpensesLoading } = useQuery({
    queryKey: EXPENSES_QUERY_KEY,
    queryFn: () => orpc.expenses.list.call({ search: "" }),
  });

  const { data: categories, isLoading: isCategoriesLoading } = useQuery(
    orpc.categories.list.queryOptions(),
  );

  const isLoading = isExpensesLoading || isCategoriesLoading;

  const totalIncome =
    expenses
      ?.filter((e) => e.type === "INCOME")
      .reduce((sum, e) => sum + e.amount, 0) || 0;

  const totalExpense =
    expenses
      ?.filter((e) => e.type === "EXPENSE")
      .reduce((sum, e) => sum + e.amount, 0) || 0;

  const totalBalance = totalIncome - totalExpense;

  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const getBarChartData = () => {
    if (!expenses) return [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyMap = months.reduce(
      (acc, month) => {
        acc[month] = { month, Income: 0, Expenses: 0 };
        return acc;
      },
      {} as Record<string, { month: string; Income: number; Expenses: number }>,
    );

    expenses.forEach((item) => {
      const itemDate = new Date(item.date);
      const monthName = months[itemDate.getMonth()];
      if (monthlyMap[monthName]) {
        if (item.type === "INCOME") {
          monthlyMap[monthName].Income += item.amount;
        } else {
          monthlyMap[monthName].Expenses += item.amount;
        }
      }
    });

    return Object.values(monthlyMap);
  };

  // CLEAN PIE CHART LOGIC
  const getPieChartData = () => {
    if (!expenses || !categories) return [];

    // 1. Get ONLY the expense categories
    const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
    if (expenseCategories.length === 0) return [];

    // 2. Initialize ALL expense categories with 0 so they ALWAYS show in the text legend
    const categoryTotals: Record<number, number> = {};
    
    expenseCategories.forEach((cat) => {
      categoryTotals[cat.id] = 0;
    });

    // 3. Add up the actual expenses
    const expenseItems = expenses.filter((e) => e.type === "EXPENSE");
    expenseItems.forEach((item) => {
      if (categoryTotals[item.categoryId] !== undefined) {
        categoryTotals[item.categoryId] += item.amount;
      }
    });

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

    // 4. Map to the final array
    return Object.entries(categoryTotals).map(([catId, total], index) => {
      const cat = expenseCategories.find((c) => c.id === Number(catId));
      const percentage =
        totalExpense > 0 ? ((total / totalExpense) * 100).toFixed(1) : "0.0";

      return {
        name: cat?.name || "Uncategorized",
        amount: total, // Keeps 0 exactly as 0. Recharts hides the slice, but we keep the data for the legend!
        percentage: Number(percentage),
        fill: PIE_COLORS[index % PIE_COLORS.length],
      };
    });
  };

  const barChartData = getBarChartData();
  const pieChartData = getPieChartData();

  // Safely find the top spending sector without mutating the array order
  const topCategory = [...pieChartData].sort((a, b) => b.amount - a.amount)[0];
  const topCategoryName =
    topCategory && topCategory.amount > 0 ? topCategory.name : "N/A";

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
                {/* ROW 1: TOTALS */}
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
                    {/* ROW 2: BAR CHART */}
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
                          data={barChartData}
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
                                <th className="pb-3 font-medium">
                                  Description
                                </th>
                                <th className="pb-3 font-medium">Type</th>
                                <th className="pb-3 font-medium text-right">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {expenses.slice(0, 5).map((expense) => (
                                <tr
                                  key={expense.id}
                                  className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors"
                                >
                                  <td className="py-4 font-medium text-slate-200 truncate max-w-[150px]">
                                    {expense.description}
                                  </td>
                                  <td className="py-4">
                                    <span
                                      className={`text-xs px-2 py-1 rounded-full font-bold ${expense.type === "INCOME" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                                    >
                                      {expense.type}
                                    </span>
                                  </td>
                                  <td
                                    className={`py-4 text-right font-bold ${expense.type === "INCOME" ? "text-green-400" : "text-red-400"}`}
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

                      {/* PIE CHART WITH EXACT PERCENTAGES */}
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

                            {/* EXACT PERCENTAGE BREAKDOWN (Shows all categories, including 0%) */}
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

                    {/* ROW 4: INSIGHT CARDS */}
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
                            {topCategoryName}
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
                            {savingsRate > 0
                              ? `${savingsRate.toFixed(1)}%`
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
