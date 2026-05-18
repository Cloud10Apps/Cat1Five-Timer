import {
  useListInspections,
  getListInspectionsQueryKey,
} from "@workspace/api-client-react";

export type BuildingComplianceLevel =
  | "loading"
  | "no-units"
  | "overdue"
  | "due-soon"
  | "compliant";

export interface BuildingCompliance {
  overdueCount: number;
  dueSoonCount: number;
  statusColorClass: string;
  level: BuildingComplianceLevel;
}

export function useBuildingCompliance(
  buildingId: number | undefined,
  elevatorCount: number,
): BuildingCompliance {
  const { data: inspections } = useListInspections(
    buildingId ? { buildingId } : {},
    {
      query: {
        queryKey: getListInspectionsQueryKey(buildingId ? { buildingId } : {}),
        staleTime: 5 * 60 * 1000,
        enabled: !!buildingId,
      },
    },
  );

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const overdueCount = (inspections ?? []).filter((i: any) => i.status === "OVERDUE").length;
  const dueSoonCount = (inspections ?? []).filter(
    (i: any) => i.status !== "OVERDUE" && i.nextDueDate >= today && i.nextDueDate <= in30,
  ).length;

  let level: BuildingComplianceLevel;
  if (elevatorCount === 0) {
    level = "no-units";
  } else if (inspections === undefined) {
    level = "loading";
  } else if (overdueCount > 0) {
    level = "overdue";
  } else if (dueSoonCount > 0) {
    level = "due-soon";
  } else {
    level = "compliant";
  }

  const statusColorClass = "bg-zinc-100 text-zinc-500";

  return { overdueCount, dueSoonCount, statusColorClass, level };
}
