import {IDS,playTrajectory} from './trajectories-playthroughs.mjs';for(const id of IDS){const {s}=playTrajectory(id);console.log(JSON.stringify({id,won:s.won,moves:s.moves,time:s.time}));}
