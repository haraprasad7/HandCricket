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

gameStateIndicator 
update the varaible as per following events
0 - toss not yet activated.
1- tossActivated [ oppoent captain joined event]
2 - coin spin event
3 - head and tails call event
4 - toss winner has choosen bat or ball.
*/
const createGameObject = (numberOfPlayers, roomID) => {
    
    return ({
        public :{
        gameID: roomID,
        numberOfPlayersOnEachSide:numberOfPlayers,
        activeUsersTeamA: [],
        activeUsersTeamB: [],
        coinTossActivate:false,
        gameStateIndicator:0,
        tossWinner:"",
        bat:"",
        signA:{},
        signB:{},
        result:"",
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
        battingActiveSign:{},
        bowlingActiveSign:{},
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

const createGame = (numberOfPlayers) => {
    gameID = gameIdPool[0];
    gameIdPool.splice(0,1);
    game = createGameObject(numberOfPlayers, gameID);
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
            game.public.captainTeamA = user;
        }
        game.public.activeUsersTeamA.push(user);
    }
    else if (team === "B") {
        if(game.public.activeUsersTeamB.length === 0) {
            user.captain = true;
            game.public.captainTeamB = user;
            game.public.coinTossActivate = true;
            game.public.gameStateIndicator = 1;
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
    if (user.team === 'A') {
        game.public.activePlayerA.active = false;
        user.active = true;
        game.public.activePlayerA = user;
        return ({
            user:game.public.activePlayerA,
            message: "Active player of team A changed",
            team:'A'
        });
    }
    else {
        game.public.activePlayerB.active =  false;
        user.active = true;
        game.public.activePlayerB = user;
        return ({
            user:game.public.activePlayerB,
            message: "Active player of team B changed",
            team:'B'
        });
    }
}

const removeUser = (user, team) => {
    let game = activeGames.get(user.room);
    let captain;
    let captainChanged = false;
    let usersList;
    let activeUserChanged = false;
    if(team === 'A') {
        if(user.active ) {
            activeUserChanged = true;
            game.public.activePlayerA = {};
        }
        let otherPlayers = game.public.activeUsersTeamA.filter(data => (data.username != user.username) && data.online);
        if(user.captain && otherPlayers.length > 0) {
            otherPlayers[0].captain = true;
            captainChanged = true;
            game.public.captainTeamA = otherPlayers[0];
        }
        game.public.activeUsersTeamA.forEach(player => {
            if(player.id === user.id) {
                player.online  = false;
                player.active = false;
                player.captain = false;
            }
        });
        if(user.cookieEnable)
        {
            usersList = [...game.public.activeUsersTeamA];
        }
        else {
            game.public.activeUsersTeamA = game.public.activeUsersTeamA.filter(data => data.username != user.username);
            usersList = [...game.public.activeUsersTeamA];
            deleteUser(user);
        }
        captain = game.public.captainTeamA;
      
    }
    else {
        if(user.active ) {
            activeUserChanged = true;
            game.public.activePlayerB = {}
        }
        let otherPlayers = game.public.activeUsersTeamB.filter(data => (data.username != user.username) && data.online);
        if(user.captain && otherPlayers.length > 0) {
            otherPlayers[0].captain = true;
            game.public.captainTeamB = otherPlayers[0];
            captainChanged = true;
        }
        game.public.activeUsersTeamB.forEach(player => {
            if(player.id === user.id) {
                player.online  = false;
                player.active = false;
                player.captain = false;
            }
        });
        if(user.cookieEnable)
        {
            usersList = [...game.public.activeUsersTeamB];
        }
        else {
            game.public.activeUsersTeamB = game.public.activeUsersTeamB.filter(data => data.username != user.username);
            usersList = [...game.public.activeUsersTeamB];
            deleteUser(user);
        }
        captain = game.public.captainTeamB;
        
    }
    return ({
        removedUser:user,
        team:team,
        usersList:usersList,
        newCaptain: captain,
        captainChanged: captainChanged,
        activeUserChanged:activeUserChanged,
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
        activeGames.get(roomID).public.gameStateIndicator = 2;
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
            game.public.gameStateIndicator = 3;
            return {winner:"B"};
           
        }
        else {
            game.public.tossWinner ="A";
            game.public.coinTossActivate = false;
            game.public.gameStateIndicator = 3;
            return {winner:"A"};
            
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
        game.public.gameStateIndicator = 4;
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
        game.public.gameStateIndicator = 4;
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
    return ({message:"Team " + game.public.tossWinner + message, batting: game.public.bat})
}

/* this fucntion sets the team a sign for a game 
* that would be used to compute the result, 
*fresh signs would be used and signfresh would be false 
*until next  fresh value is sent by client ( team ) 
* setSignFreshA and setSignFreshB
*/

const setSignFreshA = (roomID, sign, user) => {
    getUser(user.id).cookieEnable = true;
    game = activeGames.get(roomID);
    let userSign =  {
        sign:sign,
        username:user.username
    };
    game.public.signA = userSign;
    game.private.signFreshA = true;
    if(game.public.bat === 'A') {
        game.private.battingActiveSign = userSign;
    }
    else {
        game.private.bowlingActiveSign = userSign;
    }
}

const setSignFreshB  = (roomID, sign, user) => {
    getUser(user.id).cookieEnable = true;
    game = activeGames.get(roomID);
    let userSign =  {
        sign:sign,
        username:user.username
    };
    game.public.signB = userSign;
    game.private.signFreshB = true;
    if(game.public.bat === 'B') {
        game.private.battingActiveSign = userSign;
    }
    else {
        game.private.bowlingActiveSign = userSign;
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
    let wicket =  false;
    let result = '';
    if(!game.private.signFreshA || !game.private.signFreshB)
    {
        return ({
            scoreCard: game.public.scoreCard,
            inningsIndex: game.private.inningsIndex,
            displayCardScore: game.public.displayCardScore,
            displayCardWickets: game.public.displayCardWickets,
            updated: false,
            wicket: false,
            result:result
        });
    }
    //resetSignFresh
    game.private.signFreshA = false;
    game.private.signFreshB = false;
    if(game.private.inningsIndex === 2) {
        game.private.inningsIndex = 3;
    }
    if(game.private.inningsIndex === 1) {
        if (game.private.battingActiveSign.sign ===  game.private.bowlingActiveSign.sign) {
            game.private.firstInnings.teamBatting.wickets +=1;
            game.public.displayCardWickets += 1;
            wicket = true;
            if( game.public.bat === 'A') {
               game.public.activePlayerA.active = false;
               game.public.activeUsersTeamB.forEach(user => {
                   if (user.username === game.private.bowlingActiveSign.username) {
                       user.wickets = user.wickets + 1;
                   }
               });
            }
            else {
                game.public.activePlayerB.active = false;
                game.public.activeUsersTeamA.forEach(user => {
                    if (user.username === game.private.bowlingActiveSign.username) {
                        user.wickets = user.wickets + 1;
                    }
                });
            }
        }
        else {
            game.private.firstInnings.teamBatting.score +=game.private.battingActiveSign.sign;
            game.public.displayCardScore += game.private.battingActiveSign.sign;
            if(game.public.bat === 'A') {
                game.public.activeUsersTeamA.forEach(user => {
                    if (user.username === game.private.battingActiveSign.username) {
                        user.runs = user.runs + game.private.battingActiveSign.sign;
                    }
                });
            }
            else {
                game.public.activeUsersTeamB.forEach(user => {
                    if (user.username === game.private.battingActiveSign.username) {
                        user.runs = user.runs + game.private.battingActiveSign.sign;
                    }
                });
            }
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
            signA: game.public.signA.sign,
            signB: game.public.signB.sign,
            userA:game.public.signA.username,
            userB:game.public.signB.username,
            updated: true,
            wicket: wicket,
            result:result,
        });
    }
    if(game.private.inningsIndex === 3) {
       
        if (game.private.battingActiveSign.sign ===  game.private.bowlingActiveSign.sign) {
            game.private.secondInnings.teamBatting.wickets +=1;
            game.public.displayCardWickets += 1;
            wicket = true;
            if( game.public.bat === 'A') {
                game.public.activePlayerA.active = false;
                game.public.activeUsersTeamB.forEach(user => {
                    if (user.username === game.private.bowlingActiveSign.username) {
                        user.wickets = user.wickets + 1;
                    }
                });
             }
             else {
                 game.public.activePlayerB.active = false;
                 game.public.activeUsersTeamA.forEach(user => {
                    if (user.username === game.private.bowlingActiveSign.username) {
                        user.wickets = user.wickets + 1;
                    }
                });
                
             }
        }
        else {
            if(game.public.bat === 'A') {
                game.public.activeUsersTeamA.forEach(user => {
                    if (user.username === game.private.battingActiveSign.username) {
                        user.runs = user.runs + game.private.battingActiveSign.sign;
                    }
                });
            }
            else {
                game.public.activeUsersTeamB.forEach(user => {
                    if (user.username === game.private.battingActiveSign.username) {
                        user.runs = user.runs + game.private.battingActiveSign.sign;
                    }
                });
            }
            game.private.secondInnings.teamBatting.score +=game.private.battingActiveSign.sign;
            game.public.displayCardScore += game.private.battingActiveSign.sign;
        }
        // [GAME OVER] this condition satisifies means game is done.
        if(game.private.secondInnings.teamBatting.wickets === game.public.numberOfPlayersOnEachSide || 
            game.private.secondInnings.teamBatting.score > game.private.firstInnings.teamBatting.score) {
            game.private.inningsIndex = 4;
            if(game.private.secondInnings.teamBatting.score > game.private.firstInnings.teamBatting.score) {
                result = 'B';
                game.public.result = 'B';
            }
            else if (game.private.secondInnings.teamBatting.score === game.private.firstInnings.teamBatting.score) {
                result = "T";
                game.public.result = 'T';
            }
            else {
                result = 'A';
                game.public.result = 'A';
            }
        }
        return ({
            scoreCard: game.public.scoreCard,
            inningsIndex: game.private.inningsIndex,
            displayCardScore: game.public.displayCardScore,
            displayCardWickets: game.public.displayCardWickets,
            signA: game.public.signA.sign,
            signB: game.public.signB.sign,
            userA:game.public.signA.username,
            userB:game.public.signB.username,
            updated:true,
            wicket: wicket, 
            result: result,
            gameState: game.public
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

    userList  = team === 'A'?  
    game.public.activeUsersTeamA.map(data => data.username) :  game.public.activeUsersTeamB.map(data => data.username);
    if(userList.includes(username)) {
        return false;
    }
    return true;
} 

/* get the game state */

const getGameState = (gameID) => {
    return activeGames.get(gameID).public;
}

const cleanGame = (gameID) => {
    try {

    let game = activeGames.get(gameID);
    game.public.activeUsersTeamA.forEach(user => {
        deleteUser(user.id);
    });
    game.public.activeUsersTeamB.forEach(user => {
        deleteUser(user.id);
    });
    return activeGames.delete(gameID);
    }
    catch {
        return false;
    }
}


module.exports = {
    getGameState, validateRoomID, validateTeamCapacity, updateScoreCard, tossDecision,
    setCoinFace, tossResult, coinTossAttempted, changeCaptain, changeActivePlayer, joinGame,
    setSignFreshA, setSignFreshB, createGame, createGamePool, createGameObject,
    uniqueUser, removeUser, cleanGame
}