const { numberOfRandomStringsOfLengthN} = require("./randomStringGenerator");
const { getUser, deleteUser} = require("./user.js")
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
        coinSpin:false,
        tossCall:false,
        tossWinner:"",
        bat:"",
        signA:'',
        signB:'',
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
* active players can only aprticipate in batting bowling
* At a time there is only one eactive player per team
*/

const changeActivePlayer = (user) => {
    game = activeGames.get(user.room);
    user = getUser(user.id);
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
        return ({
            userList:null,
            message: "ERROR CHANGING ACTIVE PLAYER",
            team:'E'
        });
    }  
}

const removeUser = (user, team) => {
    let game = activeGames.get(user.room);
    let captain;
    let activeUser;
    let activeUserChanged = false;
    let captainChanged = false;
    let usersList;
    if(team === 'A') {
        game.public.activeUsersTeamA = game.public.activeUsersTeamA.filter(data => data.username != user.username);
        if(user.captain && game.public.activeUsersTeamA.length > 0) {
            changeCaptain(user.id, game.public.activeUsersTeamA[0].id, user.room);
            captainChanged = true;
        }
        if(user.active && game.public.activeUsersTeamA.length > 0) {
            changeActivePlayer(game.public.activeUsersTeamA[0], user.room);
            activeUserChanged = true;
        }
        captain = game.public.captainTeamA;
        usersList = [...game.public.activeUsersTeamA];
        activeUser  = game.public.activePlayerA;
    }
    else {
        game.public.activeUsersTeamB = game.public.activeUsersTeamB.filter(data => data.username != user.username);
        if(user.captain && game.public.activeUsersTeamB.length > 0) {
            changeCaptain(user.id, game.public.activeUsersTeamB[0].id,  user.room);
            captainChanged = true;
        }
        if(user.active &&  game.public.activeUsersTeamB.length > 0) {
            changeActivePlayer(game.public.activeUsersTeamB[0],  user.room);
            activeUserChanged = true;
        }
        captain = game.public.captainTeamB;
        usersList = [...game.public.activeUsersTeamB];
        activeUser  = game.public.activePlayerB;
    }
    deleteUser(user);
    return ({
        removedUser:user,
        team:team,
        usersList:usersList,
        newCaptain: captain,
        captainChanged: captainChanged,
        activeUserChanged:activeUserChanged,
        newActiveUser:activeUser
    });
}

/* change captain is required when the existing captain gets 
* disconnected
*/

const changeCaptain = (oldCaptainId, newCaptainId, roomID) =>{
    console.log("debug id " + JSON.stringify(newCaptainId));
    console.log("debug id " + JSON.stringify(oldCaptainId));
    oldCaptain = getUser(oldCaptainId);
    newCaptain = getUser(newCaptainId);
    console.log("debug " + JSON.stringify(newCaptain));
    console.log("debug " + JSON.stringify(oldCaptain));
    if(oldCaptain.captain) {
        oldCaptain.captain = false;
        newCaptain.captain = true;
    }
    game = activeGames.get(roomID);
    if(newCaptain.team === "A")
    {
        game.public.captainTeamA = newCaptain;
    }
    else if (newCaptain.team === "B") {
        game.public.captainTeamB = newCaptain;
    }

}

/* this is coin spin indicating toss has been initiated
* 200 is successful , 404 is error
*/

const coinTossAttempted = (roomID, user) => {
    if( user.captain && user.team === "A") {
        activeGames.get(roomID).private.COINFACE = setCoinFace();
        activeGames.get(roomID).public.coinSpin = true;
        return 200;
    }
    else return 404;
}

/* decide who won the toss 
*/

const tossResult = (roomID, tossCall, user) => {
    game = activeGames.get(roomID);
    if(user.captain  && user.team === "B") {
        if(tossCall === game.private.COINFACE) {
            game.public.tossWinner = "B";
            game.public.coinTossActivate = false;
            game.public.tossCall = true;
            return {winner:"B"};
           
        }
        else {
            game.public.tossWinner ="A";
            game.public.coinTossActivate = false;
            return {winner:"B"};
            
        }
    }
}

/* set a coin face on toss attempt. Not sure about the logic.
*/

function setCoinFace() {
    coinFace = ["HEAD", "TAIL"];
    coinIndex =  Math.floor((Math.random() * 2) + 1);
    return coinFace[coinIndex-1];
}

/* this fucntion sets the appropraite batting first and second
* references so that we get a lesss if else ladder scorecard update
*/

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
    return ({message:"Team" + game.public.tossWinner + message, batting: game.public.bat})
}

/* this fucntion sets the team a sign for a game 
* that would be used to compute the result, 
*fresh signs would be used and signfresh would be false 
*until next  fresh value is sent by client ( team ) 
* setSignFreshA and setSignFreshB
*/

const setSignFreshA = (roomID, sign) => {
    game = activeGames.get(roomID);
    game.public.signA = sign;
    game.private.signFreshA = true;
    if(game.public.bat === 'A') {
        game.private.battingActiveSign = sign;
    }
    else {
        game.private.bowlingActiveSign = sign;
    }
}

const setSignFreshB  = (roomID, sign) => {
    game = activeGames.get(roomID);
    game.public.signB = sign;
    game.private.signFreshB = true;
    if(game.public.bat === 'B') {
        game.private.battingActiveSign = sign;
    }
    else {
        game.private.bowlingActiveSign = sign;
    }
}

/* updateScorecard returns the result of a game play
* it computes it using the signs of both teams
* recived batting and bowling signs for convienience
* it has idea about which innings is goin on
* and rest set by obejct references it justs updates
* that. It has updated field that is set to true 
* if any true computation takes place and is returned
*/

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
            // [ACTION] : Innings change direct batting indicator
            if( game.public.bat === 'A') {
                game.public.bat = 'B'
            }
            else {
                game.public.bat = 'A';
            }
        }
        return ({
            scoreCard: game.public.scoreCard,
            inningsIndex: game.private.inningsIndex,
            displayCardScore: game.public.displayCardScore,
            displayCardWickets: game.public.displayCardWickets,
            signA: game.public.signA,
            signB: game.public.signB,
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
        // [GAME OVER] this condition satisifies means game is done.
        if(game.private.secondInnings.teamBatting.wickets === game.public.numberOfPlayersOnEachSide || 
            game.private.secondInnings.teamBatting.score > game.private.firstInnings.teamBatting.score) {
            game.private.inningsIndex = 3;
        }
        return ({
            scoreCard: game.public.scoreCard,
            inningsIndex: game.private.inningsIndex,
            displayCardScore: game.public.displayCardScore,
            displayCardWickets: game.public.displayCardWickets,
            signA: game.public.signA,
            signB: game.public.signB,
            updated:true
        });
    }
}

/* validate whether a room id exists or not 
*/

const validateRoomID = (roomID) =>{
    return activeGames.has(roomID);
}

/* checkk team strength whether users can join
* returns a boolean
*/

const validateTeamCapacity = (gameID, team) => {
    game = activeGames.get(gameID);   
    if(team === "A") {
        return game.public.activeUsersTeamA.length < game.public.numberOfPlayersOnEachSide
    }
    if(team === "B") {
        return game.public.activeUsersTeamB.length < game.public.numberOfPlayersOnEachSide
    }
    else return false;
}

/* check if the user is unique in a team in a room
* returns  a boolean
*/

const uniqueUser = (username, roomID, team) => {
    game = activeGames.get(roomID)
    userList  = game.public.activeUsersTeamA.map(data => data.username);
    if(userList.includes(username)) {
        return false;
    }
    return true;
} 

/* get the game state */

const getGameState = (gameID) => {
    return activeGames.get(gameID).public;
}

module.exports = {
    getGameState, validateRoomID, validateTeamCapacity, updateScoreCard, tossDecision,
    setCoinFace, tossResult, coinTossAttempted, changeCaptain, changeActivePlayer, joinGame,
    setSignFreshA, setSignFreshB, createGame, createGamePool, createGameObject,
    uniqueUser, removeUser
}