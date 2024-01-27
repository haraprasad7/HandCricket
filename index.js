const { Server } = require("socket.io");

const io = new Server({ /* options */ });

io.use((socket, next)=> {
  next();
})

io.on("connection", (socket) => {
  logItOnFile("A new connection", socket.id);
   user = createUser(socket.id);
   addUser(user);
  socket.on("create-game", ({username, noOfPlayersInEachSide}) => {
    roomID = createGame(noOfPlayersInEachSide, username);
    logItOnFile("a new game has been created with room id/game id-- ", roomID);
    assignData(user, roomID, team, username);
    socket.myCustomUserHandle = user
    socket.join(roomID);
    joinGame(user,roomID,"A");

    //client emits will go here
    message = "game created successfully"
    socket.emit("game-created", {roomID, message});
  });

  socket.on("join-game", ({username, roomID, team }) => {
    // check room id valid
    logItOnFile("user trying to join a room")
    if(validateRoomID(roomID) && validateTeamCapacity(roomID, team) === true) {
      logItOnFile("A new player has joined the room-- ", roomID, "team --", team)
      //emit to room
      io.to.room(roomID).emit("player-joined", {username, team});
      //emit it to the user
      gameState = getGameState(roomID);
      socket.emit("existing-game-state", {gameState});

      assignData(user, roomID, team, username);
      socket.myCustomUserHandle = user
      socket.join(roomID);
      joinGame(user,roomID, team);
    }
    else {
      socket.emit("custom-error", {errorMessgae:"Game join failed -  No capapcity or wrong room"});
    }
    //check room full or not
  });

  /* whenever we are passing the user info,
  there is some duplication , as we already have access
  to that user in our code's scope. But lets us just 
  go on with it and do cleaning later */



  // tosscall = HEAD || TAIL
  socket.on("toss-attempt",({roomID, userClient})=> {
    coinTossAttempted(roomID, userClient);
  });

  socket.on("toss-call",({roomId, tossCall, userClient})=> {
     result = tossResult(roomId,tossCall, userClient);
     io.to.room(roomId).emit("toss-result", {result})

  });

  socket.on("toss-winner-choice", ({data, userClient,roomID}) => {
       tossDecision(data, userClient, roomID);

  })

 socket.on("disconnect", (reason) => {
    console.log(reason);
    console.log("disoconnected");
  });
});

logItOnConsole("Creating Game pool");
createGamePool();


logItOnConsole("Starting game server .....");
io.listen(3000);