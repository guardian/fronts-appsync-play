import {z} from "zod";

export const FrontArguments = z.object({
  id: z.string().optional(),
  canonical: z.string().optional(),
  showHidden: z.boolean().optional(),
  limit: z.number().optional(),
});

export type FrontArguments = z.infer<typeof FrontArguments>;

export const Front = z.object({
  Canonical: z.string().optional(),
  IsHidden: z.boolean().optional(),
  Priority: z.string(),
  id: z.string(),
});

export type Front = z.infer<typeof Front>;