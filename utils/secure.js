const hex = require("./hexcodes.json");

module.exports = function inHex(key){
    return hex.indexOf(key) > -1;
}