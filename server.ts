import express from "express";
import bodyParser from "body-parser";
import { CONFIG } from "./config";

const app = express();
app.use(bodyParser.json());

// Basic route
app.get("/", (req, res) => {
  res.send("Hello from Express REST!");
});

app.listen(CONFIG.SERVER_PORT, () => {
  console.log(`Server running on ${CONFIG.SERVER_URL}`);
});
