const { makeExecutableSchema } = require("graphql-tools");
const resolvers = require("./resolvers");

// define our types here
const typeDefs = `
    type Link {
        id: ID!
        url: String!
        description: String!
    }

    type Query {
        allLinks: [Link!]!
    }

    type Mutation {
        createLink(url: String!, description: String!): Link
    }
`;

// generate the schema object from the types definition
module.exports = makeExecutableSchema({ typeDefs, resolvers });
