import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { orpc, EXPENSES_QUERY_KEY } from "../../lib/orpc";
import { Input } from "../../../@/components/ui/input";
import { Button } from "../../../@/components/ui/button";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Loader2,
  Search,
  Filter,
  Download,
  Upload,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../@/components/ui/select";
import Papa from "papaparse";

interface TransactionsProps {
  setActiveTab: (tab: string) => void;
}

const formSchema = z.object({
  description: z.string().min(2, "Too short"),
  amount: z.string().min(1, "Required"),
  categoryId: z.string(),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export function Transactions({ setActiveTab }: TransactionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, searchQuery],
    queryFn: () => orpc.expenses.list.call({ search: searchQuery }),
  });

  const { data: categories } = useQuery(orpc.categories.list.queryOptions());

  const invalidateAllExpenses = async () => {
    await queryClient.invalidateQueries({
      queryKey: EXPENSES_QUERY_KEY,
      exact: false,
    });
    await queryClient.invalidateQueries({
      queryKey: ["dashboard", "summary"],
      exact: false,
    });
  };

  const createMutation = useMutation({
    mutationFn: (values: any) => orpc.expenses.create.call(values),
    onSuccess: invalidateAllExpenses,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) =>
      orpc.expenses.update.call({ id: editingId!, ...values }),
    onSuccess: invalidateAllExpenses,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => orpc.expenses.delete.call({ id }),
    onSuccess: invalidateAllExpenses,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => orpc.expenses.bulkDelete.call({ ids }),
    onSuccess: () => {
      invalidateAllExpenses();
      setSelectedIds([]);
    },
  });

  // 👇 NEW: The mutation that sends data to our backend pipeline
  const bulkImportMutation = useMutation({
    mutationFn: (transactions: any[]) =>
      orpc.expenses.bulkImport.call({ transactions }),
    onSuccess: (data) => {
      invalidateAllExpenses();
      alert(`Successfully imported ${data.insertedCount} transactions!`);
    },
    onError: (error) => {
      console.error("Import failed:", error);
      alert("Failed to import transactions. Check the console for details.");
    },
  });

  const form = useForm({
    defaultValues: {
      description: "",
      amount: "",
      categoryId: "",
      type: "EXPENSE" as "INCOME" | "EXPENSE",
    },
    validators: { onChange: formSchema },
    onSubmit: async ({ value }) => {
      try {
        const payload = {
          ...value,
          amount: Number(value.amount),
          categoryId: value.categoryId ? Number(value.categoryId) : undefined,
          date: new Date(),
        };

        if (editingId) {
          await updateMutation.mutateAsync(payload);
        } else {
          await createMutation.mutateAsync(payload);
        }
        closeModal();
      } catch (err) {
        console.error("Action failed:", err);
      }
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    form.reset();
  };

  const onEditClick = (item: any) => {
    setEditingId(item.id);
    form.setFieldValue("description", item.description);
    form.setFieldValue("amount", item.amount.toString());
    form.setFieldValue("categoryId", item.categoryId.toString());
    form.setFieldValue("type", item.type);
    setIsModalOpen(true);
  };

  const onDeleteClick = async (id: number) => {
    if (!confirm("Delete transaction?")) return;
    await deleteMutation.mutateAsync(id);
  };

  const filterOptions = Array.from(
    new Map(
      (expenses ?? []).map((e) => [e.categoryId, e.categoryName]),
    ).entries(),
  );

  const filteredExpenses = (expenses ?? []).filter((item) => {
    if (categoryFilter === "ALL") return true;
    return item.categoryId.toString() === categoryFilter;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExpenses.map((e) => e.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} transactions?`,
      )
    )
      return;
    await bulkDeleteMutation.mutateAsync(selectedIds);
  };

  // 👇 PASTE THIS NEW EXPORT FUNCTION HERE 👇
  const handleExportTransactions = () => {
    // 1. Check if boxes are ticked. If yes, export those. If no, export the current filtered list.
    const dataToExport =
      selectedIds.length > 0
        ? filteredExpenses.filter((e) => selectedIds.includes(e.id))
        : filteredExpenses;

    if (dataToExport.length === 0) {
      alert("No transactions to export.");
      return;
    }

    // 2. Clean up the data for the CSV
    const formattedData = dataToExport.map((item) => {
      const dateObj = new Date(item.date);
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;

      return {
        Date: formattedDate,
        Description: item.description,
        Amount: item.amount,
        Type: item.type,
        Category:
          item.categoryName ||
          (item.type === "INCOME" ? "Other Income" : "Other Expense"),
      };
    });
    // 3. Convert back to CSV text and force download
    const csv = Papa.unparse(formattedData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Transactions_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 👇 UPDATED: Cleans the CSV data and sends it to the backend
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const formattedData = results.data
          .filter((row: any) => row.Date && row.Amount) // Skip completely empty rows
          .map((row: any) => ({
            date: row.Date,
            description: row.Description || "Imported Transaction",
            amount: Number(row.Amount),
            type: row.Type?.toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE",
            categoryName: row.Category || undefined,
          }));

        if (formattedData.length === 0) {
          alert("No valid data found in the CSV.");
          return;
        }

        try {
          await bulkImportMutation.mutateAsync(formattedData);
        } catch (error) {
          console.error("Mutation error", error);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: (error) => {
        console.error("Error parsing file:", error);
        alert("Failed to read the file.");
      },
    });
  };

  return (
    <div className="space-y-6 text-white">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 w-full focus-visible:ring-blue-600"
          />
        </div>

        {/* Category Filter Dropdown */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-slate-900 border-slate-800 text-white">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          {/* 👇 FIX 1: position="popper" and sideOffset */}
          <SelectContent
            className="bg-slate-900 border-slate-800 text-white"
            position="popper"
            sideOffset={5}
          >
            <SelectItem value="ALL">All Categories</SelectItem>

            {filterOptions.map(([id, name]) => (
              <SelectItem key={id} value={id.toString()}>
                {name as string}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bulk Delete Button */}
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
            className="bg-red-900/50 text-red-400 hover:bg-red-900 hover:text-white border border-red-900"
          >
            {bulkDeleteMutation.isPending ? (
              <Loader2 className="animate-spin size-4 mr-2" />
            ) : (
              <Trash2 className="size-4 mr-2" />
            )}
            Delete Selected ({selectedIds.length})
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={handleExportTransactions}
          >
            <Download className="mr-2 size-4" /> Export
          </Button>
          {/* 1. Download Template Button */}
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hidden sm:flex"
            onClick={() => {
              const headers = "Date,Description,Amount,Type,Category\n";
              const exampleRow =
                "2026-05-22,Morning Coffee,150,EXPENSE,Food & Dining\n";
              const csvContent =
                "data:text/csv;charset=utf-8," + headers + exampleRow;
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "Import_Template.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <Download className="mr-2 size-4" /> Template
          </Button>

          {/* 2. Hidden File Input */}
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* 3. Import Button */}
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 size-4" /> Import
          </Button>

          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => !open && closeModal()}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-blue-600 hover:bg-blue-500 font-bold whitespace-nowrap"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="mr-2 size-4" /> Add Transaction
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-slate-900 border-slate-800 text-white !max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {editingId ? "Edit Transaction" : "New Transaction"}
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
                className="space-y-4 pt-4"
              >
                <form.Field
                  name="type"
                  children={(field) => (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) =>
                          field.handleChange(val as "INCOME" | "EXPENSE")
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        {/* 👇 FIX 2: position="popper" and sideOffset */}
                        <SelectContent
                          className="bg-slate-900 border-slate-800 text-white"
                          position="popper"
                          sideOffset={5}
                        >
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                          <SelectItem value="INCOME">Income</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                <form.Field
                  name="description"
                  children={(field) => (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <form.Field
                    name="amount"
                    children={(field) => (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Amount</label>
                        <Input
                          type="number"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                    )}
                  />

                  <form.Field
                    name="categoryId"
                    children={(field) => (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select
                          onValueChange={(val) => field.handleChange(val)}
                          value={field.state.value}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 w-full">
                            <SelectValue placeholder="Pick" />
                          </SelectTrigger>
                          {/* 👇 FIX 3: position="popper" and sideOffset */}
                          <SelectContent
                            className="bg-slate-900 border-slate-800 text-white"
                            position="popper"
                            sideOffset={5}
                          >
                            {categories && categories.length > 0 ? (
                              categories.map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  {c.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center space-y-2">
                                <p className="text-xs text-slate-400">
                                  No categories created yet
                                </p>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="w-full text-xs h-7 bg-blue-600"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    closeModal();
                                    setActiveTab("categories");
                                  }}
                                >
                                  Create a Category First
                                </Button>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 font-bold py-6 mt-2"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : editingId ? (
                    "Update Transaction"
                  ) : (
                    "Save Transaction"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 bg-slate-900/50 hover:bg-transparent">
              <TableHead className="w-12 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 cursor-pointer accent-blue-600"
                  checked={
                    filteredExpenses.length > 0 &&
                    selectedIds.length === filteredExpenses.length
                  }
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="text-slate-400">Description</TableHead>
              <TableHead className="text-slate-400">Category</TableHead>
              <TableHead className="text-slate-400">Amount</TableHead>
              <TableHead className="text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-slate-500"
                >
                  <Loader2 className="size-6 animate-spin mx-auto mb-2" />
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-slate-500"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((item) => (
                <TableRow
                  key={item.id}
                  className="border-slate-800 hover:bg-slate-800/40 transition-colors"
                >
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 cursor-pointer accent-blue-600"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.description}
                  </TableCell>
                  <TableCell>
                    {item.categoryName ||
                      (item.type === "INCOME"
                        ? "Other Income"
                        : "Other Expense")}
                  </TableCell>
                  <TableCell
                    className={`font-bold ${item.type === "INCOME" ? "text-green-400" : "text-red-400"}`}
                  >
                    {item.type === "INCOME" ? "+" : "-"}$
                    {Number(item.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-slate-800"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      {/* 👇 EXTRA FIX: Added align="end" so this menu doesn't break the layout on small screens */}
                      <DropdownMenuContent
                        align="end"
                        className="bg-slate-900 border-slate-800 text-white"
                      >
                        <DropdownMenuItem
                          onClick={() => onEditClick(item)}
                          className="hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 focus:bg-red-950/30 cursor-pointer"
                          onClick={() => onDeleteClick(item.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
