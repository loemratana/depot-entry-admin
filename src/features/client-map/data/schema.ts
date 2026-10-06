import { z } from 'zod'
import {
  FILTER_DATE_PATTERN,
  isFilterRangeValid,
} from '@/features/clients/lib/format'

const isoDate = z
  .string()
  // A day, or a day and time (yyyy-MM-ddTHH:mm)
  .regex(FILTER_DATE_PATTERN)
  .optional()
  .catch(undefined)

const optionalId = z.string().trim().min(1).max(64).optional().catch(undefined)

/** URL search params of /client-map (source of truth for filters and focus) */
export const clientMapSearchSchema = z
  .object({
    provinceId: optionalId,
    districtId: optionalId,
    communeId: optionalId,
    dateFrom: isoDate,
    dateTo: isoDate,
    /** From "View on map": show this outlet and open this photo's marker */
    submissionId: optionalId,
    photoId: optionalId,
    sequence: z.boolean().optional().catch(undefined),
  })
  .transform((search) =>
    !isFilterRangeValid(search.dateFrom, search.dateTo)
      ? { ...search, dateTo: undefined }
      : search
  )

export type ClientMapSearch = z.infer<typeof clientMapSearchSchema>
