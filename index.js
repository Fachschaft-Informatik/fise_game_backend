const shuffle = require("./utils/shuffle");
const isPermitted = require("./utils/secure");
const getRandomWord = require("./utils/words");
const express = require("express");
const app = express();
const getRoom = require("./utils/rooms")

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8808
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

app.use(express.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

let start = false;

let datastore = {
  ib: [],
  uib: [],
  imb: [],
  csb: [],
  im: []
};

let teams = {};

let participants = {};

app.get("/status", function(req, res) {
  res.send({ start, datastore, teams, participants, test, xxxxx });
});

app.get("/:key", function(req, res) {
  const key = req.params.key;
  let body = {};
  if (isPermitted(key)) {
    res.statusCode = 200;
    body.permitted = true;
  } else {
    res.statusCode = 404;
    body.permitted = false;
  }
  res.send(body);
});

app.post("/register/:key", function(req, res) {
    const key = req.params.key;
  if(start){
    res.send("alreadyStarted")
  } else if(participants[key]){
    res.send("alreadyRegistered")
  } else {
    const { course, name } = req.body;
    datastore[course].push(key);
    participants[key] = {
      course,
      name
    };

    res.send("done");
  }
});

function defineTeam(members, number){
  teams[number] = {
    found: [],
    order: [],
    round: 0,
    rounds: [],
    lead: members[0],
    message: null,
    status: "findTeam",
    room: getRoom(number)
  };

  for (let i = 0; i < members.length; i++) {
    const participantKey = members[i];
    const passivePlayers = members.filter(p => p != participantKey);
    participants[participantKey].team = number;
    teams[number].order.push(participantKey);
    teams[number].rounds.push(
      passivePlayers.map(p => {
        return { key: p, word: getRandomWord() };
      })
    );
    teams[number].found.push(false);
  }

}
function spreadMembers(members, number){
  for(let i = 0; i < members.length; i++){
    const newTeamNr = number - i - 1;
    const participantKey = members[i];
    const passivePlayers = [...teams[newTeamNr].order];
    participants[participantKey].team = newTeamNr;
    teams[newTeamNr].order.push(participantKey);
    teams[newTeamNr].rounds.forEach(r => {
      r.push({ key: participantKey, word: getRandomWord() })
    })
    teams[newTeamNr].rounds.push(
      passivePlayers.map(p => {
        return { key: p, word: getRandomWord() };
      })
    );
    teams[newTeamNr].found.push(false);
  }
}
function setTeams() {
  let teamNumber = 0;
  for (let course in datastore) {
    let from = 0;
    let courseObject = shuffle(datastore[course]);
    const length = courseObject.length;
    const size = 5;
    while (from < length) {
      const members = courseObject.slice(from, from += size);
      if(members.length < 4 && members.length <= teamNumber){
        spreadMembers(members, teamNumber)
      } else {
        defineTeam(members, teamNumber)
      }
      teamNumber++;
    }
  }
}

app.post("/start/:sc", function(req, res) {
  if ((req.params.sc = "NOW")) {
    setTeams();
    start = true;
    res.send("success");
  } else {
    res.send("Please check security code");
  }
});

app.get("/status/:key", function(req, res) {
  if (start) {
    const key = req.params.key;
    const teamId = participants[key].team;
    const teamData = teams[teamId];
    const teammates = teamData.order
      .filter(m => m != key)
      .map(m => participants[m].name);

    if (teamData.lead === key) {
      res.send({ teammates, role: "lead", team: teamId });
    } else {
      res.send({ teammates, role: "member", team: teamId });
    }
  } else {
    res.send({ role: "pending" });
  }
});

app.post("/message/:key", function(req, res) {
  const key = req.params.key;
  const teamId = participants[key].team;
  const teamData = teams[teamId];

  if (teamData.lead === key) {
    teamData.found[0] = true;
    teamData.message = req.body.message;
    res.send("done");
  } else {
    res.send("no access");
  }
});

app.get("/message/:key", function(req, res) {
  const key = req.params.key;
  const teamId = participants[key].team;
  const teamData = teams[teamId];

  if (teamData.message) {
    res.send(teamData.message);
  } else {
    res.send("no message");
  }
});

app.post("/found/:key", function(req, res) {
  const key = req.params.key;
  const teamId = participants[key].team;
  const teamData = teams[teamId];
  const pos = teamData.order.indexOf(key);

  teamData.found[pos] = true;
  res.send("done");
});

app.get("/currentRound/:key", function(req, res) {
  const key = req.params.key;
  const teamId = participants[key].team;
  const teamData = teams[teamId];
  const allFound = teamData.found.reduce((prev, cur) => prev && cur, true);
  const notOver = teamData.round < teamData.order.length;

  if (allFound && notOver) {
    const currentRound = teamData.rounds[teamData.round];
    let resBody;
    if (teamData.order[teamData.round] === key) {
      const round = currentRound.map((p, i) => {
        return {
          name: participants[p.key].name,
          val: p.word
        };
      });
      teams[teamId].status = "active";
      resBody = {
        message: "active",
        gameData: shuffle(round)
      };
    } else {
      const playerIndex = currentRound.findIndex(i => i.key === key);
      teams[teamId].status = "passive";
      resBody = {
        message: "passive",
        gameData: currentRound[playerIndex].word
      };
    }

    res.send(resBody);
  } else if (notOver) {
    res.send({ message: "pending" });
  } else {
    teams[teamId].status = "finished";
    res.send({ message: "finished", gameData: teams[teamId].room });
  }
});

app.get("/next/:key", function(req, res) {
  const key = req.params.key;
  const teamId = participants[key].team;
  const teamData = teams[teamId];

  res.send({ round: teamData.round });
});

app.post("/next/:key", function(req, res) {
  const key = req.params.key;
  const teamId = participants[key].team;
  const teamData = teams[teamId];
  const currentRound = req.body.round;

  if (
    teamData.order[teamData.round] === key &&
    teamData.round === currentRound
  ) {
    teamData.round++;
    res.send("done");
  } else {
    res.status(400);
    res.send("no access");
  }
});

app.get("/all/:key", function(req, res) {
  const key = req.params.key;
  const userData = participants[key];
  if(userData){
    const teamId = userData.team;

    const responseData = {
      course: userData.course,
      name: userData.name,
      status: "registered"
    };
    if (teamId || teamId === 0) {
      const teamData = teams[teamId];
      const indexInTeam = teamData.order.indexOf(key);
      responseData.foundTeam = teamData.found[indexInTeam];
      responseData.message = teamData.message;
      responseData.role = teamData.lead === key ? "lead" : "member";
      responseData.round = teamData.round -1;
      responseData.team = userData.team;
      responseData.teammates = teamData.order.map(p => participants[p].name);
      responseData.status = "findTeam";
    }
    res.send(responseData);
  } else {

    res.send({status: "wrongKey"});
  }
});

app.listen(server_port,server_ip_address, function() {
  console.log(`Example app listening on port ${server_ip_address}:${server_port}!`);
});
