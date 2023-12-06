import fs from 'fs';
try {
    const stats = fs.statSync(`/tokens/HEALTH`);
    const seconds = (new Date().getTime() - new Date(stats.mtime).getTime()) / 1000;
    if (seconds > 120) {
        process.exit(1);
    }
    else {
        process.exit(0);
    }
}
catch (error) {
    process.exit(1);
}
