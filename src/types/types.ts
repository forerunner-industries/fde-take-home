import { z } from "zod";
import type { components } from "./api-types";

export const PropertyAddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
});

export const DocumentSchema = z.object({
  documentId: z.string(),
  filename: z.string(),
  documentType: z.string(),
  uploadDate: z.string(),
  fileUrl: z.string(),
});

export const PermitStatusSchema = z.enum([
  "Pending",
  "In Progress",
  "Complete",
  "Rejected",
  "On Hold",
]);

export const PermitSchema = z.object({
  permitId: z.string(),
  propertyAddress: PropertyAddressSchema,
  status: PermitStatusSchema,
  dateSubmitted: z.string(),
  improvementAmount: z.number(),
  documents: z.array(DocumentSchema),
});

export const PermitQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => parseInt(val || "1"))
    .pipe(z.number().int().gt(0).default(1)),
  perPage: z
    .string()
    .optional()
    .transform((val) => parseInt(val || "5"))
    .pipe(z.number().int().positive().max(5).default(5)),
  submittedAfter: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: "submittedAfter must be in YYYY-MM-DD format",
    }),
  submittedBefore: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: "submittedBefore must be in YYYY-MM-DD format",
    }),
  status: PermitStatusSchema.optional(),
});

export type PropertyAddress = z.infer<typeof PropertyAddressSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type Permit = z.infer<typeof PermitSchema>;
export type PermitQuery = z.infer<typeof PermitQuerySchema>;

export const validatePermits = (data: unknown): Permit[] => {
  const permitsArraySchema = z.array(PermitSchema);
  return permitsArraySchema.parse(data);
};

export const SimplifiedPermitSchema = z.object({
  permitId: z.string(),
  status: PermitStatusSchema,
});

export type SimplifiedPermit = z.infer<typeof SimplifiedPermitSchema>;

export type ErrorResponse = components["schemas"]["Error"];
export type PaginatedResponse = Omit<
  components["schemas"]["PaginatedPermits"],
  "data"
> & {
  data: SimplifiedPermit[];
};

export function validateUUID(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}
