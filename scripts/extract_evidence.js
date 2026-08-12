import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const videoPath = 'K:\\项目\\比赛\\AI先锋未来人才大赛\\output\\晶流LabFlow-系统演示视频.mp4';
const framesDir = 'K:\\项目\\比赛\\AI先锋未来人才大赛\\output\\video_temp\\frames';

if (!fs.existsSync(framesDir)) {
  fs.mkdirSync(framesDir, { recursive: true });
}

console.log('Running ffprobe...');
try {
  const probeInfo = execSync(`ffprobe -v error -show_entries format=duration,size -show_streams -of json "${videoPath}"`, { encoding: 'utf8' });
  const data = JSON.parse(probeInfo);
  console.log(JSON.stringify(data, null, 2));

  console.log('Extracting frames...');
  // Extract at 10s, 30s, 60s, 90s, 120s
  const times = [10, 40, 70, 100, 120];
  times.forEach((t, i) => {
    execSync(`ffmpeg -y -ss ${t} -i "${videoPath}" -vframes 1 -q:v 2 -strict unofficial "${path.join(framesDir, `frame_${i + 1}.jpg`)}"`);
    console.log(`Extracted frame at ${t}s`);
  });
  
  const stats = fs.statSync(videoPath);
  console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} catch (e) {
  console.error(e);
}
