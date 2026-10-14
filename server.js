import "dotenv/config";
import app from "./app.js";
import { checkDatabaseConnection } from "./config/db.js";

const port = Number(process.env.PORT || 5000);

async function start() {
  try {
    await checkDatabaseConnection();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start();

