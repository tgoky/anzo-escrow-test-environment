import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode, DepositoryAccountSubtype } from 'plaid';
import express from 'express';
import { FinancialAccountService } from '../../shared/services/financial-account-service';
import { mapPlaidAccountToFinancialAccount } from '../../shared/types/financial-account';

const router = express.Router();

const plaidEnv = process.env.PLAID_ENV?.toLowerCase() || 'sandbox';
if (!['sandbox', 'development', 'production'].includes(plaidEnv)) {
  throw new Error(`Invalid PLAID_ENV value: ${plaidEnv}. Must be one of: sandbox, development, production`);
}

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnv],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Create a link token
router.post('/create-link-token', async (req, res) => {
  try {
    console.log('Creating Plaid link token with environment:', plaidEnv);
    const { walletAddress, currency = 'USD' } = req.body;

    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      throw new Error('Missing required Plaid credentials');
    }

    const request = {
      user: { client_user_id: walletAddress },
      client_name: 'Your App Name',
      products: ['auth', 'identity'] as Products[],
      country_codes: ['US'] as CountryCode[],
      language: 'en',
      account_filters: {
        depository: {
          account_subtypes: [
            DepositoryAccountSubtype.Checking,
            DepositoryAccountSubtype.Savings
          ]
        }
      }
    };

    console.log('Sending request to Plaid:', JSON.stringify(request, null, 2));
    const createTokenResponse = await plaidClient.linkTokenCreate(request);
    console.log('Plaid response:', createTokenResponse.data);
    res.json(createTokenResponse.data);
  } catch (error) {
    console.error('Error creating link token:', error);
    if (error.response?.data) {
      console.error('Plaid API error details:', error.response.data);
    }
    res.status(500).json({ 
      error: 'Failed to create link token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Exchange public token for access token
router.post('/exchange-token', async (req, res) => {
  try {
    const { public_token, metadata, walletAddress } = req.body;

    // Exchange public token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token
    });

    const access_token = exchangeResponse.data.access_token;

    // Get accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token
    });

    // Get identity information
    const identityResponse = await plaidClient.identityGet({
      access_token
    });

    // Map Plaid accounts to our financial account model
    const accounts = accountsResponse.data.accounts.map(account => {
      const identityData = identityResponse.data.accounts.find(
        idAccount => idAccount.account_id === account.account_id
      );

      return mapPlaidAccountToFinancialAccount({
        ...account,
        identity: identityData,
        institution_id: metadata.institution.institution_id,
        institution_name: metadata.institution.name
      });
    });

    // Process the new connection
    const processedAccounts = await FinancialAccountService.processNewConnection({
      provider: 'plaid',
      connectionId: exchangeResponse.data.item_id,
      accessToken: access_token,
      accounts
    });

    res.json({ accounts: processedAccounts });
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

export default router;