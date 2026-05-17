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

const basicFields = {
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
};

const requireOneName = (
  d: { companyName?: string; contactName?: string },
) => !!((d.companyName ?? "").trim() || (d.contactName ?? "").trim());

const createContactSchema = z
  .object({
    customerId: z.coerce.number().min(1, "Customer is required"),
    ...basicFields,
  })
  .refine(requireOneName, {
    message: "Either company name or contact name is required",
    path: ["companyName"],
  });

type CreateContactValues = z.infer<typeof createContactSchema>;

const editContactSchema = z
  .object(basicFields)
  .refine(requireOneName, {
    message: "Either company name or contact name is required",
    path: ["companyName"],
  });

type EditContactValues = z.infer<typeof editContactSchema>;

// ──────────────────────────────────────────────────────────────────
// CreateContactDialog
// ──────────────────────────────────────────────────────────────────

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the Customer field. User can still change it before save. */
  defaultCustomerId?: number;
  /** Called with the newly-created contact after a successful save. */
  onSuccess?: (contact: Contact) => void;
}

export function CreateContactDialog({
  open,
  onOpenChange,
  defaultCustomerId,
  onSuccess,
}: CreateContactDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: customers } = useListCustomers(
    {},
    { query: { queryKey: getListCustomersQueryKey() } },
  );

  const createMutation = useCreateContact();

  const form = useForm<CreateContactValues>({
    resolver: zodResolver(createContactSchema),
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
    form.reset({
      customerId: defaultCustomerId ?? 0,
      contactType: "elevator_company",
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
    });
  }, [open, defaultCustomerId, form]);

  const onSubmit = (data: CreateContactValues) => {
    createMutation.mutate(
      {
        data: {
          customerIds: [data.customerId],
          contactType: data.contactType,
          companyName: data.companyName?.trim() || undefined,
          contactName: data.contactName?.trim() || undefined,
          email: data.email.trim(),
          phone: data.phone?.trim() || undefined,
        },
      },
      {
        onSuccess: (c) => {
          queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
          toast({ title: "Contact added" });
          onOpenChange(false);
          form.reset();
          onSuccess?.(c);
        },
        onError: () => toast({ title: "Failed to add contact", variant: "destructive" }),
      },
    );
  };

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
          <DialogTitle>Add New Contact</DialogTitle>
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

            <ContactTypeField form={form} />
            <NameAndContactFields form={form} />
            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Save Contact"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────
// EditContactDialog
// ──────────────────────────────────────────────────────────────────

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSuccess?: (contact: Contact) => void;
}

export function EditContactDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: EditContactDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useUpdateContact();

  const form = useForm<EditContactValues>({
    resolver: zodResolver(editContactSchema),
    defaultValues: {
      contactType: "elevator_company",
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!open || !contact) return;
    form.reset({
      contactType: contact.contactType as ContactType,
      companyName: contact.companyName ?? "",
      contactName: contact.contactName ?? "",
      email: contact.email,
      phone: contact.phone ?? "",
    });
  }, [open, contact, form]);

  const onSubmit = (data: EditContactValues) => {
    if (!contact) return;
    updateMutation.mutate(
      {
        id: contact.id,
        // customerIds intentionally omitted — server keeps existing associations.
        data: {
          contactType: data.contactType,
          companyName: data.companyName?.trim() || undefined,
          contactName: data.contactName?.trim() || undefined,
          email: data.email.trim(),
          phone: data.phone?.trim() || undefined,
        },
      },
      {
        onSuccess: (c) => {
          queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
          toast({ title: "Contact updated" });
          onOpenChange(false);
          onSuccess?.(c);
        },
        onError: () => toast({ title: "Failed to update contact", variant: "destructive" }),
      },
    );
  };

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
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ContactTypeField form={form} />
            <NameAndContactFields form={form} />
            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-900"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────
// Shared sub-fields
// ──────────────────────────────────────────────────────────────────

function ContactTypeField({ form }: { form: any }) {
  return (
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
  );
}

function NameAndContactFields({ form }: { form: any }) {
  return (
    <>
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
    </>
  );
}
