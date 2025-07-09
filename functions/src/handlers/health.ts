import * as functions from "firebase-functions";

export const healthCheck = functions.https.onRequest(async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (request.method === "OPTIONS") {
    response.status(200).send("");
    return;
  }
  
  response.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "Firebase Functions are working!",
    environment: "emulator"
  });
});

export const testConnection = functions.https.onCall(async (data, context) => {
  return {
    status: "success",
    message: "Firebase Functions callable test successful!",
    timestamp: new Date().toISOString(),
    data: data
  };
});
