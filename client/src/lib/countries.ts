/**
 * Shared country data used across the application
 * This ensures consistency between admin panel and user-facing components
 */

export type Country = {
  name: string;
  code: string;
  currency: string;
  symbol: string;
  rate: number;
};

export const countries: Country[] = [
  {
    name: "United States",
    code: "US",
    currency: "USD",
    symbol: "$",
    rate: 1.0,
  },
  {
    name: "United Kingdom",
    code: "GB",
    currency: "GBP",
    symbol: "£",
    rate: 0.78,
  },
  {
    name: "Euro Area",
    code: "EU",
    currency: "EUR",
    symbol: "€",
    rate: 0.93,
  },
  {
    name: "Japan",
    code: "JP",
    currency: "JPY",
    symbol: "¥",
    rate: 151.21,
  },
  {
    name: "Australia",
    code: "AU",
    currency: "AUD",
    symbol: "A$",
    rate: 1.52,
  },
  {
    name: "Canada",
    code: "CA",
    currency: "CAD",
    symbol: "C$",
    rate: 1.36,
  },
  {
    name: "Switzerland",
    code: "CH",
    currency: "CHF",
    symbol: "CHF",
    rate: 0.90,
  },
  {
    name: "China",
    code: "CN",
    currency: "CNY",
    symbol: "¥",
    rate: 7.23,
  },
  {
    name: "India",
    code: "IN",
    currency: "INR",
    symbol: "₹",
    rate: 83.37,
  },
  {
    name: "Brazil",
    code: "BR",
    currency: "BRL",
    symbol: "R$",
    rate: 5.05,
  },
  {
    name: "South Korea",
    code: "KR",
    currency: "KRW",
    symbol: "₩",
    rate: 1338.15,
  },
  {
    name: "Mexico",
    code: "MX",
    currency: "MXN",
    symbol: "$",
    rate: 16.75,
  },
  {
    name: "Singapore",
    code: "SG",
    currency: "SGD",
    symbol: "S$",
    rate: 1.34,
  },
  {
    name: "New Zealand",
    code: "NZ",
    currency: "NZD",
    symbol: "NZ$",
    rate: 1.62,
  },
  {
    name: "Hong Kong",
    code: "HK",
    currency: "HKD",
    symbol: "HK$",
    rate: 7.82,
  },
  {
    name: "Russia",
    code: "RU",
    currency: "RUB",
    symbol: "₽",
    rate: 91.50,
  },
  {
    name: "South Africa",
    code: "ZA",
    currency: "ZAR",
    symbol: "R",
    rate: 18.42,
  },
  {
    name: "United Arab Emirates",
    code: "AE",
    currency: "AED",
    symbol: "د.إ",
    rate: 3.67,
  },
  {
    name: "Nigeria",
    code: "NG",
    currency: "NGN",
    symbol: "₦",
    rate: 1549.85,
  },
  {
    name: "Kenya",
    code: "KE",
    currency: "KES",
    symbol: "KSh",
    rate: 129.32,
  },
  {
    name: "Ghana",
    code: "GH",
    currency: "GHS",
    symbol: "GH₵",
    rate: 14.11,
  }
];

/**
 * Get a list of country codes only
 */
export function getCountryCodes(): string[] {
  return countries.map(country => country.code);
}

/**
 * Get a country object by its code
 */
export function getCountryByCode(code: string): Country | undefined {
  return countries.find(country => country.code === code);
}

/**
 * Get list of countries by currency
 */
export function getCountriesByCurrency(currency: string): Country[] {
  return countries.filter(country => country.currency === currency);
}

/**
 * Get a mapping of currency codes to list of country codes
 */
export function getCurrencyToCountriesMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  
  countries.forEach(country => {
    if (!map[country.currency]) {
      map[country.currency] = [];
    }
    map[country.currency].push(country.code);
  });
  
  return map;
}

/**
 * Check if a country code is valid
 */
export function isValidCountryCode(code: string): boolean {
  return countries.some(country => country.code === code);
}

/**
 * Format country for display (e.g., US → United States)
 */
export function formatCountry(code: string): string {
  const country = getCountryByCode(code);
  return country ? country.name : code;
}