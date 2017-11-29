const { ObjectID } = require("mongodb");
const { URL } = require("url");

const pubsub = require("../pubsub");

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

function assertValidLink({ url }) {
  try {
    new URL(url);
  } catch (error) {
    throw new ValidationError("Link validation error: invalid url.", "url");
  }
}

function buildFilters({ OR = [], description_contains, url_contains }) {
  const filter = title_contains || voteOptions_contains ? {} : null;
  if (title_contains) {
    filter.title = { $regex: `.*${title_contains}.*` };
  }
  if (voteOptions_contains) {
    filter.voteOptions = { $regex: `.*${voteOptions_contains}.*` };
  }

  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildFilters(OR[i]));
  }
  return filters;
}

module.exports = {
  Query: {
    allLinks: async (
      root,
      { filter, first, skip },
      { mongo: { Links, Users } }
    ) => {
      let query = filter ? { $or: buildFilters(filter) } : {};
      const cursor = Links.find(query);
      if (first) {
        cursor.limit(first);
      }
      if (skip) {
        cursor.skip(skip);
      }
      return cursor.toArray();
    },
    allPolls: async (
      root,
      { filter, first, skip },
      { mongo: { Polls, Users } }
    ) => {
      let query = filter ? { $or: buildFilters(filter) } : {};
      const cursor = Polls.find(query);
      if (first) {
        cursor.limit(first);
      }
      if (skip) {
        cursor.skip(skip);
      }
      return cursor.toArray();
    }
  },
  Mutation: {
    createLink: async (root, data, { mongo: { Links }, user }) => {
      assertValidLink(data);
      const newLink = Object.assign({ postedById: user && user._id }, data);
      const response = await Links.insert(newLink);

      newLink.id = response.insertedIds[0];
      pubsub.publish("Link", { Link: { mutation: "CREATED", node: newLink } });
      return newLink;
    },
    createPoll: async (root, data, { mongo: { Polls }, user }) => {
      const newPoll = Object.assign({ postedById: user && user._id }, data);
      const response = await Polls.insert(newPoll);

      newPoll.id = response.insertedIds[0];
      pubsub.publish("Poll", { Poll: { mutation: "CREATED", node: newPoll } });
      return newPoll;
    },
    createQuestion: async (root, data, { mongo: { Questions }, user }) => {
      const newQuestion = data;
      const response = await Questions.insert(newQuestion);

      newQuestion.id = response.insertedIds[0];
      pubsub.publish("Question", {
        Question: { mutation: "CREATED", node: newQuestion }
      });
      return newQuestion;
    },
    createPollVote: async (root, data, { mongo: { PollVotes }, user }) => {
      const newPollVote = {
        userId: user && user._id,
        questionId: new ObjectID(data.questionId)
      };
      const response = await PollVotes.insert(newPollVote);
      return Object.assign({ id: response.insertedIds[0] }, newPollVote);
    },
    // Add this block right after the `createLink` mutation resolver.
    createUser: async (root, data, { mongo: { Users } }) => {
      // You need to convert the given arguments into the format for the
      // `User` type, grabbing email and password from the "authProvider".
      const saltRounds = 12; // needed for bcrypt salting below
      const newUser = {
        name: data.name,
        email: data.authProvider.email.email,
        roles: ["user"],
        password: await bcrypt.hash(
          data.authProvider.email.password,
          saltRounds
        )
      };
      const response = await Users.insert(newUser);
      return Object.assign({ id: response.insertedIds[0] }, newUser);
    },
    signinUser: async (root, data, { mongo: { Users } }) => {
      console.log("begin checking for user");
      console.log(data);
      const user = await Users.findOne({ email: data.email.email });
      console.log("*** user!!!");
      console.log(user);
      const valid = await bcrypt.compare(data.email.password, user.password);
      console.log(`*** valid? ${valid}`);
      if (valid) {
        console.log(`*** inside if executing?: ${valid}`);
        return { token: `token-${user.email}`, user };
      }
      return "Some kinda problem happened"; // { token: `token-${user.email}`, user };
    },
    createVote: async (root, data, { mongo: { Votes }, user }) => {
      const newVote = {
        userId: user && user._id,
        linkId: new ObjectID(data.linkId)
      };
      const response = await Votes.insert(newVote);
      return Object.assign({ id: response.insertedIds[0] }, newVote);
    }
  },
  Subscription: {
    Link: {
      subscribe: () => pubsub.asyncIterator("Link")
    },
    Poll: {
      subscribe: () => pubsub.asyncIterator("Poll")
    }
  },

  User: {
    // convert the "_id" field from MongoDB to "id" from the schema
    id: root => root._id || root.id,

    votes: async ({ _id }, data, { mongo: { Votes } }) => {
      return await Votes.find({ userId: _id }).toArray();
    }
  },

  Link: {
    id: root => root._id || root.id,
    postedBy: async ({ postedById }, data, { mongo: { Users } }) => {
      return await Users.findOne({ _id: postedById });
    },

    votes: async ({ _id }, data, { mongo: { Votes } }) => {
      return await Votes.find({ linkId: _id }).toArray();
    }
  },

  Vote: {
    id: root => root._id || root.id,
    user: async ({ userId }, data, { mongo: { Users } }) => {
      return await Users.findOne({ _id: userId });
    },

    link: async ({ linkId }, data, { mongo: { Links } }) => {
      return await Links.findOne({ _id: linkId });
    }
  },

  Poll: {
    id: root => root._id || root.id, // 5

    postedBy: async ({ postedById }, data, { dataloaders: { userLoader } }) => {
      return await userLoader.load(postedById).catch(error => {
        console.log(`Resolver 'postedBy' error ${error}`);
      });
    },
    voteOptions: async ({ _id }, data, { mongo: { VoteOptions } }) => {
      return await VoteOptions.find({ pollId: _id }).toArray();
    },
    votes: async ({ _id }, data, { mongo: { Votes } }) => {
      return await Votes.find({ pollId: _id }).toArray();
    }
  },

  Question: {
    id: root => root._id || root.id,
    poll: async ({ pollId }, data, { mongo: { Polls } }) => {
      return await Polls.findOne({ _id: pollId });
    }
  },

  PollVote: {
    id: root => root._id || root.id,
    user: async ({ userId }, data, { mongo: { Users } }) => {
      return await Users.findOne({ _id: userId });
    },

    question: async ({ questionId }, data, { mongo: { Questions } }) => {
      return await Questions.findOne({ _id: questionId });
    }
  }
};
