import express from "express";
import createBot from "./bot.js";

const app = express();
const PORT = process.env.PORT || 3000;
const botToken = "6452445654:AAGbw-uPQQ2hUzChoIoa3amP9mx7OsPImAY";

// Create and start the bot
const bot = createBot(botToken);
bot.launch();

// Endpoint to verify the server is running
app.get("/", (req, res) => {
  res.send("Anonymous Chat Bot is running");
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on("close", () => {
  console.log("Server closed");
});

server.on("error", (err) => {
  console.error("Server error", err);
});

bot.telegram
  .getMe()
  .then((botInfo) => {
    bot.options.username = botInfo.username;
    console.log(`Bot is running with username: ${bot.options.username}`);
  })
  .catch((err) => {
    console.error("Error fetching bot info", err);
  });

const cleanup = () => {
  bot.stop();
  process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
