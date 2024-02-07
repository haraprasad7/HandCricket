const { logItOnConsole, logItOnFile } = require("../logging/utilityFunction");
const users = new Map();

/* creates a user object we have the socket id
* the unique identifier
*/

const createUser = (socketId) => {
    return {
        username:'',
        socketId:socketId,
    }
}

/* add user to the map 
* for easy retireval and management
*/

const addUser = (user) => {
    users.set(user.socketId, user);
}

/* initializing the user metadata based on game, team
* active user, captain etc
*/

const assignData = (user, username, team, room) => {
    user.username = username;
    user.team = team;
    user.room = room;
    user.captain = false;
    user.active  = false;
}

/* retrieve user by socketid */

const getUser = (socketId) => {
    return users.get(socketId);
}

module.exports = {
    addUser, assignData, getUser, createUser
}
