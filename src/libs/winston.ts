import winston from 'winston';
const nrWinston = require('@newrelic/winston-enricher')(winston);

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        nrWinston(), // This adds New Relic metadata automatically!
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            silent: true
        })
    ],
});

export default logger;
