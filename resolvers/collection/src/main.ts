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

export const handler:Handler = async (incomingEvent:unknown, context):Promise<CollectionData[]> => {
  console.log("Received event {}", JSON.stringify(incomingEvent, null, 3));
  console.log("Context is {}", JSON.stringify(context, null, 3));

  const event = AppsyncEventFromResolver.parse(incomingEvent);
  const args = event.arguments ? CollectionArguments.parse(event.arguments) : undefined;

  console.log(`Neptune URL is ${NeptuneGremlinUrl}`);

  const g = traversal().withRemote(new gremlin.driver.DriverRemoteConnection(NeptuneGremlinUrl));

  const nodes = await g.V().has(T.label, "Collection").limit(args?.limit ?? 10).elementMap().toList();

  return parseGremlinResponse(nodes);
}