const express = require("express");

// this package automatically parses JSON requests
const bodyParser = require("body-parser");

// this package will handle GraphQL server requests and responses
// for you, based on your schemna
const { graphqlExpress, graphiqlExpress } = require("apollo-server-express");

const schema = require("./schema");

const connectMongo = require("./mongo-connector");

const start = async () => {
  const mongo = await connectMongo();

  var app = express();
  app.use(
    "/graphql",
    bodyParser.json(),
    graphqlExpress({
      context: { mongo },
      schema
    })
  );

  app.use(
    "/graphiql",
    graphiqlExpress({
      endpointURL: "/graphql"
    })
  );

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(
      `Hackernews GraphQL server running on port http://localhost:${PORT}.`
    );
  });
};

start();
