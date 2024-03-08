const { Server } = require("socket.io");
const { logItOnConsole, logItOnFile } = require("./logging/utilityFunction");
const { getGameState, validateRoomID, validateTeamCapacity, updateScoreCard,
  tossDecision, tossResult, coinTossAttempted, joinGame, setSignFreshA, setSignFreshB,
  createGame,uniqueUser,createGamePool, removeUser, changeActivePlayer} = require("./utility/gameManager")
const { assignData, createUser} = require("./utility/user.js")
 
const io = new Server({ cors: {
  origin: "*",
  methods: ["GET", "POST"]
}});


const GAME_POOL_COUNT = 50;
const COIN_TOSSED_MESSAGE = "Coin tossed .. Waiting for captain's call";
const USERNAME_DUPLICATE = "Username taken by your friend :(. Try a new one!";
const GAME_JOIN_FAILED = "Game join failed - No capapcity or wrong room id";
const COIN_TOSS_FAILED = "Toss failed please try again!";
const INACTIVE_USER_ATTEMPT = "Ask your captain for a chance !";

io.on("connection", (socket) => {
  logItOnFile("[INFO] A new connection [SKID] " + socket.id);
  try {
  user = createUser();
  socket.myCustomUserHandle = user;
  }
  catch {
    socket.emit("[EROR] custom-info", {infoMessage:"Please reload"});
  }
   //create game
  socket.on("create-game", ({username, noOfPlayersInEachSide}) => {
    try {
    roomID = createGame(noOfPlayersInEachSide, username);
    logItOnFile("[INFO] a new game has been created [GAME] " + roomID + "[USER] " + username);
    assignData(user, username, "A", roomID);
    socket.join(roomID);
    joinGame(user,roomID,"A");

    //client emits will go here
    gameState = getGameState(roomID);
    socket.emit("game-created", {gameState, user});
    }
    catch(error) {
      socket.emit("custom-info" ,{infoMessage:"Please try again!"});
      logItOnFile("[EROR] Error in game creation " + error);
    }
  });
  
  //join game
  socket.on("join-game", ({username, roomID, team }) => {
    try {
    // check room id valid
    if(validateRoomID(roomID) && validateTeamCapacity(roomID, team) === true) {
      if(uniqueUser(username, roomID, team)){
      logItOnFile("[INFO] A new player has joined the room-- [GAME] " + roomID + "[USER] " + username);
      //emit to room

      //emit it to the user
      assignData(user, username, team, roomID);
      joinGame(user,roomID, team);
      gameState = getGameState(roomID);
      socket.emit("existing-game-state", {gameState, user});
      io.to(roomID).emit("player-joined", {user});
      socket.join(roomID);
      }
      else {
        logItOnFile("[UXER] user JOINING failed duplicate username [GAME] " + roomID);
        socket.emit("custom-info", {infoMessage:USERNAME_DUPLICATE})
      }
    }
    else {
      logItOnFile("[UXER] user JOINING failed [GAME] " + roomID);
      socket.emit("custom-error", {errorMessage:GAME_JOIN_FAILED});
    }
    }
    catch(error) {
      socket.emit("custom-info" ,{infoMessage:"Join failed!"});
      logItOnFile("[EROR] Error in join attempt " + error);
    }
    
  });

  /* whenever we are passing the user info,
  there is some duplication , as we already have access
  to that user in our code's scope. But lets us just 
  go on with it and do cleaning later, much of it is cleaned, lets see */

  //toss attempt = spin the coin
  socket.on("toss-attempt",({roomID, user})=> {
    const result = coinTossAttempted(roomID, user);
    try {
    if (result === 200) {
      message = COIN_TOSSED_MESSAGE;
      logItOnFile("[INFO] toss attempt success [RVAL] " + result + " [GAME] :" +  roomID + "[USER] " + user.username);
      io.to(roomID).emit("toss-attempted",({result,message}));
    }
    else {
      logItOnFile("[ER0R] toss attempt failed [RVAL] " + result  + " [GAME] :" +  roomID + "[USER] " + user.username);
      socket.emit("custom-error",{errorMessage:COIN_TOSS_FAILED});
    }
    }
    catch(error) {
      socket.emit("custom-info" ,{infoMessage:"Please try again!"});
      logItOnFile("[EROR] Error in toss attempt " + error);
    }

  });

   // tosscall = HEAD || TAIL
  socket.on("toss-call",({roomID, tossCall, user})=> {
    try {
     const result = tossResult(roomID,tossCall, user);
     logItOnFile("[INFO] toss result [RVAL] " + JSON.stringify(result)  + " [GAME] :" +  roomID + "[USER] " + user.username);
     io.to(roomID).emit("toss-result", {result});
    }
    catch(error) {
      socket.emit("custom-info" ,{infoMessage:"Please try again!"});
      logItOnFile("[EROR] Error in toss call " + error);
    }
  });

  socket.on("toss-winner-choice", ({data, roomID}) => {
    try {
    const decision = tossDecision(data, roomID);
    logItOnFile("[INFO] toss decision [RVAL] " + JSON.stringify(decision)  + " [GAME] :" +  roomID +
    "[USER] " + socket.myCustomUserHandle.username);
    io.to(roomID).emit("toss-decision", (decision));
    }
    catch(error) {
      logItOnFile("[EROR] Error in toss decision " + error);
      socket.emit("custom-info" ,{infoMessage:"Please choose again"});
    }
  });

  //game play events
  //sign is the number
  socket.on("game-play", ({user, roomID, sign}) => {
    try {
    if(user.active && user.team === 'A') {
      logItOnFile("[INFO] sign from A-- [SIGN] " + sign + " [GAME] " + roomID + "[USER] " + user.username);
      setSignFreshA(roomID,sign);
    }
    if(user.active && user.team === 'B') {
      logItOnFile("[INFO] sign from B-- [SIGN] " + sign + " [GAME] " + roomID + "[USER] " + user.username);
      setSignFreshB(roomID,sign);
    }

    // result { scoreCard:
    //        inningsIndex:
    //        displayCardScore:
    //        displayCardWickets:
    //        updated: }
    result = updateScoreCard(roomID);
    logItOnFile("[INFO] game result [RSLT] " + JSON.stringify(result) + " [GAME] " + roomID);
    io.to(roomID).emit("game-result", result);
    if(!user.active) {
      logItOnFile("[UXER] inactive player interacting [GAME] " + roomID + "[USER] " + user.username);
      socket.emit("custom-info", {infoMessage:INACTIVE_USER_ATTEMPT})
    }
  }
  catch(error) {
    logItOnFile("[EROR] Error in game play " + error);
    io.to(roomID).emit("custom-info", {infoMessage:"Timed out! Play Again.."});
  }
  });
// player category interaction

//userListTeam
//{ userList, team, message }
 socket.on("change-active-player", ({user}) => {
  try {
  if (socket.myCustomUserHandle.captain) {
   const usersListTeam = changeActivePlayer(user);
   logItOnFile("[INFO] active player change request [GAME] " + roomID + "[USER] " + socket.myCustomUserHandle.username);
   logItOnFile("[INFO] active player changed [RSLT] " + JSON.stringify(usersListTeam) + " [GAME] " + roomID + "[USER] " + user.username);
   io.to(user.room).emit("active-player-changed", usersListTeam);
    if (usersListTeam.team === 'E') {
      logItOnFile("[EROR] error changing ACTIVE PLAYER [USER] " + JSON.stringify(user));
    }
  }
  }
  catch (error) {
    logItOnFile("[EROR] Error changing player  " + error);
    socket.emit("custom-info", {infoMessage:"Could not change active player"});
  }
 });

 socket.on("disconnect", (reason) => {
    let userHandle = socket.myCustomUserHandle;
    try {
    if(userHandle.id.length > 0) {
    let team = userHandle.team;
    userRemoved = removeUser(userHandle, team);
    //removedUser: User, team: A | B, usersList:User[], newCaptain:User, captainChanged:boolean
    io.to(userHandle.room).emit("user-disconnected", userRemoved);
    message = userHandle.username + "left the game";
    io.to(userHandle.room).emit("custom-info", {infoMessage:message});
    logItOnFile("[INFO] Disocnnected [SKID] " + socket.id + " [RVAL] " + userRemoved.username);
    }
    logItOnFile("[INFO] Disocnnected [SKID] " + socket.id);
    delete user;
  }
  catch (error) {
    logItOnFile("[EROR] Failed on disconnection" + error)
  }
  });
});

try {
  logItOnConsole("[INFO] Creating Game pool of [RVAL] : " + GAME_POOL_COUNT);
  createGamePool(GAME_POOL_COUNT);

  logItOnConsole("[INFO] Starting game server .....");
  io.listen(3000);
}

catch(e) {
  logItOnFile("[EROR] Failed to start server...Exiting.. " + e)
}