const { Server } = require("socket.io");
const { logItOnConsole, logItOnFile } = require("./logging/utilityFunction");
const { getGameState,
  validateRoomID,
  validateTeamCapacity,
  updateScoreCard,
  tossDecision,
  tossResult,
  coinTossAttempted,
  changeCaptain,
  joinGame,
  setSignFreshA,
  setSignFreshB,
  createGame,createGamePool, changeActivePlayer} = require("./utility/gameManager")
  const {   addUser, assignData, getUser, createUser} = require("./utility/user.js")
 
const io = new Server({ cors: {
  origin: "http://localhost:4200",
  methods: ["GET", "POST"]
}});

io.use((socket, next)=> {
  next();
})

io.on("connection", (socket) => {
  logItOnFile("A new connection", socket.id);
   user = createUser(socket.id);
   addUser(user);

   //create game
  socket.on("create-game", ({username, noOfPlayersInEachSide}) => {
    logItOnConsole("username" + username);
    roomID = createGame(noOfPlayersInEachSide, username);
    logItOnFile("a new game has been created with room id/game id-- " + roomID);
    assignData(user, username, "A", roomID);
    socket.myCustomUserHandle = user
    socket.join(roomID);
    joinGame(user,roomID,"A");

    //client emits will go here
    message = "game created successfully";
    gameState = getGameState(roomID);
    console.log("game state");
    console.log(roomID, gameState)
    socket.emit("game-created", {gameState, user});
  });
  
  //join game
  socket.on("join-game", ({username, roomID, team }) => {
    // check room id valid
    logItOnFile("user trying to join a room")
    if(validateRoomID(roomID) && validateTeamCapacity(roomID, team) === true) {
      logItOnFile("A new player has joined the room-- " + roomID + "team --" + team);
      //emit to room
      
      //emit it to the user
      assignData(user, username, team, roomID);
      socket.myCustomUserHandle = user;
      joinGame(user,roomID, team);
      gameState = getGameState(roomID);
      socket.emit("existing-game-state", {gameState, user});
      io.to(roomID).emit("player-joined", {user});
      socket.join(roomID);
    }
    else {
      socket.emit("custom-error", {errorMessgae:"Game join failed -  No capapcity or wrong room"});
    }
  });

  /* whenever we are passing the user info,
  there is some duplication , as we already have access
  to that user in our code's scope. But lets us just 
  go on with it and do cleaning later, much of it is cleaned, lets see */



  
  //toss attempt = spin the coin
  socket.on("toss-attempt",({roomID, user})=> {
    logItOnConsole(roomID,user);
    const result = coinTossAttempted(roomID, user);
   
    if (result === 200) {
      message ="Coin tossed .. Waiting for captain's call"
      io.to(roomID).emit("toss-attempted",({result,message}));
    }
    else {
      socket.emit("custom-error","error");
    }

  });

   // tosscall = HEAD || TAIL
  socket.on("toss-call",({roomID, tossCall, user})=> {
     result = tossResult(roomID,tossCall, user);
     io.to(roomID).emit("toss-result", {result});
  });

  socket.on("toss-winner-choice", ({data, roomID}) => {
       const decision = tossDecision(data, roomID);
       // broad cast to room about the decision
       io.to(roomID).emit("toss-decision",({decision}));
  });

  //game play events
  //sign is the number
  socket.on("game-play", ({user, roomID, sign}) => {
    if(user.active && user.team === 'A') {
      logItOnConsole("message from A is  --  " + sign);
      setSignFreshA(roomID,sign);
    }
    if(user.active && user.team === 'B') {
      logItOnConsole("message from B is  --  " + sign);
      setSignFreshB(roomID,sign);
    }

    // result { scoreCard:
    //        inningsIndex:
    //        displayCardScore:
    //        displayCardWickets:
    //        updated: }
    result = updateScoreCard(roomID);
    //logItOnConsole("the game result is as follows: ");
    //logItOnConsole(result);
    io.to(roomID).emit("game-result", result);
  })
// player category interaction

//userList data userList, team, message
 socket.on("change-active-player", ({user}) => {
   const usersListTeam = changeActivePlayer(user);
   io.to(user.room).emit("active-player-changed", usersListTeam);
 })
 socket.on("disconnect", (reason) => {
    console.log(reason);
    console.log("disoconnected");
  });
});

logItOnConsole("Creating Game pool");
createGamePool(50);


logItOnConsole("Starting game server .....");
io.listen(3000);