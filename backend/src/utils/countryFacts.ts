import countriesByName from "country-json/src/country-by-name.json";
import countriesByCapital from "country-json/src/country-by-capital-city.json";
import countriesByContinent from "country-json/src/country-by-continent.json";
import countriesByLanguage from "country-json/src/country-by-languages.json";
import countriesByPopulation from "country-json/src/country-by-population.json";
import countriesBySurfaceArea from "country-json/src/country-by-surface-area.json";

import { CountryData } from "./types";

// Helper to get a random element from an array
const getRandomElement = <T>(arr: T[]): T | undefined => {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
};

// Map for quick lookup of specific country data
const countryMap = new Map<string, any>();

// Initialize map on module load
countriesByName.forEach((c) => countryMap.set(c.country, c));
countriesByCapital.forEach((c) => {
  const existing = countryMap.get(c.country);
  if (existing) existing.capital = c.city;
});
countriesByContinent.forEach((c) => {
  const existing = countryMap.get(c.country);
  if (existing) existing.continent = c.continent;
});
countriesByLanguage.forEach((c) => {
  const existing = countryMap.get(c.country);
  if (existing) existing.languages = c.languages;
});
countriesByPopulation.forEach((c) => {
  const existing = countryMap.get(c.country);
  if (existing) existing.population = c.population;
});
countriesBySurfaceArea.forEach((c) => {
  const existing = countryMap.get(c.country);
  if (existing) existing.surfaceArea = c.area;
});

/**
 * Generates an array of facts for a given country.
 * Prioritizes more unique/interesting facts.
 */
export const generateFactsForCountry = (countryName: string): string[] => {
  const countryInfo = countryMap.get(countryName);
  const facts: string[] = [];

  if (!countryInfo) {
    console.warn(`Country info not found for ${countryName}`);
    return [];
  }

  // Fact 1: Capital City (always a good first fact)
  if (countryInfo.capital) {
    facts.push(`Its capital city is ${countryInfo.capital}.`);
  }

  // Fact 2: Continent
  if (countryInfo.continent && countryInfo.continent !== "N/A") {
    facts.push(`It is located in the continent of ${countryInfo.continent}.`);
  }

  // Fact 3: Languages (first language)
  if (countryInfo.languages && countryInfo.languages.length > 0) {
    facts.push(`One of its official languages is ${countryInfo.languages[0]}.`);
  }

  // Fact 4: Population (rounded for readability)
  if (countryInfo.population) {
    const populationMillions = (countryInfo.population / 1000000).toFixed(1);
    facts.push(
      `It has a population of approximately ${populationMillions} million people.`
    );
  }

  // Fact 5: Surface Area (rounded for readability)
  if (countryInfo.surfaceArea) {
    const areaMillions = (countryInfo.surfaceArea / 1000000).toFixed(1);
    facts.push(
      `Its total surface area is about ${areaMillions} million square kilometers.`
    );
  }

  // Add more diverse facts based on country-json fields if needed
  // Example: National symbol, currency name, etc.
  // if (countryInfo.currency_name) { facts.push(`Its currency is called the ${countryInfo.currency_name}.`); }
  // if (countryInfo.driving_side) { facts.push(`People drive on the ${countryInfo.driving_side} side of the road.`); }

  // Ensure facts are unique (should be by construction here, but good practice)
  return Array.from(new Set(facts)).filter((fact) => fact.length > 0);
};

/**
 * Selects a random country and generates its facts.
 */
export const getRandomCountryWithFacts = (): CountryData | undefined => {
  const availableCountries = countriesByName
    .map((c) => c.country)
    .filter((name) => {
      const info = countryMap.get(name);
      // Ensure we have at least capital and continent to start
      return info && info.capital && info.continent;
    });

  if (availableCountries.length === 0) {
    console.error("No suitable countries found to pick from.");
    return undefined;
  }

  const randomCountryName = getRandomElement(availableCountries);
  if (!randomCountryName) return undefined;

  const facts = generateFactsForCountry(randomCountryName);

  // Ensure we have at least 1-2 facts to start, ideally more for hints
  if (facts.length < 2) {
    // Need at least 2 facts: 1 initial, 1 for hint
    // If not enough facts, try another country (recursive call, but add a safeguard)
    console.warn(
      `Not enough facts generated for ${randomCountryName}. Trying another...`
    );
    return getRandomCountryWithFacts();
  }

  return {
    name: randomCountryName,
    facts: facts,
  };
};
