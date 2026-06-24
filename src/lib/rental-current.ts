export type RentalForCurrentCheck = {
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
};

function dateOnlyLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** True when the rental overlaps `onDate` (inclusive start and end dates). */
export function isRentalActiveOnDate(rental: RentalForCurrentCheck, onDate: Date = startOfTodayLocal()): boolean {
  const day = dateOnlyLocal(onDate);
  const start = rental.start_date ? dateOnlyLocal(rental.start_date) : null;
  const end = rental.end_date ? dateOnlyLocal(rental.end_date) : null;
  if (start && start > day) return false;
  if (end && end < day) return false;
  return true;
}

function sortRentalsNewestFirst<T extends RentalForCurrentCheck>(rentals: T[]): T[] {
  return [...rentals].sort((a, b) => {
    const aPrimary = a.start_date?.getTime() ?? a.created_at.getTime();
    const bPrimary = b.start_date?.getTime() ?? b.created_at.getTime();
    if (aPrimary !== bPrimary) return bPrimary - aPrimary;
    return b.created_at.getTime() - a.created_at.getTime();
  });
}

/** Active rental with the latest start date; null when every lease has ended or not yet started. */
export function findCurrentRental<T extends RentalForCurrentCheck>(rentals: T[]): T | null {
  const today = startOfTodayLocal();
  const active = rentals.filter((rental) => isRentalActiveOnDate(rental, today));
  if (active.length === 0) return null;
  return sortRentalsNewestFirst(active)[0] ?? null;
}
