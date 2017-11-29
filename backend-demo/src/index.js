const express = require("express");

// this package automatically parses JSON requests
const bodyParser = require("body-parser");

// this package will handle GraphQL server requests and responses
// for you, based on your schemna
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");
const cors = require("cors");
const { execute, subscribe } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");

const { authenticate } = require("./authentication");
const { configAuth } = require("../configAuth");

const schema = require("./schema");

const connectMongo = require("./mongo-connector");

const buildDataLoaders = require("./dataloaders");

const start = async () => {
  const mongo = await connectMongo();

  var app = express();

  const { formatError } = require("./formatError");

  const buildOptions = async (req, res) => {
    const user = await authenticate(req, mongo.Users);
    return {
      context: {
        dataloaders: buildDataLoaders(mongo),
        mongo,
        user
      }, // this context object is passed to all resolvers.
      formatError,
      schema
    };
  };

  const PORT = 3000;
  const PORT2 = 3001;

  // Add before the routes for graphql/graphiql
  app.use("*", cors({ origin: `http://localhost:${PORT2}` }));

  app.use("/graphql", bodyParser.json(), graphqlExpress(buildOptions));

  app.use(
    "/graphiql",
    graphiqlExpress({
      endpointURL: "/graphql",
      passHeader: `'Authorization': 'bearer token-eddienaff@gmail.com'`,
      subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`
    })
  );
  //   app.listen(PORT, () => {
  //     console.log(
  //       `Hackernews GraphQL server running on port http://localhost:${PORT}.`
  //     );
  //   });

  const server = createServer(app);

  server.listen(PORT, () => {
    SubscriptionServer.create(
      { execute, subscribe, schema },
      { server, path: "/subscriptions" }
    );
    console.log(
      `\nHackernews GraphQL server running at: http://localhost:${PORT}`,
      `\nHackernews GraphQL subscriptions server running at: http://localhost:${
        PORT
      }/subscriptions`,
      `\nHackernews GraphiQL window running at: http://localhost:${
        PORT
      }/graphiql`
    );
  });
};

start();
