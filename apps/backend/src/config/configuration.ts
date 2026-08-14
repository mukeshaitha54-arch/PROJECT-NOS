export default () => ({
  environment: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3001", 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || "15m",
    refreshSecret: process.env.REFRESH_SECRET,
  },
  agent: {
    tokenSecret: process.env.AGENT_TOKEN_SECRET,
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
});
