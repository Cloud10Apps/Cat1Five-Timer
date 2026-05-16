import type { ReactNode } from "react";
import {
  Building2,
  KeyRound,
  UserCog,
  ShieldCheck,
  User,
  Mail,
  Phone,
} from "lucide-react";

export type ContactType =
  | "elevator_company"
  | "building_owner"
  | "property_manager"
  | "state_inspector"
  | "other";

export const CONTACT_TYPE_ORDER: ContactType[] = [
  "elevator_company",
  "building_owner",
  "property_manager",
  "state_inspector",
  "other",
];

export const CONTACT_TYPE_META: Record<
  ContactType,
  { label: string; singular: string; icon: typeof Building2 }
> = {
  elevator_company: { label: "Elevator Companies", singular: "Elevator Company", icon: Building2 },
  building_owner:   { label: "Building Owners",    singular: "Building Owner",   icon: KeyRound },
  property_manager: { label: "Property Managers",  singular: "Property Manager", icon: UserCog },
  state_inspector:  { label: "State Inspectors",   singular: "State Inspector",  icon: ShieldCheck },
  other:            { label: "Other",              singular: "Other",            icon: User },
};

export function contactDisplayName(args: {
  companyName?: string | null;
  contactName?: string | null;
  email: string;
}): string {
  return args.companyName?.trim() || args.contactName?.trim() || args.email;
}

interface ContactRowProps {
  contactType: ContactType | string;
  companyName?: string | null;
  contactName?: string | null;
  email: string;
  phone?: string | null;
  customerName?: string | null;
  rightDetail?: ReactNode;
  trailingActions: ReactNode;
}

export function ContactRow({
  contactType,
  companyName,
  contactName,
  email,
  phone,
  customerName,
  rightDetail,
  trailingActions,
}: ContactRowProps) {
  const meta = CONTACT_TYPE_META[contactType as ContactType] ?? CONTACT_TYPE_META.other;
  const Icon = meta.icon;
  const primary = contactDisplayName({ companyName, contactName, email });
  const secondaryParts: string[] = [];
  if (companyName && contactName) secondaryParts.push(contactName);

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white px-4 py-3 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600 shrink-0">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-zinc-900 truncate">{primary}</div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wide shrink-0">
            {meta.singular}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500 mt-0.5">
          {secondaryParts.map((p) => (
            <span key={p} className="truncate">{p}</span>
          ))}
          <span className="inline-flex items-center gap-1 min-w-0 truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{email}</span>
          </span>
          {phone && (
            <span className="inline-flex items-center gap-1 shrink-0">
              <Phone className="h-3 w-3" />
              {phone}
            </span>
          )}
          {customerName && (
            <span className="text-zinc-400 truncate">· {customerName}</span>
          )}
        </div>
      </div>

      {rightDetail !== undefined && (
        <div className="hidden sm:block text-xs text-zinc-500 text-right shrink-0 max-w-[14rem]">
          {rightDetail}
        </div>
      )}

      <div className="flex items-center gap-0.5 shrink-0">
        {trailingActions}
      </div>
    </div>
  );
}
