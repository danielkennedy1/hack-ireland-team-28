import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

// Basic route
app.get("/", (req, res) => {
  res.send("Hello from Express REST!");
});

// Start server on port 4000
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
