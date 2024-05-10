import {z} from "zod";

export const CollectionArguments = z.object({
  id: z.string().optional(),

})

export type CollectionArguments = z.infer<typeof CollectionArguments>;