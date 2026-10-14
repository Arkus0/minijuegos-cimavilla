export const WIDTH = 960, HEIGHT = 600, FLOOR = 552, STEP = 1 / 60, STAKE = 25;
const platforms = (...rows) => rows.map(([x,y,w]) => ({ x,y,w,h:18 }));
const enemies = (...rows) => rows.map(([x,y,type]) => ({ x,y,type }));
export const WORLDS = [
  { id:'garden', name:'Jardines de la luna', short:'MOON GARDEN', color:'#80f5c9', edge:'#48a67d', music:0 },
  { id:'crystal', name:'Grutas de cristal', short:'CRYSTAL CAVES', color:'#c9b5ff', edge:'#8062c9', music:1 },
  { id:'factory', name:'Fábrica de caramelos', short:'CANDY WORKS', color:'#ffce80', edge:'#cd8545', music:2 },
];
export const LEVELS = [
  { name:'Una pequeña travesura', world:0, seconds:85,
    platforms:platforms([58,450,282],[620,450,282],[330,352,300],[62,255,254],[644,255,254],[334,158,292]),
    enemies:enemies([330,FLOOR,'mush'],[590,FLOOR,'mush'],[125,450,'mush'],[720,450,'hopper'],[430,352,'mush']) },
  { name:'Por las copas', world:0, seconds:90,
    platforms:platforms([42,453,190],[345,453,270],[728,453,190],[194,354,270],[496,354,270],[42,255,240],[678,255,240],[346,157,268]),
    enemies:enemies([340,FLOOR,'mush'],[650,FLOOR,'hopper'],[120,453,'hopper'],[794,453,'mush'],[558,354,'mush'],[426,185,'bat']) },
  { name:'Brillo en la oscuridad', world:1, seconds:90,
    platforms:platforms([42,449,290],[628,449,290],[236,350,220],[504,350,220],[42,251,250],[668,251,250],[352,151,256]),
    enemies:enemies([310,FLOOR,'hopper'],[665,FLOOR,'mush'],[140,449,'mush'],[735,449,'hopper'],[315,350,'hopper'],[564,212,'bat']) },
  { name:'La escalera de prismas', world:1, seconds:95,
    platforms:platforms([110,458,240],[610,458,240],[34,358,218],[370,358,220],[708,358,218],[204,258,230],[526,258,230],[368,158,224]),
    enemies:enemies([355,FLOOR,'hopper'],[625,FLOOR,'hopper'],[170,458,'mush'],[685,458,'hopper'],[420,358,'mush'],[286,223,'bat'],[675,183,'bat']) },
  { name:'Hora de las travesuras', world:2, seconds:95,
    platforms:platforms([46,452,272],[642,452,272],[200,350,238],[522,350,238],[42,248,280],[638,248,280],[344,147,272]),
    enemies:enemies([310,FLOOR,'rotor'],[630,FLOOR,'mush'],[120,452,'hopper'],[730,452,'rotor'],[270,350,'hopper'],[590,350,'mush'],[456,195,'bat']) },
  { name:'La gran parada', world:2, seconds:105,
    platforms:platforms([42,452,200],[340,452,280],[718,452,200],[190,350,250],[520,350,250],[42,248,240],[678,248,240],[346,146,268]),
    enemies:enemies([340,FLOOR,'rotor'],[635,FLOOR,'hopper'],[110,452,'rotor'],[770,452,'rotor'],[257,350,'hopper'],[590,350,'hopper'],[386,196,'bat'],[630,164,'bat']) },
];

export const INPUT_ACTIONS = {
  Coin:['KeyM'], Start1:['Digit1'], Start2:['Digit2'], Pause:['KeyP','Escape'],
  P1Left:['KeyA'],P1Right:['KeyD'],P1Jump:['KeyW','Space'],P1Shoot:['KeyF'],P1Burst:['KeyG'],
  P2Left:['ArrowLeft'],P2Right:['ArrowRight'],P2Jump:['ArrowUp'],P2Shoot:['KeyK'],P2Burst:['KeyL'],
};
