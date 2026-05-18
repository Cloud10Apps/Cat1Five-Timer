import type { ReactNode } from "react";
import {
  Building2,
  KeyRound,
  UsersRound,
  ShieldCheck,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/format-phone";

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

/**
 * Per-type visual config. Tailwind classes must be literal strings here so the
 * compiler keeps them in the final CSS bundle.
 */
export interface ContactTypeMeta {
  label: string;
  singular: string;
  icon: typeof Building2;
  /** Background class for the icon container (50 stop). */
  iconBgClass: string;
  /** Text/stroke class for the icon (700 stop). */
  iconColorClass: string;
  /** Background class for the inline type badge (50 stop). */
  badgeBgClass: string;
  /** Text class for the inline type badge (800 stop). */
  badgeTextClass: string;
}

export const CONTACT_TYPE_META: Record<ContactType, ContactTypeMeta> = {
  elevator_company: {
    label: "Elevator Companies",
    singular: "Elevator Company",
    icon: Building2,
    iconBgClass: "bg-amber-50",
    iconColorClass: "text-amber-700",
    badgeBgClass: "bg-amber-50",
    badgeTextClass: "text-amber-800",
  },
  building_owner: {
    label: "Building Owners",
    singular: "Building Owner",
    icon: KeyRound,
    iconBgClass: "bg-blue-50",
    iconColorClass: "text-blue-700",
    badgeBgClass: "bg-blue-50",
    badgeTextClass: "text-blue-800",
  },
  property_manager: {
    label: "Property Managers",
    singular: "Property Manager",
    icon: UsersRound,
    iconBgClass: "bg-purple-50",
    iconColorClass: "text-purple-700",
    badgeBgClass: "bg-purple-50",
    badgeTextClass: "text-purple-800",
  },
  state_inspector: {
    label: "State Inspectors",
    singular: "State Inspector",
    icon: ShieldCheck,
    iconBgClass: "bg-green-50",
    iconColorClass: "text-green-700",
    badgeBgClass: "bg-green-50",
    badgeTextClass: "text-green-800",
  },
  other: {
    label: "Other",
    singular: "Other",
    icon: User,
    iconBgClass: "bg-zinc-100",
    iconColorClass: "text-zinc-600",
    badgeBgClass: "bg-zinc-100",
    badgeTextClass: "text-zinc-700",
  },
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
  /** Right-side detail column (e.g. stat counts on master list). */
  rightDetail?: ReactNode;
  /** Trailing actions (trash, switch, chevron, etc.). Consumers handle stopPropagation. */
  trailingActions: ReactNode;
  /** When provided, the row becomes a clickable navigation surface (button). */
  onClick?: () => void;
  /** Size variant: master list is denser; default for detail page. */
  size?: "default" | "lg";
  /** When false, hides the type label badge next to the contact name. Default true. */
  showBadge?: boolean;
}

export function ContactRow({
  contactType,
  companyName,
  contactName,
  email,
  phone,
  rightDetail,
  trailingActions,
  onClick,
  size = "default",
  showBadge = true,
}: ContactRowProps) {
  const meta = CONTACT_TYPE_META[contactType as ContactType] ?? CONTACT_TYPE_META.other;
  const Icon = meta.icon;
  const primary = contactDisplayName({ companyName, contactName, email });
  const secondaryParts: string[] = [];
  if (companyName && contactName) secondaryParts.push(contactName);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const iconSize = size === "lg" ? "w-11 h-11" : "w-10 h-10";
  const padding = size === "lg" ? "px-[18px] py-4" : "px-4 py-3";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-white transition-all transition-colors duration-150",
        padding,
        onClick && "cursor-pointer hover:shadow-sm hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        !onClick && "hover:shadow-sm",
      )}
    >
      <div className={cn("flex items-center justify-center rounded-lg shrink-0", iconSize, meta.iconBgClass, meta.iconColorClass)}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-[16px] font-medium text-zinc-900 truncate">{primary}</div>
          {showBadge && (
            <span className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0",
              meta.badgeBgClass,
              meta.badgeTextClass,
            )}>
              {meta.singular}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] mt-0.5">
          {secondaryParts.map((p) => (
            <span key={p} className="truncate text-zinc-700">{p}</span>
          ))}
          <span className="inline-flex items-center gap-1 min-w-0 truncate">
            <Mail className="h-3 w-3 shrink-0 text-zinc-400" />
            <span className="truncate text-zinc-500">{email}</span>
          </span>
          {phone && (
            <span className="inline-flex items-center gap-1 shrink-0">
              <Phone className="h-3 w-3 text-zinc-400" />
              <span className="text-zinc-500">{formatPhone(phone)}</span>
            </span>
          )}
        </div>
      </div>

      {rightDetail !== undefined && (
        <div className="shrink-0 text-right max-w-[14rem]">
          {rightDetail}
        </div>
      )}

      <div className="flex items-center gap-0.5 shrink-0">
        {trailingActions}
      </div>
    </div>
  );
}
