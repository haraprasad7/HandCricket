const { logItOnConsole, logItOnFile } = require("../logging/utilityFunction");
const users = new Map();
const createUser = (socketId) => {
    return {
        username:'',
        socketId:socketId,
    }
}
const addUser = (user) => {
    users.set(user.socketId, user);
}

const assignData = (user, username, team, room) => {
    user.username = username;
    user.team = team;
    user.room = room;
    user.captain = false;
    user.active  = false;
}

 const getUser = (socketId) => {
    return users.get(socketId);
}

module.exports = {
    addUser, assignData, getUser, createUser
}
// we need Map for htis, not much of a help with list.