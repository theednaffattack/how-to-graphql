const { MongoClient } = require("mongodb");

const MONGO_URL = "mongodb://localhost/hackernews";

// export a connection to the db that returns our collections
// we must specify each
// since connecting is an asynchronous operation, the function needs to be annotated with the async keyword
module.exports = async () => {
  const db = await MongoClient.connect(MONGO_URL);
  return { Links: db.collection("links") };
};
