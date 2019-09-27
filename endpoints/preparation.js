const isPermitted = require("../utils/secure");
const getRandomWord = require("../utils/words");
const shuffle = require("../utils/shuffle");
const getRoom = require("../utils/rooms");

const courses = ["uib", "csb", "ib", "imb"];

module.exports = (app, models) => {
  const { Game, Participant, Team } = models;

  app.get("/:key", async (req, res) => {
    const key = req.params.key;
    let body = { permitted: isPermitted(key) };
    res.statusCode = body.permitted ? 200 : 404;
    res.send(body);
  });

  app.post("/register/:key", async (req, res) => {
    const key = req.params.key;
    try {
      const game = await Game.findOne();
      const started = game && game.started;
      const participants = await Participant.find({ key }).exec();
      if (started) {
        res.send("alreadyStarted");
      } else if (participants && participants[0]) {
        res.send("alreadyRegistered");
      } else {
        const { course, name } = req.body;
        new Participant({ key, name, course }).save();
        res.send("done");
      }
    } catch (e) {
      res.statusCode = 500;
      res.send(e);
    }
  });

  async function defineTeam(members, number) {
    let team = new Team({ number, room: getRoom(number) });

    for (let i = 0; i < members.length; i++) {
      const participant = members[i];
      const passivePlayers = members.filter(p => p.key != participant.key);
      participant.team = number;
      team.order.push(participant.key);
      team.rounds.push(
        passivePlayers.map(p => {
          return { key: p.key, word: getRandomWord() };
        })
      );
      await participant.save();
    }
    team.lead = team.order[0];
    await team.save();
  }

  async function spreadMembers(members, number) {
    for (let i = 0; i < members.length; i++) {
      const newTeamNr = number - i - 1;
      const participant = members[i];
      const team = await Team.findOne({ number: newTeamNr });
      const passivePlayers = team.order.slice();
      participant.team = newTeamNr;
      team.order.push(participant.key);
      
      const newRounds = team.rounds.map(r => {
        let copied = r.slice();
        copied.push({ key: participant.key, word: getRandomWord() });
        return copied;
      });
      newRounds.push(
        passivePlayers.map(p => {
          return { key: p, word: getRandomWord() };
        })
      );
      team.rounds = newRounds;
      await participant.save();
      await team.save();
    }
  }

  async function setTeams() {
    let teamNumber = 0;
    for (let i = 0; i < courses.length; i++) {
      let from = 0;
      const participants = await Participant.find({ course: courses[i] });
      let courseObject = shuffle(participants);
      const length = courseObject.length;
      const size = 5;
      while (from < length) {
        const members = courseObject.slice(from, (from += size));
        if (members.length < 4 && members.length <= teamNumber) {
          await spreadMembers(members, teamNumber);
        } else {
          await defineTeam(members, teamNumber);
        }
        teamNumber++;
      }
    }
  }

  app.post("/start/:sc", async (req, res) => {
    if ((req.params.sc = "NOW")) {
      await setTeams();
      new Game({ started: true }).save();
      res.send("success");
    } else {
      res.send("Please check security code");
    }
  });

  app.get("/all/:key", async (req, res) => {
    const key = req.params.key;
    const participant = await Participant.findOne({ key });

    if (participant) {
      const teamId = participant.team;
      const game = await Game.findOne();
      const responseData = {
        course: participant.course,
        name: participant.name,
        status: game && game.started ? "findTeam" : "registered",
        foundTeam: participant.found
      };
      if (teamId || teamId === 0) {
        const team = await Team.findOne({ number: teamId });
        responseData.message = team.message;
        responseData.role = team.lead === key ? "lead" : "member";
        responseData.round = team.round - 1;
        responseData.team = teamId;
        const teammates = await Participant.find({
          team: teamId,
          key: { $not: new RegExp(key) }
        }).exec();
        responseData.teammates = teammates.map(p => p.name);
      }
      res.send(responseData);
    } else {
      res.send({ status: "wrongKey" });
    }
  });
};
