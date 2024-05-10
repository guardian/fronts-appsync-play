import {z} from "zod";

export const CollectionArguments = z.object({
  id: z.string().optional(),
  limit: z.number().optional(),
})

export type CollectionArguments = z.infer<typeof CollectionArguments>;

export const CollectionData = z.object({
  HRef: z.string().optional(),
  id: z.string(),
  Type: z.string(),
  Backfill: z.string().optional(),
  LastUpdated: z.string().optional(), //expect an ISO datetime
  Metadata: z.unknown().optional(),
  Uneditable: z.boolean().optional(),
  UpdatedBy: z.string().optional(),
  UpdatedEmail: z.string().optional()
})

export type CollectionData = z.infer<typeof CollectionData>;