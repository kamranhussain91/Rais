import { useState } from "react";
import { useListBikes, useCreateBike, useUpdateBike, useDeleteBike, getListBikesQueryKey, type BikeInput, type Bike } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Bike as BikeIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const bikeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  category: z.string().min(1, "Category is required"),
  color: z.string().optional(),
  engineCc: z.coerce.number().optional().nullable(),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be positive").optional(),
  salePrice: z.coerce.number().min(0, "Sale price must be positive"),
  stock: z.coerce.number().min(0, "Stock cannot be negative"),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  sku: z.string().min(1, "SKU is required"),
  imageUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type BikeFormValues = z.infer<typeof bikeSchema>;

function BikeForm({ 
  initialData, 
  onSubmit, 
  onCancel 
}: { 
  initialData?: Bike | null, 
  onSubmit: (data: BikeFormValues) => void,
  onCancel: () => void
}) {
  const form = useForm<BikeFormValues>({
    resolver: zodResolver(bikeSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      brand: initialData.brand,
      model: initialData.model,
      category: initialData.category,
      color: initialData.color || "",
      engineCc: initialData.engineCc,
      purchasePrice: initialData.purchasePrice,
      salePrice: initialData.salePrice,
      stock: initialData.stock,
      lowStockThreshold: initialData.lowStockThreshold || 0,
      sku: initialData.sku,
      imageUrl: initialData.imageUrl || "",
      notes: initialData.notes || "",
    } : {
      name: "",
      brand: "",
      model: "",
      category: "Standard",
      color: "",
      engineCc: 0,
      purchasePrice: 0,
      salePrice: 0,
      stock: 0,
      lowStockThreshold: 2,
      sku: "",
      imageUrl: "",
      notes: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Honda CD 70" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl><Input placeholder="HON-CD70-BLK" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl><Input placeholder="Honda" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model Year</FormLabel>
                <FormControl><Input placeholder="2024" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Cruiser">Cruiser</SelectItem>
                    <SelectItem value="Off-Road">Off-Road</SelectItem>
                    <SelectItem value="Scooter">Scooter</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl><Input placeholder="Black" {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="engineCc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Engine (CC)</FormLabel>
                <FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Stock</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale Price (Rs)</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchasePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Price (Rs)</FormLabel>
                <FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">{initialData ? "Update" : "Add"} Bike</Button>
        </div>
      </form>
    </Form>
  );
}

export default function InventoryList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBike, setEditingBike] = useState<Bike | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: bikes, isLoading } = useListBikes(
    { search: search || undefined }, 
    { query: { queryKey: getListBikesQueryKey({ search: search || undefined }) } }
  );

  const createMutation = useCreateBike();
  const updateMutation = useUpdateBike();
  const deleteMutation = useDeleteBike();

  const handleCreate = (data: BikeFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setIsAddOpen(false);
        toast({ title: "Success", description: "Bike added successfully" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to add bike", variant: "destructive" });
      }
    });
  };

  const handleUpdate = (data: BikeFormValues) => {
    if (!editingBike) return;
    updateMutation.mutate({ id: editingBike.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setEditingBike(null);
        toast({ title: "Success", description: "Bike updated successfully" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to update bike", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this bike?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries();
          toast({ title: "Success", description: "Bike deleted successfully" });
        }
      });
    }
  };

  const filteredBikes = bikes?.filter(bike => {
    if (statusFilter === "all") return true;
    if (statusFilter === "out_of_stock") return bike.stock === 0;
    if (statusFilter === "low_stock") return bike.stock > 0 && bike.stock <= (bike.lowStockThreshold || 2);
    if (statusFilter === "in_stock") return bike.stock > (bike.lowStockThreshold || 2);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Bike</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Bike</DialogTitle>
              <DialogDescription>Enter the details for the new motorcycle.</DialogDescription>
            </DialogHeader>
            <BikeForm onSubmit={handleCreate} onCancel={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bikes by name, brand, or SKU..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredBikes?.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
            <BikeIcon className="h-10 w-10 opacity-20 mb-2" />
            <p>No bikes found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredBikes?.map((bike) => {
            const status = bike.stock === 0
              ? "out"
              : bike.stock <= (bike.lowStockThreshold || 2)
              ? "low"
              : "in";
            return (
              <Card key={bike.id} className="overflow-hidden hover:border-primary/50 transition-colors flex flex-col">
                <div className="relative aspect-[4/3] bg-muted/40 flex items-center justify-center border-b">
                  {bike.imageUrl ? (
                    <img src={bike.imageUrl} alt={bike.name} className="w-full h-full object-cover" />
                  ) : (
                    <BikeIcon className="h-12 w-12 text-muted-foreground/30" />
                  )}
                  <Badge
                    variant={status === "out" ? "destructive" : status === "low" ? "secondary" : "default"}
                    className="absolute top-2 right-2 text-[10px]"
                  >
                    {status === "out" ? "Out of Stock" : status === "low" ? "Low Stock" : "In Stock"}
                  </Badge>
                  <div className="absolute top-2 left-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/inventory/${bike.id}`} className="cursor-pointer w-full flex">
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setEditingBike(bike)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(bike.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{bike.brand} &bull; {bike.category}</p>
                      <Link href={`/inventory/${bike.id}`} className="font-semibold hover:text-primary truncate block">
                        {bike.name}
                      </Link>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bike.model}{bike.color ? ` · ${bike.color}` : ""}{bike.engineCc ? ` · ${bike.engineCc}cc` : ""}
                  </p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="text-lg font-bold leading-none">{formatPKR(bike.salePrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <p className="text-lg font-bold leading-none">{bike.stock}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{bike.sku}</span>
                    <Link href={`/inventory/${bike.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">View</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingBike} onOpenChange={(open) => !open && setEditingBike(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bike</DialogTitle>
            <DialogDescription>Update details for {editingBike?.name}.</DialogDescription>
          </DialogHeader>
          {editingBike && (
            <BikeForm initialData={editingBike} onSubmit={handleUpdate} onCancel={() => setEditingBike(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
