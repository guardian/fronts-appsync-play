import { Handler } from "aws-lambda";
import { AppsyncEventFromResolver } from "./appsync";
import { CollectionArguments, CollectionData } from "./collectionschema";
import { NeptuneGremlinUrl } from "./config";
import * as gremlin from "gremlin";

const traversal = gremlin.process.AnonymousTraversalSource.traversal;
const T = gremlin.process.t;

function parseGremlinResponse(response:gremlin.process.Traverser[]):CollectionData[] {
  return response.map(v=>{
    try {
      return CollectionData.parse(Object.fromEntries((v as Map<string, unknown>).entries()));
    } catch(err) {
      console.log(`Invalid data at ${JSON.stringify(v)}`)
      console.warn(err);
      return undefined;
    }
  }).filter(value=>!!value);
}

function buildQuery(g:gremlin.process.GraphTraversalSource, args:CollectionArguments):gremlin.process.GraphTraversal {
  let query = g.V().hasLabel("Collection");

  if(args.id) query = query.has('id', args.id);
  return query.limit(args.limit ?? 10);
}

export const handler:Handler = async (incomingEvent:unknown, context):Promise<CollectionData[]> => {
  console.log("Received event {}", JSON.stringify(incomingEvent, null, 3));
  console.log("Context is {}", JSON.stringify(context, null, 3));

  const event = AppsyncEventFromResolver.parse(incomingEvent);
  const args = event.arguments ? CollectionArguments.parse(event.arguments) : undefined;

  console.log(`Neptune URL is ${NeptuneGremlinUrl}`);

  const g = traversal().withRemote(new gremlin.driver.DriverRemoteConnection(NeptuneGremlinUrl));

  const nodes = await buildQuery(g, args).elementMap().toList();

  return parseGremlinResponse(nodes);
}