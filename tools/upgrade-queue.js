const p=require('../assets/upgrade/production-plan.json');
const queue=p.assets.filter(a=>!a.file.startsWith('masks/')&&!a.file.includes('_w')&&!['characters/hero_down.png','monsters/rat.png'].includes(a.file)&&(!a.file.startsWith('tiles/')||/\/(floor|wall_front|water_1|drain|banner|sand)\.png$/.test(a.file))).map(a=>({file:a.file,width:a.width,description:a.description}));
console.log(JSON.stringify(queue));
