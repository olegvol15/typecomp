import type { SortingState } from "@tanstack/react-table";

export type TableUrlState = {
  sort: string;
  dir: "asc" | "desc";
  page: number;
  size: number;
};

export function readTableUrl(
  searchParams: URLSearchParams,
  defaults: TableUrlState,
  allowedSizes: readonly number[],
): TableUrlState {
  const sort = searchParams.get("sort") ?? defaults.sort;
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "", 10) || 0);
  const rawSize = parseInt(searchParams.get("size") ?? "", 10);
  const size = allowedSizes.includes(rawSize) ? rawSize : defaults.size;
  return { sort, dir, page, size };
}

export function writeTableUrl(
  params: URLSearchParams,
  sorting: SortingState,
  page: number,
  size: number,
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  if (sorting.length > 0) {
    next.set("sort", sorting[0].id);
    next.set("dir", sorting[0].desc ? "desc" : "asc");
  }
  next.set("page", String(page));
  next.set("size", String(size));
  return next;
}
