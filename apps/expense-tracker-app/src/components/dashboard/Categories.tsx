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
  FolderTree,
  Search,
  AlertTriangle, // 👈 Added for the warning modal
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
  DialogDescription,
} from "../../../@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../@/components/ui/select";

interface CategoriesProps {
  setActiveTab?: (tab: string) => void;
}

const formSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export function Categories({ setActiveTab }: CategoriesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 👇 1. NEW STATE: Keeps track of which category is being deleted
  const [deleteContext, setDeleteContext] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories", "list", searchQuery],
    queryFn: () => orpc.categories.list.call({ search: searchQuery }),
  });

  const invalidateAllCategoryData = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["categories", "list"],
      exact: false,
    });
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
    mutationFn: (values: any) => orpc.categories.create.call(values),
    onSuccess: invalidateAllCategoryData,
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) =>
      orpc.categories.update.call({ id: editingId!, ...values }),
    onSuccess: invalidateAllCategoryData,
  });

  // 👇 2. UPDATED MUTATION: Now accepts our boolean switch!
  const deleteMutation = useMutation({
    mutationFn: ({
      id,
      deleteTransactions,
    }: {
      id: number;
      deleteTransactions: boolean;
    }) => orpc.categories.delete.call({ id, deleteTransactions }),
    onSuccess: () => {
      invalidateAllCategoryData();
      setDeleteContext(null); // Close the modal on success
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      type: "EXPENSE" as "INCOME" | "EXPENSE",
    },
    validators: { onChange: formSchema },
    onSubmit: async ({ value }) => {
      try {
        if (editingId) {
          await updateMutation.mutateAsync(value);
        } else {
          await createMutation.mutateAsync(value);
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
    form.setFieldValue("name", item.name);
    form.setFieldValue("type", item.type);
    setIsModalOpen(true);
  };

  // 👇 3. UPDATED DELETE CLICK: Just opens the modal, doesn't delete yet
  const onDeleteClick = (item: any) => {
    setDeleteContext({ id: item.id, name: item.name });
  };

  return (
    <div className="space-y-6 text-white">
      {/* Header Info Banner */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <FolderTree className="size-6 text-blue-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-slate-400 text-sm">
            Manage your income and expense groupings.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 w-full focus-visible:ring-blue-600"
          />
        </div>

        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => !open && closeModal()}
        >
          <DialogTrigger asChild>
            <Button
              className="bg-blue-600 hover:bg-blue-500 font-bold whitespace-nowrap"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="mr-2 size-4" /> Add Category
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-slate-900 border-slate-800 text-white !max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingId ? "Edit Category" : "New Category"}
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
                name="name"
                children={(field) => (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category Name</label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Groceries, Salary, Rent..."
                      className="bg-slate-800 border-slate-700 placeholder:text-slate-500"
                    />
                  </div>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-blue-600 font-bold py-6 mt-4"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="animate-spin size-5" />
                ) : editingId ? (
                  "Update Category"
                ) : (
                  "Save Category"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden flex flex-col h-[calc(100vh-280px)]">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-900/50 hover:bg-transparent">
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">Type</TableHead>
                <TableHead className="text-slate-400 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-10 text-slate-500"
                  >
                    <Loader2 className="size-6 animate-spin mx-auto mb-2" />
                    Loading categories...
                  </TableCell>
                </TableRow>
              ) : categories?.filter((c) => c.isActive).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-10 text-slate-500"
                  >
                    No categories found. Create one to get started!
                  </TableCell>
                </TableRow>
              ) : (
                (categories ?? [])
                  .filter((item) => item.isActive) // 👈 4. THE FILTER: Hide soft-deleted items!
                  .map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-slate-800 hover:bg-slate-800/40 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-200">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold ${
                            item.type === "INCOME"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-slate-800 text-slate-400"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-slate-900 border-slate-800 text-white"
                          >
                            <DropdownMenuItem
                              className="cursor-pointer hover:bg-slate-800"
                              onClick={() => onEditClick(item)}
                            >
                              <Edit className="mr-2 h-4 w-4 text-blue-400" />{" "}
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-red-400 focus:bg-red-950/30 focus:text-red-400"
                              onClick={() => onDeleteClick(item)} // Pass the whole item now
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

      {/* 👇 5. THE NUCLEAR MODAL 👇 */}
      <Dialog
        open={!!deleteContext}
        onOpenChange={(open) => !open && setDeleteContext(null)}
      >
        <DialogContent className="bg-slate-900 border-slate-800 text-white !max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-400">
              <AlertTriangle className="size-5" />
              Delete "{deleteContext?.name}"?
            </DialogTitle>
            <DialogDescription className="text-slate-400 pt-3 space-y-2">
              <p>
                How would you like to handle the historical transactions tied to
                this category?
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            {/* The Safe Option */}
            <Button
              variant="outline"
              className="w-full justify-start border-slate-700 hover:bg-slate-800 py-6 whitespace-normal h-auto text-left"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate({
                  id: deleteContext!.id,
                  deleteTransactions: false,
                })
              }
            >
              <div>
                <strong className="block text-slate-200">
                  Archive Category (Recommended)
                </strong>
                <span className="text-xs text-slate-400 font-normal">
                  Hides from menus but keeps your past dashboard math perfectly
                  intact.
                </span>
              </div>
            </Button>

            {/* The Danger Option */}
            <Button
              variant="destructive"
              className="w-full justify-start bg-red-950/40 text-red-400 hover:bg-red-900 hover:text-white border border-red-900 py-6 whitespace-normal h-auto text-left transition-colors"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate({
                  id: deleteContext!.id,
                  deleteTransactions: true,
                })
              }
            >
              <div>
                <strong className="block">Delete Everything</strong>
                <span className="text-xs font-normal opacity-80">
                  Permanently erases the category AND all associated
                  transactions. This will change your total balance.
                </span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
