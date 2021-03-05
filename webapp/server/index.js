const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const router = require("./router");
const uri =
  "mongodb+srv://sai:kathika@cluster0.gknvq.mongodb.net/test?retryWrites=true&w=majority";
const client = new MongoClient(uri);
async function main() {
  /**
   * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
   * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
   */

  try {
    // Connect to the MongoDB cluster
    await client.connect();
    // Make the appropriate DB calls
    await listDatabases(client);

    // await createListing(client, {
    //   name: "Lovely Loft",
    //   summary: "A charming loft in Paris",
    //   bedrooms: 1,
    //   bathrooms: 1
    // });
  } finally {
    await client.close();
  }
}
main().catch(console.error);

async function listDatabases(client) {
  databasesList = await client
    .db()
    .admin()
    .listDatabases();
  console.log("Databases:");
  databasesList.databases.forEach(db => console.log(` - ${db.name}`));
}

async function createListing(client, newListing) {
  const result = await client
    .db("chatLogs")
    .collection("test")
    .insertOne(newListing);
  console.log(
    `New listing created with the following id: ${result.insertedId}`
  );
}
async function sendMessages(name, message) {
  try {
    // Connect to the MongoDB cluster
    await client.connect();
    // Make the appropriate DB calls

    await createListing(client, {
      name: name,
      message: message
    });
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

let messagesDB = new Map();
var messageHistory = [];
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*"
  }
});
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(router);

io.on("connect", socket => {
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);

    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}.`
    });
    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined!` });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit("message", { user: user.name, text: message });
    sendMessages(user.name, message);
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} has left.`
      });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });
});

// server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));
server.listen(process.env.PORT || 5000, () =>
  console.log(`Server has started.`)
);
