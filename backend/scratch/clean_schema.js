const fs = require('fs');
const file = 'c:/Users/Dell/Documents/vintage73/vintage73/backend/prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf8');

const regex = /password\s+Stringnode:events:[\s\S]*?role\s+String/g;
if (regex.test(content)) {
    content = content.replace(regex, 'password                String\n  role                    String');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully cleaned schema.prisma');
} else {
    console.log('Regex did not match');
}
