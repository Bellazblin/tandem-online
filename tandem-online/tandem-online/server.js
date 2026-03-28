const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// In-memory room store
const rooms = {};

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function parseBrackets(text) {
  const match = text.match(/^(.*?)\[(.+?)\](.*)$/);
  if (!match) return { before: text, answer: "", after: "", hasBracket: false };
  return { before: match[1], answer: match[2], after: match[3], hasBracket: true };
}

function parseRawPairs(rawPairs) {
  return rawPairs.map((p) => ({ a: parseBrackets(p.a), b: parseBrackets(p.b) }));
}

const DEFAULT_PAIRS = [
  { a: "Je [mange] trois repas par jour.", b: "我每天[吃]三顿饭。" },
  { a: "Le [matin], je prends un petit déjeuner avec du pain et du lait.", b: "在[早上]，我吃早餐，有面包和牛奶。" },
  { a: "À midi, je mange des [fruits] et des légumes.", b: "[中午]，我吃水果和蔬菜。" },
  { a: "C'est important pour la [santé].", b: "这对[健康]很重要。" },
  { a: "Le [soir], je mange léger.", b: "晚上，我吃得很[清淡]。" },
  { a: "Par exemple, je prends une [soupe] ou un peu de salade.", b: "比如，我喝[汤]或者吃一点沙拉。" },
  { a: "Je [bois] beaucoup d'eau tous les jours.", b: "我每天喝很多[水]。" },
  { a: "Manger des fruits et des [légumes] est très bon pour le corps.", b: "吃水果和蔬菜对[身体]非常好。" },
  { a: "Une alimentation [équilibrée] est importante pour vivre bien.", b: "[均衡]的饮食对于生活很重要。" },
  { a: "Le [ciel] est bleu aujourd'hui.", b: "今天[天空]是蓝色的。" },
  { a: "Elle [habite] dans une grande maison.", b: "她住在一个大[房子]里。" },
  { a: "Les enfants [jouent] dans le jardin.", b: "孩子们在[花园]里玩。" },
];

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // Create room
  socket.on("create-room", (callback) => {
    let code = generateCode();
    while (rooms[code]) code = generateCode();

    rooms[code] = {
      players: [socket.id],
      sentences: null,
      rawPairs: null,
      activeIdx: 0,
      u1Val: {},
      u2Val: {},
      u1Locked: {},
      u2Locked: {},
      revealed: {},
    };
    socket.join(code);
    socket.roomCode = code;
    socket.playerNum = 1;
    callback({ code, player: 1 });
    console.log(`Room ${code} created by ${socket.id}`);
  });

  // Join room
  socket.on("join-room", (code, callback) => {
    const room = rooms[code];
    if (!room) return callback({ error: "Room not found" });
    if (room.players.length >= 2) return callback({ error: "Room is full" });

    room.players.push(socket.id);
    socket.join(code);
    socket.roomCode = code;
    socket.playerNum = 2;
    callback({ code, player: 2 });

    // Notify player 1 that player 2 joined
    io.to(code).emit("player-joined", { count: 2 });

    // If sentences already loaded, send to player 2
    if (room.sentences) {
      socket.emit("sentences-loaded", {
        sentences: room.sentences,
        activeIdx: room.activeIdx,
        u1Val: room.u1Val,
        u2Val: room.u2Val,
        u1Locked: room.u1Locked,
        u2Locked: room.u2Locked,
        revealed: room.revealed,
      });
    }

    console.log(`Room ${code}: player 2 joined`);
  });

  // Upload / load sentences
  socket.on("load-sentences", (rawPairs) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;

    room.rawPairs = rawPairs;
    room.sentences = parseRawPairs(rawPairs);
    room.activeIdx = 0;
    room.u1Val = {};
    room.u2Val = {};
    room.u1Locked = {};
    room.u2Locked = {};
    room.revealed = {};

    io.to(code).emit("sentences-loaded", {
      sentences: room.sentences,
      activeIdx: 0,
      u1Val: {},
      u2Val: {},
      u1Locked: {},
      u2Locked: {},
      revealed: {},
    });
  });

  // Use default sentences
  socket.on("use-defaults", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;

    room.rawPairs = DEFAULT_PAIRS;
    room.sentences = parseRawPairs(DEFAULT_PAIRS);
    room.activeIdx = 0;
    room.u1Val = {};
    room.u2Val = {};
    room.u1Locked = {};
    room.u2Locked = {};
    room.revealed = {};

    io.to(code).emit("sentences-loaded", {
      sentences: room.sentences,
      activeIdx: 0,
      u1Val: {},
      u2Val: {},
      u1Locked: {},
      u2Locked: {},
      revealed: {},
    });
  });

  // Typing — broadcast to partner in real time (optional, just for locked display)
  socket.on("typing", ({ idx, value }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;
    const p = socket.playerNum;
    if (p === 1) room.u1Val[idx] = value;
    else room.u2Val[idx] = value;
    // Don't broadcast typing to keep it secret until lock
  });

  // Lock answer (Enter pressed)
  socket.on("lock", ({ idx, value }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;
    const p = socket.playerNum;

    if (p === 1) {
      room.u1Val[idx] = value;
      room.u1Locked[idx] = true;
    } else {
      room.u2Val[idx] = value;
      room.u2Locked[idx] = true;
    }

    // Broadcast: tell everyone who locked (and show their answer)
    io.to(code).emit("player-locked", {
      player: p,
      idx,
      value,
      u1Locked: room.u1Locked,
      u2Locked: room.u2Locked,
      u1Val: room.u1Val,
      u2Val: room.u2Val,
    });
  });

  // Reveal
  socket.on("reveal", ({ idx }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room) return;
    room.revealed[idx] = true;
    io.to(code).emit("revealed", { idx, revealed: room.revealed });
  });

  // Next sentence
  socket.on("next", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || !room.sentences) return;
    if (room.activeIdx < room.sentences.length - 1) {
      room.activeIdx++;
      io.to(code).emit("advance", { activeIdx: room.activeIdx });
    }
  });

  // Restart
  socket.on("restart", () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || !room.rawPairs) return;

    room.sentences = parseRawPairs(room.rawPairs);
    room.activeIdx = 0;
    room.u1Val = {};
    room.u2Val = {};
    room.u1Locked = {};
    room.u2Locked = {};
    room.revealed = {};

    io.to(code).emit("sentences-loaded", {
      sentences: room.sentences,
      activeIdx: 0,
      u1Val: {},
      u2Val: {},
      u1Locked: {},
      u2Locked: {},
      revealed: {},
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    const code = socket.roomCode;
    if (code && rooms[code]) {
      rooms[code].players = rooms[code].players.filter((id) => id !== socket.id);
      io.to(code).emit("player-left", { count: rooms[code].players.length });
      if (rooms[code].players.length === 0) {
        delete rooms[code];
        console.log(`Room ${code} deleted (empty)`);
      }
    }
    console.log("Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Tandem server running on port ${PORT}`);
});
