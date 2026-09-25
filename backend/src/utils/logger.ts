import pino from 'pino';
import { config } from '../config';

const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  transport: config.env !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: ['req.headers.authorization', 'body.password', 'body.token'],
});

export default logger;
