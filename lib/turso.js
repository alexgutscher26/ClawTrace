import { createClient } from '@libsql/client';
import { v4 as uuidv4 } from 'uuid';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.warn('TURSO_DATABASE_URL is not defined in environment variables');
}

export const turso = createClient({
    url: url || '',
    authToken: authToken || '',
});

/**
 * Helper to generate a UUID for SQL inserts
 */
export const generateId = () => uuidv4();

/**
 * Utility to convert Postgres-style query objects to LibSQL style
 */
export const db = {
    /**
     * Simple wrapper for execute
     */
    query: async (sql, args = []) => {
        return await turso.execute({ sql, args });
    },

    /**
     * Transaction helper
     */
    transaction: async (statements) => {
        return await turso.batch(statements, 'write');
    }
};
