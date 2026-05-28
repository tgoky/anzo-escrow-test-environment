/**
 * Script to create sample offers in the database for testing the marketplace
 */
const { db } = require('./server/db');
const { offers, makers } = require('./shared/schema');

async function createSampleOffers() {
  console.log('Creating sample offers for marketplace...');

  // First check if we already have offers in the database
  const existingOffers = await db.select().from(offers);
  console.log(`Found ${existingOffers.length} existing offers`);

  if (existingOffers.length > 0) {
    console.log('Sample offers already exist - skipping creation');
    return;
  }

  // Create some sample makers
  const makersList = [
    { id: 1, walletAddress: 'CNYYoVoZmArrmuXJYv8rPVL7h1Fdj68nXBePANDxJrcZ', isActive: true },
    { id: 2, walletAddress: '6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ', isActive: true },
    { id: 3, walletAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', isActive: true },
    
  ];

  // Sample offer data
  const sampleOffers = [
    {
      makerId: 1, 
      walletAddress: 'CNYYoVoZmArrmuXJYv8rPVL7h1Fdj68nXBePANDxJrcZ',
      type: 'sell',
      token: 'USDT',
      price: '1.05',
      amount: '1000',
      fiatCurrency: 'USD',
      paymentMethods: ['zelle', 'bank_transfer'],
      status: 'active',
      visibility: 'public',
      restrictions: {
        minAmount: '50',
        maxAmount: '500',
        allowedCountries: ['US'],
        requireVerified: true
      },
      makerDetails: {
        completionRate: 0.98,
        totalOrders: 152,
        avgResponseTime: 5
      }
    },
    {
      makerId: 1,
      walletAddress: '8ZgmpBpYqk31QQPQTvPxvZxpNtT7JvyBqonxfUdKJE7K',
      type: 'buy',
      token: 'USDT',
      price: '0.95',
      amount: '2000',
      fiatCurrency: 'USD',
      paymentMethods: ['zelle', 'cash_deposit'],
      status: 'active',
      visibility: 'public',
      restrictions: {
        minAmount: '100',
        maxAmount: '1000',
        allowedCountries: ['US'],
        requireVerified: true
      },
      makerDetails: {
        completionRate: 0.98,
        totalOrders: 152,
        avgResponseTime: 5
      }
    },
    {
      makerId: 2,
      walletAddress: '6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ',
      type: 'sell',
      token: 'BTC',
      price: '56000',
      amount: '0.5',
      fiatCurrency: 'USD',
      paymentMethods: ['bank_transfer'],
      status: 'active',
      visibility: 'public',
      restrictions: {
        minAmount: '1000',
        maxAmount: '10000',
        allowedCountries: ['US', 'CA'],
        requireVerified: true
      },
      makerDetails: {
        completionRate: 0.99,
        totalOrders: 76,
        avgResponseTime: 8
      }
    },
    {
      makerId: 3,
      walletAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      type: 'buy',
      token: 'SOL',
      price: '120',
      amount: '25',
      fiatCurrency: 'EUR',
      paymentMethods: ['sepa_transfer', 'revolut'],
      status: 'active',
      visibility: 'public',
      restrictions: {
        minAmount: '100',
        maxAmount: '1000',
        allowedCountries: ['DE', 'FR', 'IT', 'ES'],
        requireVerified: true
      },
      makerDetails: {
        completionRate: 0.95,
        totalOrders: 42,
        avgResponseTime: 15
      }
    },
    {
      makerId: 2,
      walletAddress: '6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ',
      type: 'sell',
      token: 'USDC',
      price: '1.02',
      amount: '5000',
      fiatCurrency: 'EUR',
      paymentMethods: ['sepa_transfer'],
      status: 'active',
      visibility: 'public',
      restrictions: {
        minAmount: '100',
        maxAmount: '2000',
        allowedCountries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE'],
        requireVerified: true
      },
      makerDetails: {
        completionRate: 0.99,
        totalOrders: 76,
        avgResponseTime: 8
      }
    },
    {
      makerId: 3,
      walletAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      type: 'sell',
      token: 'ETH',
      price: '3200',
      amount: '2.5',
      fiatCurrency: 'GBP',
      paymentMethods: ['bank_transfer'],
      status: 'active',
      visibility: 'public',
      restrictions: {
        minAmount: '200',
        maxAmount: '2000',
        allowedCountries: ['GB'],
        requireVerified: true
      },
      makerDetails: {
        completionRate: 0.95,
        totalOrders: 42,
        avgResponseTime: 15
      }
    },
    {
      makerId: 1,
      walletAddress: '8ZgmpBpYqk31QQPQTvPxvZxpNtT7JvyBqonxfUdKJE7K',
      type: 'buy',
      token: 'USDT',
      price: '80000',
      amount: '10000',
      fiatCurrency: 'NGN',
      paymentMethods: ['bank_transfer'],
      status: 'active',
      visibility: 'public',
      restrictions: {
        minAmount: '50000',
        maxAmount: '1000000',
        allowedCountries: ['NG'],
        requireVerified: true
      },
      makerDetails: {
        completionRate: 0.98,
        totalOrders: 152,
        avgResponseTime: 5
      }
    }
  ];

  try {
    // Insert makers first (if they don't exist)
    for (const maker of makersList) {
      const existingMaker = await db.select().from(makers).where({ walletAddress: maker.walletAddress }).execute();
      if (existingMaker.length === 0) {
        console.log(`Creating maker for wallet ${maker.walletAddress}...`);
        await db.insert(makers).values(maker).execute();
      }
    }

    // Now insert sample offers
    for (const offerData of sampleOffers) {
      console.log(`Creating ${offerData.type} offer for ${offerData.token}/${offerData.fiatCurrency}...`);
      const parsedOffer = {
        ...offerData,
        restrictions: JSON.stringify(offerData.restrictions),
        makerDetails: JSON.stringify(offerData.makerDetails),
        paymentMethods: JSON.stringify(offerData.paymentMethods),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.insert(offers).values(parsedOffer).execute();
    }

    console.log('✅ Sample offers created successfully!');
  } catch (error) {
    console.error('Error creating sample offers:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
createSampleOffers();