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
  user = createUser();
  socket.myCustomUserHandle = user;
   //create game
  socket.on("create-game", ({username, noOfPlayersInEachSide}) => {
    roomID = createGame(noOfPlayersInEachSide, username);
    logItOnFile("[INFO] a new game has been created [GAME] " + roomID + "[USER] " + username);
    assignData(user, username, "A", roomID);
    socket.join(roomID);
    joinGame(user,roomID,"A");

    //client emits will go here
    gameState = getGameState(roomID);
    socket.emit("game-created", {gameState, user});
  });
  
  //join game
  socket.on("join-game", ({username, roomID, team }) => {
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
  });

  /* whenever we are passing the user info,
  there is some duplication , as we already have access
  to that user in our code's scope. But lets us just 
  go on with it and do cleaning later, much of it is cleaned, lets see */

  //toss attempt = spin the coin
  socket.on("toss-attempt",({roomID, user})=> {
    const result = coinTossAttempted(roomID, user);
    if (result === 200) {
      message = COIN_TOSSED_MESSAGE;
      logItOnFile("[INFO] toss attempt success [RVAL] " + result + " [GAME] :" +  roomID + "[USER] " + user.username);
      io.to(roomID).emit("toss-attempted",({result,message}));
    }
    else {
      logItOnFile("[ER0R] toss attempt failed [RVAL] " + result  + " [GAME] :" +  roomID + "[USER] " + user.username);
      socket.emit("custom-error",{errorMessage:COIN_TOSS_FAILED});
    }

  });

   // tosscall = HEAD || TAIL
  socket.on("toss-call",({roomID, tossCall, user})=> {
     const result = tossResult(roomID,tossCall, user);
     logItOnFile("[INFO] toss result [RVAL] " + JSON.stringify(result)  + " [GAME] :" +  roomID + "[USER] " + user.username);
     io.to(roomID).emit("toss-result", {result});
  });

  socket.on("toss-winner-choice", ({data, roomID}) => {
    const decision = tossDecision(data, roomID);
    logItOnFile("[INFO] toss decision [RVAL] " + JSON.stringify(decision)  + " [GAME] :" +  roomID +
    "[USER] " + socket.myCustomUserHandle.username);
    io.to(roomID).emit("toss-decision", (decision));
  });

  //game play events
  //sign is the number
  socket.on("game-play", ({user, roomID, sign}) => {
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
  });
// player category interaction

//userListTeam
//{ userList, team, message }
 socket.on("change-active-player", ({user}) => {
  if (socket.myCustomUserHandle.captain) {
   const usersListTeam = changeActivePlayer(user);
   logItOnFile("[INFO] active player change request [GAME] " + roomID + "[USER] " + socket.myCustomUserHandle.username);
   logItOnFile("[INFO] active player changed [RSLT] " + JSON.stringify(usersListTeam) + " [GAME] " + roomID + "[USER] " + user.username);
   io.to(user.room).emit("active-player-changed", usersListTeam);
    if (usersListTeam.team === 'E') {
      logItOnFile("[EROR] error changing ACTIVE PLAYER [USER] " + JSON.stringify(user));
    }
  }
 });

 socket.on("disconnect", (reason) => {
    let userHandle = socket.myCustomUserHandle;
    if(userHandle.id.length > 0) {
    let team = userHandle.team;
    userRemoved = removeUser(userHandle, team);
    //removedUser: User, team: A | B, usersList:User[], newCaptain:User, captainChanged:boolean
    io.to(userHandle.room).emit("user-disconnected", userRemoved);
    logItOnFile("[INFO] Disocnnected [SKID] " + socket.id + " [RVAL] " + userRemoved.username);
    }
    logItOnFile("[INFO] Disocnnected [SKID] " + socket.id);
    delete user;
  });
});


logItOnConsole("[INFO] Creating Game pool of [RVAL] : " + GAME_POOL_COUNT);
createGamePool(GAME_POOL_COUNT);


logItOnConsole("[INFO] Starting game server .....");
io.listen(3000);