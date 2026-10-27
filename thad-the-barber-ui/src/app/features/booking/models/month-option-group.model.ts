import { MonthOption } from './month-option.model';

/** The month picker's months, one group per year. */
export interface MonthOptionGroup {
  year: number;
  monthOptions: MonthOption[];
}
