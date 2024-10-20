const { Server } = require("socket.io");
const { logItOnConsole, logItOnFile } = require("./logging/utilityFunction");
const { getGameState, validateRoomID, validateTeamCapacity, updateScoreCard,
  tossDecision, tossResult, coinTossAttempted, joinGame, setSignFreshA, setSignFreshB,
  createGame,uniqueUser,createGamePool, removeUser, changeActivePlayer, cleanGame} = require("./utility/gameManager")
const { assignData, createUser, getUser} = require("./utility/user.js")
const path = require('path');
const fs = require('fs');
const httpServer = require("https").createServer({
  key: fs.readFileSync(path.join(__dirname, 'cert', 'private.key')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'certificate.crt')),
  ca:fs.readFileSync(path.join(__dirname, 'cert', 'ca_bundle.crt'))
});
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const GAME_POOL_COUNT = 2000;
const PORT = 3000;
const COIN_TOSSED_MESSAGE = "Coin tossed .. Waiting for captain's call";
const USERNAME_DUPLICATE = "Username taken by your friend :(. Try a new one!";
const INVALID_ROOM = "Invalid Room number";
const CAPACITY_FULL = "Room capacity full";
const COIN_TOSS_FAILED = "Toss failed please try again!";
const INACTIVE_USER_ATTEMPT = "Ask your captain for a chance !";

io.on("connection", (socket) => {
  logItOnFile("[INFO] A new connection [SKID] " + socket.id);
  let user;

   //create game
  socket.on("create-game", ({username, noOfPlayersInEachSide}) => {
    try {
      user = createUser();
      socket.myCustomUserHandle = user;
      roomID = createGame(noOfPlayersInEachSide);
      logItOnFile("[INFO] a new game has been created [GAME] " + roomID + "[USER] " + username);
      assignData(user, username, "A", roomID);
      socket.join(roomID);
      joinGame(user, roomID, "A");

      //client emits will go here
      let gameState = getGameState(roomID);
      socket.emit("game-created", { gameState, user });
    }
    catch(error) {
      socket.emit("custom-info" ,{infoMessage:"Please try again!"});
      logItOnFile("[EROR] Error in game creation " + error);
    }
  });
  
  //join game
  socket.on("join-game", ({username, roomID, team, cookie }) => {
    try {
    // check room id valid
    let validRoom = validateRoomID(roomID);
    let teamCapacityValid = false;
    if(validRoom) {
      teamCapacityValid = validateTeamCapacity(roomID, team);
    }
    if(cookie) {
      logItOnFile("[INFO] COOKIE JOIN ATTEMPT [GAME] " + roomID + "[USER] " + username);
      if(validRoom) {
      let gameState = getGameState(roomID);
      if(team === 'A') {
        user = gameState.activeUsersTeamA.find(users => users.username === username);
        socket.myCustomUserHandle = user;
        if(gameState.activeUsersTeamA.filter(user => user.online).length === 0 ) {
          user.captain = true;
          gameState.captainTeamA = user;
        }
      }
      if(team === 'B') {
        user = gameState.activeUsersTeamB.find(users => users.username === username);
        socket.myCustomUserHandle = user;
        if(gameState.activeUsersTeamB.filter(user => user.online).length === 0) {
          user.captain = true;
          gameState.captainTeamB = user;
        }
      }
      user.online = true;
      socket.emit("existing-game-state", {gameState, user});
      io.to(roomID).emit("player-joined", {user, cookie});
      socket.join(roomID);
      }
    }
    if(!validRoom) {
      socket.emit("custom-error", {errorMessage:INVALID_ROOM});
    }
    if(!teamCapacityValid && !cookie && validRoom) {
      socket.emit("custom-error", {errorMessage:CAPACITY_FULL});
    }
    if( validRoom && teamCapacityValid && !cookie) {
      if(uniqueUser(username, roomID, team)){
        user = createUser();
        socket.myCustomUserHandle = user;
      logItOnFile("[INFO] A new player has joined the room-- [GAME] " + roomID + "[USER] " + username);
      //emit to room

      //emit it to the user
      assignData(user, username, team, roomID);
      joinGame(user,roomID, team);
      let gameState = getGameState(roomID);
      socket.emit("existing-game-state", {gameState, user});
      io.to(roomID).emit("player-joined", {user});
      socket.join(roomID);
      }
      else {
        logItOnFile("[EROR] user JOINING failed duplicate username [GAME] " + roomID);
        socket.emit("custom-error", {errorMessage:USERNAME_DUPLICATE})
      }
    }
    }
    catch(error) {
      socket.emit("custom-error" ,{errorMessage:"Join failed!"});
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
      setSignFreshA(roomID,sign, user);
    }
    if(user.active && user.team === 'B') {
      logItOnFile("[INFO] sign from B-- [SIGN] " + sign + " [GAME] " + roomID + "[USER] " + user.username);
      setSignFreshB(roomID,sign, user);
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
    if(result.inningsIndex === 4) {
      cleanGame(roomID);
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
  if (socket.myCustomUserHandle.captain && socket.myCustomUserHandle.team === user.team) {
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

 socket.on("message", ({username, team, message, room}) => {
    logItOnFile("[INFO] Message [SKID] " + username + " [ROOM] " + room);
   io.to(room).emit("message", {username, team, message});
 });

 socket.on("leave-game", ({username, team, room}) => {
  try {
   logItOnConsole("[INFO] leave button click [USER] "+ username + " [ROOM] "+ room);
   let userRemoved = removeUser(getUser(username+room+team), team);
   logItOnFile("[INFO] Disocnnected [SKID] " + socket.id + " [RVAL] " + userRemoved.removedUser.username);
   socket.leave(room);
   io.to(room).emit("user-disconnected", userRemoved);
   message = userRemoved.removedUser.username + "left the game";
   io.to(room).emit("custom-info", {infoMessage:message});
   socket.emit("leave-room", {infoMessage:"Left the game !"});
  }
  catch (error) {
    console.log(error);
    logItOnFile("[EROR] Could not leavegame. Try again ");
    socket.emit("custom-info", {infoMessage:"Could not leave room try again !"});
  }
 });

  socket.on("disconnect", (reason) => {
    let userHandle;
    logItOnFile("[INFO] Disocnnected [SKID] " + socket.id);
    try {
      if (socket.myCustomUserHandle) {
        userHandle = socket.myCustomUserHandle;
        username = userHandle.username;
        if (userHandle.username && userHandle.id.length > 0) {
          let team = userHandle.team;
          userLeftData = removeUser(userHandle, team);
          //removedUser: User, team: A | B, usersList:User[], newCaptain:User, captainChanged:boolean
          io.to(userHandle.room).emit("user-disconnected", userLeftData);
          message = userHandle.username + "left the game";
          io.to(userHandle.room).emit("custom-info", { infoMessage: message });
          logItOnFile("[INFO] Disocnnected [SKID] " + socket.id + " [RVAL] " + username);
        }
      }
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
  if(process.env.MODE === 'dev') {
    logItOnConsole("[INFO] Starting [dev] game server .....");
    io.listen(PORT);
  }
  else if(process.env.MODE === 'prod') {
    logItOnConsole("[INFO] Starting [prod] game server .....");
    httpServer.listen(PORT);
  }
  else {
    console.log("failed to start server");
  }
}

catch(e) {
  logItOnFile("[EROR] Failed to start server...Exiting.. " + e)
}