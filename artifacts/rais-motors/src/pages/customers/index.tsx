import { useState } from "react";
import { useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, getListCustomersQueryKey, type CustomerInput, type Customer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Users as UsersIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const customerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

function CustomerForm({ 
  initialData, 
  onSubmit, 
  onCancel 
}: { 
  initialData?: Customer | null, 
  onSubmit: (data: CustomerFormValues) => void,
  onCancel: () => void
}) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData ? {
      fullName: initialData.fullName,
      phone: initialData.phone,
      email: initialData.email || "",
      address: initialData.address || "",
      cnic: initialData.cnic || "",
      notes: initialData.notes || "",
    } : {
      fullName: "",
      phone: "",
      email: "",
      address: "",
      cnic: "",
      notes: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="Ali Khan" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Phone Number</FormLabel>
                <FormControl><Input placeholder="0300-1234567" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>Email</FormLabel>
                <FormControl><Input placeholder="ali@example.com" {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cnic"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel>CNIC</FormLabel>
                <FormControl><Input placeholder="12345-1234567-1" {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Address</FormLabel>
                <FormControl><Input placeholder="123 Main St, City" {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl><Input placeholder="Any additional details..." {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{initialData ? "Update" : "Add"} Customer</Button>
        </div>
      </form>
    </Form>
  );
}

export default function CustomersList() {
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: customers, isLoading } = useListCustomers(
    { search: search || undefined }, 
    { query: { queryKey: getListCustomersQueryKey({ search: search || undefined }) } }
  );

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const handleCreate = (data: CustomerFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setIsAddOpen(false);
        toast({ title: "Success", description: "Customer added successfully" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to add customer", variant: "destructive" });
      }
    });
  };

  const handleUpdate = (data: CustomerFormValues) => {
    if (!editingCustomer) return;
    updateMutation.mutate({ id: editingCustomer.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setEditingCustomer(null);
        toast({ title: "Success", description: "Customer updated successfully" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to update customer", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this customer? This will fail if they have associated sales.")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Success", description: "Customer deleted successfully" });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message || "Failed to delete customer", variant: "destructive" });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>Enter the customer's contact information.</DialogDescription>
            </DialogHeader>
            <CustomerForm onSubmit={handleCreate} onCancel={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or CNIC..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>CNIC</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : customers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <UsersIcon className="h-8 w-8 mb-2 opacity-20" />
                    <p>No customers found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers?.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link href={`/customers/${customer.id}`} className="font-medium hover:underline text-primary">
                      {customer.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{customer.phone}</span>
                      {customer.email && <span className="text-xs text-muted-foreground">{customer.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={customer.address || ""}>{customer.address || "-"}</TableCell>
                  <TableCell>{customer.cnic || "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/customers/${customer.id}`} className="cursor-pointer w-full flex">
                            View profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(customer.id)} className="text-destructive">
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

      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update contact information for {editingCustomer?.fullName}.</DialogDescription>
          </DialogHeader>
          {editingCustomer && (
            <CustomerForm initialData={editingCustomer} onSubmit={handleUpdate} onCancel={() => setEditingCustomer(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
