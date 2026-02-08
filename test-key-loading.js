const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const content = fs.readFileSync(envPath, 'utf8');
content.split('\n').forEach((line) => {
    const [key, ...val] = line.split('=');
    if (key && key.trim() === 'INTERNAL_ENCRYPTION_KEY') {
        const v = val.join('=').trim();
        console.log(`FOUND KEY: [${v.substring(0, 4)}...] Length: ${v.length}`);
        const buf = Buffer.from(v, 'hex');
        console.log(`BUFFER LENGTH: ${buf.length}`);
    }
});
