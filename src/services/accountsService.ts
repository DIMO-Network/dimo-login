/**
 * accountsService.ts
 * 
 * This service handles all requests related to the Dimo Accounts API, including 
 * checking account existence and creating/linking accounts.
 * 
 */

const DIMO_ACCOUNTS_BASE_URL = process.env.REACT_APP_DIMO_ACCOUNTS_URL || 'https://accounts.dev.dimo.org';

// Check if an account exists
export const checkAccountExists = async (email: string) => {
    const response = await fetch(`${DIMO_ACCOUNTS_BASE_URL}/account/${email}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error('Account lookup failed');
    }
    return await response.json();
};