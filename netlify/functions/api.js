const serverless = require('serverless-http');
const { app, connectDB } = require('../../api/server');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  await connectDB();
  return handler(event, context);
};
