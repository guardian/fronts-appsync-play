import {z} from "zod";

export const AppsyncEventFromResolver = z.object({
  identity: z.unknown(),
  arguments: z.unknown(),
  fieldName: z.string().nonempty(),
  parentTypeName: z.string().nonempty(),
  variables: z.unknown(),
  selectionSetList: z.array(z.string()),
  selectionSetGraphQL: z.string()
});

export type AppsyncEventFromResolver = z.infer<typeof AppsyncEventFromResolver>;
