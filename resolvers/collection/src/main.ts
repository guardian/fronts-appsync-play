import { Handler } from "aws-lambda";
import { AppsyncEventFromResolver } from "./appsync";
import { CollectionArguments } from "./collectionschema";

export const handler:Handler = async (incomingEvent:unknown, context) => {
  console.log("Received event {}", JSON.stringify(incomingEvent, null, 3));
  console.log("Context is {}", JSON.stringify(context, null, 3));

  const event = AppsyncEventFromResolver.parse(incomingEvent);
  const args = event.arguments ? CollectionArguments.parse(event.arguments) : undefined;

  return [{id:args?.id ?? "Hello world"}];
}