// Portable Windows test package, using an uncompressed ZIP without dependencies.
const fs = require('node:fs');
const path = require('node:path');
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(files){
  const chunks=[], directory=[];let offset=0;
  for(const [filename,value] of Object.entries(files)){
    const name=Buffer.from(filename),data=Buffer.from(value),crc=crc32(data);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x21,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
    chunks.push(header,name,data);directory.push(central,name);offset+=header.length+name.length+data.length;
  }
  const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...chunks,central,end]);
}
module.exports = function buildLocalApp(html,root){
  const icon='data:image/png;base64,'+fs.readFileSync(path.join(root,'icons/icon-192.png')).toString('base64');
  const local=html.replace(/<link[^>]+(?:manifest|apple-touch-icon|preconnect|fonts.googleapis.com)[^>]*>/g,'')
    .replace('href="icons/icon-192.png"','href="'+icon+'"')
    .replace('href="downloads/Diabasma-test-windows.zip" download','href="https://vtsivourakis-hash.github.io/Diabasma-b/" target="_blank" rel="noopener noreferrer"')
    .replace('Λήψη για Windows · δοκιμαστική','Άνοιγμα site για νέα έκδοση');
  const launcher=[
    '@echo off',
    'setlocal',
    'if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (',
    '  start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="file:///%~dp0Diabasma.html"',
    '  exit /b',
    ')',
    'if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (',
    '  start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="file:///%~dp0Diabasma.html"',
    '  exit /b',
    ')',
    'if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (',
    '  start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="file:///%~dp0Diabasma.html"',
    '  exit /b',
    ')',
    'if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (',
    '  start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --app="file:///%~dp0Diabasma.html"',
    '  exit /b',
    ')',
    'echo Install Microsoft Edge or Google Chrome to open the app in its own window.',
    'echo Opening the local lessons in your default browser instead.',
    'start "" "%~dp0Diabasma.html"'
  ].join('\r\n');
  const readme='DIABASMA - WINDOWS TEST APP\r\n\r\nExtract all files, then double-click Start-Diabasma.cmd.\r\nUses installed Edge or Chrome in an app window. No installer or server.\r\nBundled lessons work offline; external textbooks need internet.\r\nProgress stays in this browser profile and does not sync with the website.\r\nKeep the same folder for progress. Download again for new content.\r\nIf app mode is unavailable, open Diabasma.html directly.\r\n';
  const downloads=path.join(root,'downloads');fs.mkdirSync(downloads,{recursive:true});
  fs.writeFileSync(path.join(downloads,'Diabasma-test-windows.zip'),zip({'Diabasma.html':local,'Start-Diabasma.cmd':launcher,'README.txt':readme}));
};
