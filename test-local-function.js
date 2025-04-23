// Test script for locally running search-events function
import fetch from 'node-fetch';

async function testLocalFunction() {
  try {
    const url = 'http://localhost:54321/functions/v1/search-events';

    // Test parameters - specifically for party events
    const params = {
      location: "New York",
      radius: 25,
      categories: ['party'],
      limit: 20,
      page: 1
    };

    console.log(`Testing function at: ${url}`);
    console.log(`With parameters: ${JSON.stringify(params, null, 2)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log(`Success! Received ${data.events?.length || 0} events`);
    console.log(`Source stats: ${JSON.stringify(data.sourceStats, null, 2)}`);
    console.log(`Meta: ${JSON.stringify(data.meta, null, 2)}`);

    // Print first 3 events as samples
    if (data.events && data.events.length > 0) {
      console.log("\nSample events:");
      data.events.slice(0, 3).forEach((event, index) => {
        console.log(`\nEvent ${index + 1}:`);
        console.log(`Title: ${event.title}`);
        console.log(`Category: ${event.category}`);
        console.log(`Party Subcategory: ${event.partySubcategory || 'N/A'}`);
        console.log(`Date: ${event.date}`);
        console.log(`Location: ${event.location}`);
        console.log(`Source: ${event.source}`);
      });
    }

    // Count events by category
    const categoryCounts = {};
    data.events.forEach(event => {
      categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
    });

    console.log('\nEvents by category:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`${category}: ${count}`);
    });

    // Count party events by subcategory
    const partySubcategoryCounts = {};
    data.events
      .filter(event => event.category === 'party')
      .forEach(event => {
        const subcategory = event.partySubcategory || 'unspecified';
        partySubcategoryCounts[subcategory] = (partySubcategoryCounts[subcategory] || 0) + 1;
      });

    console.log('\nParty events by subcategory:');
    Object.entries(partySubcategoryCounts).forEach(([subcategory, count]) => {
      console.log(`${subcategory}: ${count}`);
    });
  } catch (error) {
    console.error("Error testing function:", error);
  }
}

testLocalFunction();
