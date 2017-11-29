const EGQL_AUTH_TOKEN = require("../configAuth");
const HEADER_REGEX = /bearer token-(.*)$/;

/**
 * This is an overly simplistic token. In real apps make
 * sure to use a better one such as:
 *  - express-jwt
 *  - passport-jwt
 */
module.exports.authenticate = async ({ headers: { authorization } }, Users) => {
  const email = authorization && HEADER_REGEX.exec(authorization)[1];
  // // const email = authorization && HEADER_REGEX.exec(authorization)[1];
  // const email = authorization && "token-eddienaff@gmail.com";
  return email && (await Users.findOne({ email }));
};
