import { Handler } from "aws-lambda";
import { AppsyncEventFromResolver } from "./appsync";
import { CollectionArguments, CollectionData } from "./collectionschema";
import { NeptuneGremlinUrl } from "./config";
import {FrontArguments, Front} from "./frontschema";

import * as gremlin from "gremlin";

const traversal = gremlin.process.AnonymousTraversalSource.traversal;
const T = gremlin.process.t;
const __ = gremlin.process.statics;
const keys = gremlin.process.column.keys

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

async function resolveCollections(g:gremlin.process.GraphTraversalSource, event:AppsyncEventFromResolver):Promise<CollectionData[]> {
  let query:gremlin.process.GraphTraversal;
  switch(event.parentTypeName) {
    case "Query":   //lookup from root of query
      query = g.V().hasLabel("Collection");
      break;
    case "Front":   //lookup of a collections from a front, so limit to collections connected to that front.
      const frontSource = Front.parse(event.source);
      const frontId = frontSource.id;
      console.log(`Querying collections for front ID ${frontId}`);
      query = g.V().hasLabel("Front").hasId(frontId).outE("collection").inV();
  }
  const args = event.arguments ? CollectionArguments.parse(event.arguments) : undefined;

  if(args?.id) query = query.hasId(args.id);
  if(args?.HRef) query = query.has('HRef', args.HRef);
  if(args?.type) query = query.has('Type', args.type);
  //if(args.updatedSince) query = query.where('')

  const nodes = await query.limit(args?.limit ?? 10).elementMap().toList();

  return parseGremlinResponse(nodes, CollectionData.parse);
}

async function resolveFronts(g:gremlin.process.GraphTraversalSource, event:AppsyncEventFromResolver):Promise<Front[]> {
  let query = g.V().hasLabel("Front");
  const args = event.arguments ? FrontArguments.parse(event.arguments) : undefined;


  if(args.id) query = query.hasId(args.id);
  if(args.canonical) query = query.has('Canonical', args.canonical);
  if(args.showHidden) query = query.has('ShowHidden', args.showHidden);
  if(args.priority) query = query.has('Priority', args.priority);

  const nodes = await query.limit(args.limit ?? 10).elementMap().toList();
  return parseGremlinResponse(nodes, Front.parse);
}

async function resolveCollectionTypes(g:gremlin.process.GraphTraversalSource, event:AppsyncEventFromResolver):Promise<string[]> {
  const query = g.V().hasLabel("Collection").group().by('Type').unfold().select(keys).order();
  const nodes = await query.toList();
  return nodes as string[];
}

export const handler:Handler = async (incomingEvent:unknown, context) => {
  console.log("Received event {}", JSON.stringify(incomingEvent, null, 3));
  console.log("Context is {}", JSON.stringify(context, null, 3));

  console.log(`Neptune URL is ${NeptuneGremlinUrl}`);

  const g = traversal().withRemote(new gremlin.driver.DriverRemoteConnection(NeptuneGremlinUrl));

  const event = AppsyncEventFromResolver.parse(incomingEvent);

  switch(event.fieldName) {
    case "collections": // user is querying collections
      return resolveCollections(g, event);
    case "fronts":
      return resolveFronts(g, event);
    case "collectionTypes":
      return resolveCollectionTypes(g, event);
    default:
      throw new Error(`Unrecognised query type ${event.fieldName}`);
  }
}