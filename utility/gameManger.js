const gameIdPool = new Set();
const activeGames = new Map();

/*
*************************
on create room => we assign a gameid and room id from the pool
put that user to that room, initilaise the game object
and send back the game id with a sucess message

on join room => we add that user to the specified room/game object

on change active player => we change the active player of the team concerned
                           an active player can only play
*************************
*/

/* the function job is to establish an agreement as to what a game object
might look like. this object is the core of the application.
*/
const createGameObject = (numberOfPlayers, initialUser, roomID) => {
    
    return ({
        public :{
        gameID: roomID,
        numberOfPlayersOnEachSide:0,
        activeUSersTeamA: [],
        activeUSersTeamB: [],
        coinTossActivate:false,
        tossWinner:"",
        activePlayerA:{},
        activePlayerB:{},
        captainTeamA:{},
        captainTeamB:{},
        scoreCard:{
            teamAScore:0,
            teamAWickets:0,
            teamBScore:0,
            teamBWickets:0,
            displayScore:0,
            displayWickets:0
        },
        teamA:{},
        teamB:{}
    },
    private: {
        firstInnings:{},
        secondInnings:{},
        COINFACE:"",

    }
    })
}
/* to be called only once per server initilization 
    its job in life is create a pool of ids from which
    gameid which is value wise same as rood id, are created
    @param numberOfGames recieves an argument for the number of such 
    ids that needs to be created
    */

const createGamePool = (numberOfGames) => {
    gameIdPool = numberOfRandomStringsOfLengthN(numberOfGames, 5);
}


/*
create a game object and initilaise the values
delete the gameiD from the pool.
*/

const createGame = (numberOfPlayers, initialUser) => {
    gameID = gameIdPool.values().next();
    gameIdPool.delete(gameID);
    game = createGameObject(numberOfPlayers, initialUser, roomID);
    activeGames.set(gameID, game);
    joinGame(initialUser, gameID, 1);
    return gameID;
}

/* when a user join a room we assign the user into 
an game and the respective team A for 1, B for 2
the first user in any team becomes the team captain by default
*/

const joinGame = (user, gameID, team) => {
    game = activeGames.get(gameID);
    if (team === 1) {
        if(game.public.activeUSersTeamA.size === 0) {
            user.captain = true;
            game.public.captainTeamA = user;
            game.public.activePlayerA = user;
        }
        game.public.activeUSersTeamA.push(user);
    }
    else if (team === 2) {
        if(game.public.activeUSersTeamB.size === 0) {
            game.public.captainTeamB = user;
            game.public.activePlayerB = user;
            game.public.coinTossActivate = true;
        }
        game.public.activeUSersTeamB.push(user);
    }
}

/* the  fucntion changes  the active player of the game
*/

const changeActivePlayer = (gameID, captainSock, userSock, team) => {
    game = activeGames.get(gameID);
    captain = getUser(captainSock);
    user = getUser(userSock);
    if (captain.captain && !user.active) {  
    if (team === 1) {
        game.public.activePlayerA.active = false;
        game.public.activePlayerA = user;
    }
    else {
        game.public.activePlayerB.active =  false;
        game.public.activePlayerB = user;
    }
    }
    else {
        logItOnFile("error changing ACTIVE PLAYER")
    }
}

const changeCaptain = (oldCaptainSock, newCaptainSock, roomID) =>{
    oldCaptain = getUser(oldCaptainSock);
    newCaptain = getUser(newCaptainSock);
    if(oldCaptainSock.captain) {
        oldCaptain.captain = false;
        newCaptain.captain = true;
    }
    game = activeGames.get(roomID);
    if(newCaptain.team === "A")
    {
        game.public.captainTeamA = newCaptain;
    }
    else {
        game.public.captainTeamB = newCaptain;
    }

}

const coinTossAttempted = (roomID, user) => {
    if( user.captain && user.team === "A") {
        activeGames.get(roomID).private.COINFACE = setCoinFace();
    }
}

const tossResult = (roomID, tossCall, user) => {
    game = activeGames.get(roomID);
    if(user.captain  && user.team === "B") {
        if(tossCall === game.private.COINFACE) {
            game.public.tossWinner = "A";
            return {winner:"A"};
        }
        else {
            game.public.tossWinner ="B";
            return {winner:"B"};
        }
    }
}

function setCoinFace() {
    coinFace = ["HEAD", "TAIL"];
    coin =  myArray[(Math.random() * myArray.length) | 0];
    logItOnFile("room -" , roomID, "coin face", coin);
}

const tossDecision = (data, user, roomID)

const updateScoreCard = (userBatting, UserBowling, gameID) => {
    game = activeGames.get(gameID);
    if( userBatting.sign === UserBowling.sign)
        game.public.scoreCard.displayWickets += 1;
    else {
        game.public.scoreCard.displayScore +=userBatting.sign
    }
}

const validateRoomID = (roomID) =>{
    return activeGames.has(roomID);
}

const validateTeamCapacity = (gameID, team) => {
    game = activeGames.get(gameID);   
    if(team === "A") {
        return game.public.activeUSersTeamA.size < game.public.numberOfPlayersOnEachSide
    }
    if(team === "B") {
        return game.public.activeUSersTeamB.size < game.public.numberOfPlayersOnEachSide
    }
    else return "roomNameError";
}

const getGameState = (gameID) => {
    return activeGames.get(gameID).public;
}

