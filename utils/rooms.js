const rooms = [
    "inno.space\nGebäude K - Streifen am Boden folgen.",
    "Druckerei\nGebäude A - 1.UG",
    "Denkraum\nGebäude A - Erdgeschoss",
    "Robotik (A111)\nGebäude A - 1.OG",
    "Zitrone\nGebäude G - Erdgeschoss",
    "Aula\nGebäude C - 1.OG", //?
    "Mensa",
    "Postfächer\nGebäude H - EG"
]
module.exports = function getRoom(teamNr) {
    while(teamNr > rooms.length - 1){
        teamNr-=rooms.length
    }
    return rooms[teamNr];
}
