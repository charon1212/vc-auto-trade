import AWS = require("aws-sdk");

export const db = new AWS.DynamoDB.DocumentClient();