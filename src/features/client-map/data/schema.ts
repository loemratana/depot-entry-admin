import { z } from 'zod'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
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
    search.dateFrom && search.dateTo && search.dateFrom > search.dateTo
      ? { ...search, dateTo: undefined }
      : search
  )

export type ClientMapSearch = z.infer<typeof clientMapSearchSchema>
