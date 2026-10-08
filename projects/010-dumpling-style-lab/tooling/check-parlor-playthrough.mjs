import {IDS,playParlor} from './parlor-playthroughs.mjs';
for(const id of IDS){const {s}=playParlor(id);console.log(JSON.stringify({id,won:s.won,moves:s.moves,time:s.time}));}
