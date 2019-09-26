module.exports = function defineModels(mg) {
  const participantSchema = new mg.Schema({
    key: { type: String, unique: true },
    status: { type: String, default: "registered" },
    name: String,
    course: String,
    team: Number,
    found:{
      type:Boolean,
      default: false
    }
  });
  const gameSchema = new mg.Schema({
    started: {
      type: Boolean,
      default: false
    }
  });
  const teamSchema = new mg.Schema({
    number: {
      type: Number,
      unique: true,
      required: true
    },
    order: [String],
    round: { type: Number, default: 0 },
    rounds: [[{ key: String, word: String }]],
    message: String,
    room: String,
    lead: String
  });
  const Participant = mg.model("Participant", participantSchema);
  const Game = mg.model("Game", gameSchema);
  const Team = mg.model("Team", teamSchema);
  return { Game, Participant, Team };
};
