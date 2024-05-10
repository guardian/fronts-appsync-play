import { Handler } from "aws-lambda";
import { AppsyncEventFromResolver } from "./appsync";
import { CollectionArguments, CollectionData } from "./collectionschema";
import { NeptuneGremlinUrl } from "./config";
import {FrontArguments, Front} from "./frontschema";

import * as gremlin from "gremlin";

const traversal = gremlin.process.AnonymousTraversalSource.traversal;
const T = gremlin.process.t;

function parseGremlinResponse<T>(response:gremlin.process.Traverser[], parser:(source:unknown)=>T):T[] {
  return response.map(v=>{
    try {
      return parser(Object.fromEntries((v as Map<string, unknown>).entries()));
    } catch(err) {
      console.log(`Invalid data at ${JSON.stringify(v)}`)
      console.warn(err);
      return undefined;
    }
  }).filter(value=>!!value);
}

async function resolveCollections(g:gremlin.process.GraphTraversalSource, event:AppsyncEventFromResolver, args:CollectionArguments):Promise<CollectionData[]> {
  let query = g.V().hasLabel("Collection");

  if(args.id) query = query.hasId(args.id);
  if(args.HRef) query = query.has('HRef', args.HRef);
  if(args.type) query = query.has('Type', args.type);
  //if(args.updatedSince) query = query.where('')

  const nodes = await query.limit(args.limit ?? 10).elementMap().toList();

  return parseGremlinResponse(nodes, CollectionData.parse);
}

async function resolveFronts(g:gremlin.process.GraphTraversalSource, event:AppsyncEventFromResolver, args:FrontArguments):Promise<Front[]> {
  let query = g.V().hasLabel("Front");

  if(args.id) query = query.hasId(args.id);
  if(args.canonical) query = query.has('Canonical', args.canonical);
  if(args.showHidden) query = query.has('ShowHidden', args.showHidden);
  const nodes = await query.limit(args.limit ?? 10).elementMap().toList();
  return parseGremlinResponse(nodes, Front.parse);
}

export const handler:Handler = async (incomingEvent:unknown, context) => {
  console.log("Received event {}", JSON.stringify(incomingEvent, null, 3));
  console.log("Context is {}", JSON.stringify(context, null, 3));

  console.log(`Neptune URL is ${NeptuneGremlinUrl}`);

  const g = traversal().withRemote(new gremlin.driver.DriverRemoteConnection(NeptuneGremlinUrl));

  const event = AppsyncEventFromResolver.parse(incomingEvent);
  let args;
  switch(event.fieldName) {
    case "collections": // user is querying collections
      args = event.arguments ? CollectionArguments.parse(event.arguments) : undefined;
      return resolveCollections(g, event, args);
    case "fronts":
      args = event.arguments ? FrontArguments.parse(event.arguments) : undefined;
      return resolveFronts(g, event, args);
    default:
      throw new Error(`Unrecognised query type ${event.fieldName}`);
  }
}