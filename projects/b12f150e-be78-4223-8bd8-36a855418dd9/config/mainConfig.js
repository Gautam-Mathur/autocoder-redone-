const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

exports.startServer = startServer;

module.exports = {
  serverPort: PORT,
  environment: process.env.NODE_ENV || 'development'
};
