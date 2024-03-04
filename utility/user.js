const users = new Map();

/* creates a user object we have the socket id
* the unique identifier
*/

const createUser = (socketId) => {
    return {
        username:'',
        id:''
    }
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
    user.id = username+room+team;
    users.set(user.id, user);
}

/* retrieve user by socketid */

const getUser = (id) => {
    return users.get(id);
}

const deleteUser = (user) => {
    users.delete(user.id);
}
module.exports = {
    assignData, getUser, createUser, deleteUser
}
