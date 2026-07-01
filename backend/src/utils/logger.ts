import winston from 'winston';
import path from 'path';
import { config } from '../config';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// Coloured format for the terminal console
const devConsoleFmt = printf(({ level, message, timestamp: ts, agent_id, rwa_id, ...rest }) => {
  const prefix = [agent_id && `[${agent_id}]`, rwa_id && `{${rwa_id}}`].filter(Boolean).join(' ');
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  return `${ts} ${level}: ${prefix ? prefix + ' ' : ''}${message}${extra}`;
});

// Plain-text format for log.txt — no ANSI colour codes
const plainFileFmt = printf(({ level, message, timestamp: ts, ...rest }) => {
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  return `${ts} ${level}: ${message}${extra}`;
});

const LOG_FILE = path.resolve(process.cwd(), 'log.txt');

// Shared base transform (no colorize here — colorize only goes on Console)
const baseFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
);

const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: baseFormat,
  transports: [
    new winston.transports.Console({
      format: config.NODE_ENV === 'production'
        ? json()
        : combine(colorize({ all: true }), devConsoleFmt),
    }),
    // Always write a plain-text debug log to log.txt for easy inspection
    new winston.transports.File({
      filename: LOG_FILE,
      level: 'debug',
      format: plainFileFmt,
      options: { flags: 'a' }, // append so restarts don't wipe history
    }),
    ...(config.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

export interface LogContext {
  agent_id?: string;
  rwa_id?: string;
  deploy_hash?: string;
  [key: string]: unknown;
}

export function createAgentLogger(agentId: string) {
  return {
    debug: (message: string, ctx?: Omit<LogContext, 'agent_id'>) =>
      logger.debug(message, { agent_id: agentId, ...ctx }),
    info: (message: string, ctx?: Omit<LogContext, 'agent_id'>) =>
      logger.info(message, { agent_id: agentId, ...ctx }),
    warn: (message: string, ctx?: Omit<LogContext, 'agent_id'>) =>
      logger.warn(message, { agent_id: agentId, ...ctx }),
    error: (message: string, ctx?: Omit<LogContext, 'agent_id'>) =>
      logger.error(message, { agent_id: agentId, ...ctx }),
  };
}

export default logger;
