const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const content = fs.readFileSync(envPath, 'utf8');
console.log('--- .env content ---');
content.split('\n').forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('INTERNAL_ENCRYPTION_KEY')) {
        console.log(`Line ${i}: [${trimmed}] Length: ${trimmed.length}`);
        const [k, v] = trimmed.split('=');
        console.log(`Key Name: [${k}] Value: [${v}] Value Length: ${v ? v.length : 'N/A'}`);
    }
});
