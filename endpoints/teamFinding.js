module.exports = (app, models) => {
  const { Participant, Team } = models;

  app.post("/message/:key", async (req, res) => {
    const key = req.params.key;
    const participant = await Participant.findOne({ key });
    const number = participant.team;
    const team = await Team.findOne({ number });

    if (team.lead === key) {
      participant.found = true;
      team.message = req.body.message;
      await team.save();
      await participant.save();
      res.send("done");
    } else {
      res.send("no access");
    }
  });

  app.get("/message/:key", async (req, res) => {
    const key = req.params.key;
    const participant = await Participant.findOne({ key });
    const number = participant.team;
    const team = await Team.findOne({ number });

    if (team.message) {
      res.send(team.message);
    } else {
      res.send("no message");
    }
  });

  app.post("/found/:key", async (req, res) => {
    const key = req.params.key;
    const participant = await Participant.findOne({ key });
    participant.found = true;
    await participant.save();
    res.send("done");
  });
};
