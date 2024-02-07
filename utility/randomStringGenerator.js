 /* generates a random string of lenth <n> */
 
 generateRandomStringOfLengthN = n => {
    let randomString           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for ( let i = 0; i < n; i++ ) {
      randomString += characters.charAt(Math.floor(Math.random()*characters.length));
   }
   return randomString;
}

/* this function returns <number> number of strings
*of length <n>
*/

numberOfRandomStringsOfLengthN = (number, n) => {
    idSet = new Set();
    for (let i = 0; i< number ; i++) 
    {
        newSrting = generateRandomStringOfLengthN(n);
        idSet.add(newSrting);

    }
    return Array.from(idSet);
}

module.exports = {
    numberOfRandomStringsOfLengthN
}
