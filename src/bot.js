import { Telegraf, Markup } from "telegraf";

const users = {};
const waitingUsers = {};
const activeChats = {};

// Get or create user data
const getUserData = (id) => {
  if (!users[id]) {
    users[id] = { id, gender: null, preferredGender: null };
  }
  return users[id];
};

const createBot = (token) => {
  const bot = new Telegraf(token);

  const setCommands = async () => {
    await bot.telegram.setMyCommands([
      { command: "start", description: "Start the bot" },
      { command: "find", description: "Find a random user to chat" },
      { command: "end", description: "End the current chat" },
      {
        command: "stopsearching",
        description: "Stop searching for a chat partner",
      },
      { command: "setgender", description: "Set your gender" },
      { command: "setpreference", description: "Set preferred partner gender" },
    ]);
  };

  const showMainMenu = (ctx) => {
    ctx.reply(
      "Menu:",
      Markup.inlineKeyboard([
        [Markup.button.callback("Find a Partner", "find_partner")],
        [
          Markup.button.callback(
            "Set Preferred Gender",
            "set_preferred_gender"
          ),
        ],
        [Markup.button.callback("Stop Searching", "stop_searching")],
        [Markup.button.callback("End Chat", "end_chat")],
      ])
    );
  };

  bot.start((ctx) => {
    const userId = ctx.from.id;
    const user = getUserData(userId);
    if (!user.gender) {
      ctx.reply(
        "Welcome! Please set your gender using the button below.",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Set Gender: Male", "set_gender_male"),
            Markup.button.callback("Set Gender: Female", "set_gender_female"),
          ],
        ])
      );
    } else {
      showMainMenu(ctx);
    }
  });

  bot.action("open_menu", (ctx) => {
    showMainMenu(ctx);
  });

  bot.command("setgender", (ctx) => {
    ctx.reply(
      "Please set your gender using the button below.",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Set Gender: Male", "set_gender_male"),
          Markup.button.callback("Set Gender: Female", "set_gender_female"),
        ],
      ])
    );
  });

  bot.action("set_gender_male", (ctx) => {
    const userId = ctx.from.id;
    const user = getUserData(userId);
    user.gender = "male";
    ctx.answerCbQuery();
    showMainMenu(ctx);
  });

  bot.action("set_gender_female", (ctx) => {
    const userId = ctx.from.id;
    const user = getUserData(userId);
    user.gender = "female";
    ctx.answerCbQuery();
    showMainMenu(ctx);
  });

  bot.command("find", (ctx) => {
    findPartner(ctx);
  });

  const findPartner = (ctx) => {
    const userId = ctx.from.id;
    const user = getUserData(userId);
    if (!user.gender) {
      ctx.reply(
        "Please set your gender first using the button below.",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Set Gender: Male", "set_gender_male"),
            Markup.button.callback("Set Gender: Female", "set_gender_female"),
          ],
        ])
      );
      return;
    }
    if (activeChats[userId]) {
      ctx.reply("You are already in a chat!");
      return;
    }
    if (waitingUsers[userId]) {
      ctx.reply("You are already searching for a partner.");
      return;
    }
    ctx.reply(
      "Searching for a partner...",
      Markup.inlineKeyboard([
        [Markup.button.callback("Stop Searching", "stop_searching")],
      ])
    );
    waitingUsers[userId] = { ...user, ctx };
    matchUsers();
  };

  bot.action("find_partner", (ctx) => {
    findPartner(ctx);
  });

  bot.command("stopsearching", (ctx) => {
    stopSearching(ctx);
  });

  const stopSearching = (ctx) => {
    const userId = ctx.from.id;
    if (activeChats[userId]) {
      ctx.reply("You are already in a chat!");
      return;
    }
    if (!waitingUsers[userId]) {
      ctx.reply("You are not searching for a partner.");
      return;
    }
    delete waitingUsers[userId];
    ctx.reply(
      "Stopped searching for a partner.",
      Markup.inlineKeyboard([
        [Markup.button.callback("Open Menu", "open_menu")],
      ])
    );
  };

  bot.action("stop_searching", (ctx) => {
    stopSearching(ctx);
  });

  bot.command("end", (ctx) => {
    endChat(ctx);
  });

  const endChat = (ctx) => {
    const userId = ctx.from.id;
    const partnerId = activeChats[userId];
    if (!partnerId) {
      ctx.reply("You are not in a chat.");
      return;
    }

    console.log(`User ${userId} is ending the chat with ${partnerId}`);

    ctx.reply("Chat ended.");
    bot.telegram.sendMessage(
      partnerId,
      "The chat has been ended by your partner."
    );

    delete activeChats[userId];
    delete activeChats[partnerId];

    ctx.reply(
      "Use the buttons below to interact with the bot.",
      Markup.inlineKeyboard([
        [Markup.button.callback("Open Menu", "open_menu")],
      ])
    );
  };

  bot.action("end_chat", (ctx) => {
    endChat(ctx);
  });

  bot.command("setpreference", (ctx) => {
    setPreferredGender(ctx);
  });

  const setPreferredGender = (ctx) => {
    ctx.reply(
      "Please select your preferred partner gender using the buttons below.",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Preferred: Male", "preferred_gender_male"),
          Markup.button.callback(
            "Preferred: Female",
            "preferred_gender_female"
          ),
          Markup.button.callback("Preferred: Any", "preferred_gender_any"),
        ],
      ])
    );
  };

  bot.action("set_preferred_gender", (ctx) => {
    setPreferredGender(ctx);
  });

  bot.action("preferred_gender_male", (ctx) => {
    const userId = ctx.from.id;
    const user = getUserData(userId);
    user.preferredGender = "male";
    ctx.answerCbQuery();
    ctx.reply("Your preferred partner gender is set to male.");
  });

  bot.action("preferred_gender_female", (ctx) => {
    const userId = ctx.from.id;
    const user = getUserData(userId);
    user.preferredGender = "female";
    ctx.answerCbQuery();
    ctx.reply("Your preferred partner gender is set to female.");
  });

  bot.action("preferred_gender_any", (ctx) => {
    const userId = ctx.from.id;
    const user = getUserData(userId);
    user.preferredGender = "any";
    ctx.answerCbQuery();
    ctx.reply("Your preferred partner gender is set to any.");
  });

  const matchUsers = () => {
    const userIds = Object.keys(waitingUsers);
    if (userIds.length < 2) return;

    for (let i = 0; i < userIds.length - 1; i++) {
      const user1 = waitingUsers[userIds[i]];
      for (let j = i + 1; j < userIds.length; j++) {
        const user2 = waitingUsers[userIds[j]];

        if (
          user1.preferredGender &&
          user1.preferredGender !== "any" &&
          user1.preferredGender !== user2.gender
        ) {
          continue;
        }
        if (
          user2.preferredGender &&
          user2.preferredGender !== "any" &&
          user2.preferredGender !== user1.gender
        ) {
          continue;
        }

        activeChats[user1.id] = user2.id;
        activeChats[user2.id] = user1.id;

        user1.ctx.reply(
          "You are now connected to a random user. Say hi!",
          Markup.inlineKeyboard([])
        );
        user2.ctx.reply(
          "You are now connected to a random user. Say hi!",
          Markup.inlineKeyboard([])
        );

        delete waitingUsers[user1.id];
        delete waitingUsers[user2.id];

        return; // Exit the loop once a match is found
      }
    }
  };

  bot.on("text", (ctx) => {
    const userId = ctx.from.id;
    const partnerId = activeChats[userId];
    if (!partnerId) {
      ctx.reply("You are not in a chat. Use /find to start one.");
      return;
    }

    console.log(
      `Received text from ${userId} to ${partnerId}: ${ctx.message.text}`
    );
    bot.telegram.sendMessage(partnerId, ctx.message.text);
  });

  bot.on("animation", (ctx) => {
    const userId = ctx.from.id;
    const partnerId = activeChats[userId];
    if (!partnerId) {
      ctx.reply("You are not in a chat. Use /find to start one.");
      return;
    }

    console.log(`Received GIF from ${userId} to ${partnerId}`);
    bot.telegram.sendAnimation(partnerId, ctx.message.animation.file_id);
  });

  bot.on("photo", (ctx) => {
    const userId = ctx.from.id;
    const partnerId = activeChats[userId];
    if (!partnerId) {
      ctx.reply("You are not in a chat. Use /find to start one.");
      return;
    }

    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1]; // Get the highest resolution photo

    console.log(`Received photo from ${userId} to ${partnerId}`);
    bot.telegram.sendPhoto(partnerId, photo.file_id);
  });

  // Set the commands for the bot
  setCommands();

  return bot;
};

export default createBot;
