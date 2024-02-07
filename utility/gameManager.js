const { logItOnConsole, logItOnFile } = require("../logging/utilityFunction");
const { numberOfRandomStringsOfLengthN} = require("./randomStringGenerator");
const {   addUser, assignData, getUser, createUser} = require("./user.js")
const gameIdPool = new Array();
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
        numberOfPlayersOnEachSide:numberOfPlayers,
        activeUsersTeamA: [],
        activeUsersTeamB: [],
        coinTossActivate:false,
        tossWinner:"",
        bat:"",
        activePlayerA:{},
        activePlayerB:{},
        captainTeamA:{},
        captainTeamB:{},
        scoreCard:{
            teamAScore:{
                score:0,
                wickets:0
            },
            teamBScore:{
                score:0,
                wickets:0
            },
        },
        displayCardScore:0,
        displayCardWickets:0,
        teamA:{},
        teamB:{}
    },
    private: {
        firstInnings:{},
        secondInnings:{},
        COINFACE:"",
        inningsIndex:0,
        battingActiveSign:0,
        bowlingActiveSign:0,
        signFreshA: false,
        signFreshB: false
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
    gameIdPool.push(...numberOfRandomStringsOfLengthN(numberOfGames, 5));
    logItOnFile(gameIdPool);
}


/*
create a game object and initilaise the values
delete the gameiD from the pool.
*/

const createGame = (numberOfPlayers, initialUser) => {
    gameID = gameIdPool[0];
    gameIdPool.splice(0,1);
    game = createGameObject(numberOfPlayers, initialUser, gameID);
    activeGames.set(gameID, game);
    logItOnConsole("game id being returned = " + gameID)
    return gameID;
}

/* when a user join a room we assign the user into 
an game and the respective team A ,B
the first user in any team becomes the team captain by default
*/

const joinGame = (user, gameID, team) => {
    game = activeGames.get(gameID);
    if (team === "A") {
        if(game.public.activeUsersTeamA.length === 0) {
            user.captain = true;
            user.active = true;
            game.public.captainTeamA = user;
            game.public.activePlayerA = user;
        }
        game.public.activeUsersTeamA.push(user);
    }
    else if (team === "B") {
        if(game.public.activeUsersTeamB.length === 0) {
            user.captain = true;
            user.active = true;
            game.public.captainTeamB = user;
            game.public.activePlayerB = user;
            game.public.coinTossActivate = true;
        }
        game.public.activeUsersTeamB.push(user);
    }
}

/* the  fucntion changes  the active player of the game
*/

const changeActivePlayer = (user) => {
    game = activeGames.get(user.room);
    user = getUser(user.socketId);
    if (!user.active) {  
    if (user.team === 'A') {
        game.public.activePlayerA.active = false;
        user.active = true;
        game.public.activePlayerA = user;
        return ({
            userList:game.public.activeUsersTeamA,
            message: "active player of team A changed",
            team:'A'
        });
    }
    else {
        game.public.activePlayerB.active =  false;
        user.active = true;
        game.public.activePlayerB = user;
        return ({
            userList:game.public.activeUsersTeamB,
            message: "active player of team B changed",
            team:'B'
        });
    }
    }
    else {
        logItOnFile("error changing ACTIVE PLAYER");
        return ({
            userList:game.public.activeUsersTeamA,
            message: "active player of team B changed",
            team:'E'
        });
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
        return 200;
    }
    else return 404;
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
    coin =  coinFace[(Math.random() * coinFace.length) | 0];
    logItOnFile("room -" , roomID, "coin face", coin);
}

const tossDecision = (data, roomID) => {
    game = activeGames.get(roomID);
    game.private.inningsIndex = 1;
    let message = ''; 
    if(data === "BAT") {
        message =" bat first";
        if(game.public.tossWinner ==="A") {
            game.private.firstInnings.teamBatting = game.public.scoreCard.teamAScore;
            game.private.secondInnings.teamBatting = game.public.scoreCard.teamBScore;
            game.public.bat ="A";
        }
        else {
            game.public.bat ="B";
            game.private.firstInnings.teamBatting = game.public.scoreCard.teamBScore;
            game.private.secondInnings.teamBatting = game.public.scoreCard.teamAScore;
            
        }
    }
    else {
        message = ' bowl first';
        if(game.public.tossWinner === "B") {
            game.public.bat ="A";
            game.private.firstInnings.teamBatting = game.public.scoreCard.teamAScore;
            game.private.secondInnings.teamBatting = game.public.scoreCard.teamBScore;
        }
        else {
            game.public.bat ="B";
            game.private.firstInnings.teamBatting = game.public.scoreCard.teamBScore;
            game.private.secondInnings.teamBatting = game.public.scoreCard.teamAScore;
        }
    }
    logItOnConsole("lets show bat variable after toss" + game.public.bat);
    return ("Team" + game.public.tossWinner + message)
}

const setSignFreshA = (roomID, sign) => {
    game = activeGames.get(roomID);
    game.private.signFreshA = true;
    if(game.public.bat === 'A') {
        game.private.battingActiveSign = sign;
        logItOnConsole("team A batting sign -- " + sign);
    }
    else {
        game.private.bowlingActiveSign = sign;
        logItOnConsole("team A bowling sign -- " + sign);
    }
}

const setSignFreshB  = (roomID, sign) => {
    game = activeGames.get(roomID);
    game.private.signFreshB = true;
    if(game.public.bat === 'B') {
        game.private.battingActiveSign = sign;
        logItOnConsole("team B batting sign -- " + sign);
    }
    else {
        game.private.bowlingActiveSign = sign;
        logItOnConsole("team B bowling sign -- " + sign);
    }
}



const updateScoreCard = (gameID) => {
    game = activeGames.get(gameID);
    if(!game.private.signFreshA || !game.private.signFreshB)
    {
        return ({
            scoreCard: game.public.scoreCard,
            inningsIndex: game.private.inningsIndex,
            displayCardScore: game.public.displayCardScore,
            displayCardWickets: game.public.displayCardWickets,
            updated: false
        });
    }
    //resetSignFresh
    game.private.signFreshA = false;
    game.private.signFreshB = false;
    if(game.private.inningsIndex === 1) {
        if (game.private.battingActiveSign ===  game.private.bowlingActiveSign) {
            game.private.firstInnings.teamBatting.wickets +=1;
            game.public.displayCardWickets += 1;
        }
        else {
            game.private.firstInnings.teamBatting.score +=game.private.battingActiveSign;
            game.public.displayCardScore += game.private.battingActiveSign;
        }
        if(game.private.firstInnings.teamBatting.wickets === game.public.numberOfPlayersOnEachSide) {
            game.private.inningsIndex = 2;
            game.public.displayCardScore = 0;
            game.public.displayCardWickets = 0;
            logItOnConsole("batiing variable change: " + game.public.bat)
            if( game.public.bat === 'A') {
                logItOnConsole("do u even come here if yes then batting B");
                game.public.bat = 'B'
            }
            else {
                game.public.bat = 'A';
                logItOnConsole("do u even come here if yes then batting A");
            }
            logItOnConsole("batiing variable change: " + game.public.bat)
        }
        return ({
            scoreCard: game.public.scoreCard,
            inningsIndex: game.private.inningsIndex,
            displayCardScore: game.public.displayCardScore,
            displayCardWickets: game.public.displayCardWickets,
            updated: true
        });
    }
    if(game.private.inningsIndex === 2) {
       
        if (game.private.battingActiveSign ===  game.private.bowlingActiveSign) {
            game.private.secondInnings.teamBatting.wickets +=1;
            game.public.displayCardWickets += 1;
        }
        else {
            game.private.secondInnings.teamBatting.score +=game.private.battingActiveSign;
            game.public.displayCardScore += game.private.battingActiveSign;
        }
        if(game.private.secondInnings.teamBatting.wickets === game.public.numberOfPlayersOnEachSide || 
            game.private.secondInnings.teamBatting.score > game.private.firstInnings.teamBatting.score) {
            game.private.inningsIndex = 3;
        }
        return ({
            scoreCard: game.public.scoreCard,
            inningsIndex: game.private.inningsIndex,
            displayCardScore: game.public.displayCardScore,
            displayCardWickets: game.public.displayCardWickets,
            updated:true
        });
    }
}

const validateRoomID = (roomID) =>{
    return activeGames.has(roomID);
}

const validateTeamCapacity = (gameID, team) => {
    game = activeGames.get(gameID);   
    if(team === "A") {
        return game.public.activeUsersTeamA.length < game.public.numberOfPlayersOnEachSide
    }
    if(team === "B") {
        return game.public.activeUsersTeamB.length < game.public.numberOfPlayersOnEachSide
    }
    else return "roomNameError";
}

const getGameState = (gameID) => {
    return activeGames.get(gameID).public;
}

module.exports = {
    getGameState,
    validateRoomID,
    validateTeamCapacity,
    updateScoreCard,
    tossDecision,
    setCoinFace,
    tossResult,
    coinTossAttempted,
    changeCaptain,
    changeActivePlayer,
    joinGame,
    setSignFreshA,
    setSignFreshB,
    createGame,createGamePool, createGameObject
}