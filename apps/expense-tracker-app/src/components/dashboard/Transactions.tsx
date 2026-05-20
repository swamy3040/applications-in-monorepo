import { useState } from "react";
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

interface TransactionsProps {
  setActiveTab: (tab: string) => void;
}

const formSchema = z.object({
  description: z.string().min(2, "Too short"),
  amount: z.string().min(1, "Required"),
  categoryId: z.string().min(1, "Required"),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export function Transactions({ setActiveTab }: TransactionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const queryClient = useQueryClient();

  // PURE TANSTACK FLOW: This forces the query key to update on every keystroke
  // and manually passes the live search string as the body payload.
  const { data: expenses } = useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, searchQuery], // Use the shared prefix
    queryFn: () => orpc.expenses.list.call({ search: searchQuery }),
  });

  const invalidateAllExpenses = () => {
    queryClient.invalidateQueries({
      queryKey: EXPENSES_QUERY_KEY, // This prefix matches BOTH the dashboard and the search queries
      exact: false, // This ensures it clears the dashboard AND all search variations
    });
  };

  const { data: categories } = useQuery(orpc.categories.list.queryOptions());

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
          categoryId: Number(value.categoryId),
          date: new Date(),
        };

        if (editingId) {
          await updateMutation.mutateAsync(payload);
        } else {
          await createMutation.mutateAsync(payload);
        }

        // Invalidate the exact flat cache layout array matching our query
        await queryClient.invalidateQueries({
          queryKey: ["expenses", "list", searchQuery],
        });
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

    // Invalidate the exact matching array pattern here too
    await queryClient.invalidateQueries({
      queryKey: ["expenses", "list", searchQuery],
    });
  };

  return (
    <div className="space-y-6 text-white">
      {/* 👇 LAYOUT UPDATE: Flex row stretches items on mobile, flattens to layout row with gap-4 */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        {/* 👇 Extended search container to fill empty width space */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 w-full focus-visible:ring-blue-600"
          />
        </div>

        {/* 👇 Button container neatly aligned to the end side */}
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
                  <div className="space-y-5">
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
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
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
                className="w-full bg-blue-600 font-bold py-6"
                disabled={createMutation.isPending || updateMutation.isPending}
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

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 bg-slate-900/50 hover:bg-transparent">
              <TableHead className="text-slate-400">Description</TableHead>
              <TableHead className="text-slate-400">Category</TableHead>
              <TableHead className="text-slate-400">Amount</TableHead>
              <TableHead className="text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(expenses ?? []).map((item) => {
              const cat = categories?.find((c) => c.id === item.categoryId);
              return (
                <TableRow
                  key={item.id}
                  className="border-slate-800 hover:bg-slate-800/40 transition-colors"
                >
                  <TableCell className="font-medium">
                    {item.description}
                  </TableCell>
                  <TableCell>{cat?.name}</TableCell>
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
                      <DropdownMenuContent className="bg-slate-900 border-slate-800 text-white">
                        <DropdownMenuItem onClick={() => onEditClick(item)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 focus:bg-red-950/30"
                          onClick={() => onDeleteClick(item.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
