import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '@agents/(.*)': '<rootDir>/src/agents/$1',
    '@services/(.*)': '<rootDir>/src/services/$1',
    '@db/(.*)': '<rootDir>/src/db/$1',
    '@blockchain/(.*)': '<rootDir>/src/blockchain/$1',
    '@api/(.*)': '<rootDir>/src/api/$1',
    '@config/(.*)': '<rootDir>/src/config/$1',
    '@utils/(.*)': '<rootDir>/src/utils/$1',
    '@jobs/(.*)': '<rootDir>/src/jobs/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
};

export default config;
