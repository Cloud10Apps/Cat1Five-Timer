import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateContact,
  useUpdateContact,
  useListCustomers,
  getListCustomersQueryKey,
  getListContactsQueryKey,
  Contact,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CONTACT_TYPE_ORDER, CONTACT_TYPE_META, type ContactType } from "./contact-row";

const contactSchema = z
  .object({
    customerId: z.coerce.number().min(1, "Customer is required"),
    contactType: z.enum([
      "elevator_company",
      "building_owner",
      "property_manager",
      "state_inspector",
      "other",
    ]),
    companyName: z.string().optional(),
    contactName: z.string().optional(),
    email: z.string().email("Valid email required"),
    phone: z.string().optional(),
  })
  .refine((d) => !!((d.companyName ?? "").trim() || (d.contactName ?? "").trim()), {
    message: "Either company name or contact name is required",
    path: ["companyName"],
  });

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContact?: Contact | null;
  defaultCustomerId?: number;
  lockCustomer?: boolean;
  onSuccess?: (contact: Contact) => void;
}

export function ContactFormDialog({
  open,
  onOpenChange,
  editingContact,
  defaultCustomerId,
  lockCustomer,
  onSuccess,
}: ContactFormDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: customers } = useListCustomers(
    {},
    { query: { queryKey: getListCustomersQueryKey() } },
  );

  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      customerId: defaultCustomerId ?? 0,
      contactType: "elevator_company",
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editingContact) {
      form.reset({
        customerId: editingContact.customerId,
        contactType: editingContact.contactType as ContactType,
        companyName: editingContact.companyName ?? "",
        contactName: editingContact.contactName ?? "",
        email: editingContact.email,
        phone: editingContact.phone ?? "",
      });
    } else {
      form.reset({
        customerId: defaultCustomerId ?? 0,
        contactType: "elevator_company",
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
      });
    }
  }, [open, editingContact, defaultCustomerId, form]);

  const onSubmit = (data: ContactFormValues) => {
    const body = {
      customerId: data.customerId,
      contactType: data.contactType,
      companyName: data.companyName?.trim() || undefined,
      contactName: data.contactName?.trim() || undefined,
      email: data.email.trim(),
      phone: data.phone?.trim() || undefined,
    };
    const after = (contact: Contact, msg: string) => {
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      toast({ title: msg });
      onOpenChange(false);
      form.reset();
      onSuccess?.(contact);
    };
    if (editingContact) {
      updateMutation.mutate(
        { id: editingContact.id, data: body },
        {
          onSuccess: (c) => after(c, "Contact updated"),
          onError: () => toast({ title: "Failed to update contact", variant: "destructive" }),
        },
      );
    } else {
      createMutation.mutate(
        { data: body },
        {
          onSuccess: (c) => after(c, "Contact added"),
          onError: () => toast({ title: "Failed to add contact", variant: "destructive" }),
        },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) form.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    disabled={lockCustomer}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(customers ?? []).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTACT_TYPE_ORDER.map((t) => (
                        <SelectItem key={t} value={t}>{CONTACT_TYPE_META[t].singular}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Schindler Elevator" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Marco Trevino" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="dispatch@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 555-0100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900"
              disabled={isPending}
            >
              {isPending
                ? "Saving..."
                : editingContact
                  ? "Save Changes"
                  : "Save Contact"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
