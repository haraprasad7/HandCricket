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

const assignData = (user, team, username, room) => {
    user.username = username;
    user.team = team;
    user.room = room;
    user.captain = false;
    user.active  = false;
}

 const getUser = (socketId) => {
    return users.get(socketId);
}

// we need Map for htis, not much of a help with list.