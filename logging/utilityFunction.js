/* [LOGIING LABELS] *******
*  [INFO] - general inforamtion
*  [SKID] - socket id
*  [UXER] - user experience problem error
*  [RSLT] - result related log
*  [SIGN] - sign of game play , a number
*  [GAME] - game data
*  [RVAL] - return value of a nearby fucntion call
*  [EROR] - error log
*/

/*log it to the console */

const logItOnConsole = (message) => {
    console.log(message)
}
/* log it to file */
const logItOnFile = (message) => {
    console.log(message);
}

module.exports = {
    logItOnConsole,
    logItOnFile
}