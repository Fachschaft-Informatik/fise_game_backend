const shuffle = require("../utils/shuffle");

module.exports = (app, models) => {
  const { Game, Participant, Team } = models;

  app.get("/status/:key", async (req, res) => {
    const game = await Game.findOne();
    if (game && game.started) {
      const key = req.params.key;
      const participant = await Participant.findOne({ key });
      const number = participant.team;
      const team = await Team.findOne({ number });

      const teammatesRaw = await Participant.find({
        team: number,
        key: { $not: new RegExp(key) }
      }).exec();
      const teammates = teammatesRaw.map(p => p.name);

      if (team.lead === key) {
        res.send({ teammates, role: "lead", team: number });
      } else {
        res.send({ teammates, role: "member", team: number });
      }
    } else {
      res.send({ role: "pending" });
    }
  });

  app.get("/currentRound/:key", async (req, res) => {
    const key = req.params.key;
    const participant = await Participant.findOne({ key });
    const number = participant.team;
    const team = await Team.findOne({ number });
    const teamMembers = await Participant.find({ team: number }).exec();
    const allFound = teamMembers.reduce((sum, val) => sum && val.found, true);
    const notOver = team.round < team.order.length;

    let gameData;
    if (allFound && notOver) {
      const currentRound = team.rounds[team.round];
      if (team.order[team.round] === key) {
        const round = currentRound.map(async p => {
          const raw = await Participant.findOne({ key: p.key });
          return {
            name: raw.name,
            val: p.word
          };
        });
        participant.status = "active";
        gameData = shuffle(await Promise.all(round));
      } else {
        const playerIndex = currentRound.findIndex(i => i.key === key);
        participant.status = "passive";
        gameData = currentRound[playerIndex].word;
      }
    } else if (!notOver) {
      participant.status = "finished";
      gameData = team.room;
    }
    participant.save();
    res.send({ message: participant.status, gameData });
  });

  app.get("/next/:key", async (req, res) => {
    const key = req.params.key;
    const participant = await Participant.findOne({ key });
    const number = participant.team;
    const team = await Team.findOne({ number });

    res.send({ round: team.round });
  });

  app.post("/next/:key", async (req, res) => {
    const key = req.params.key;
    const participant = await Participant.findOne({ key });
    const number = participant.team;
    const team = await Team.findOne({ number });
    const currentRound = req.body.round;

    if (team.round === currentRound && team.order[team.round] === key) {
      team.round++;
      team.save();
      res.send("done");
    } else {
      res.status(400);
      res.send("no access");
    }
  });
};
