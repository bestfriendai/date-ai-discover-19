// Comprehensive test script to verify PredictHQ and Ticketmaster integrations
import fetch from 'node-fetch';
import * as fs from 'fs/promises';

// Configuration
const CONFIG = {
  projectRef: 'akwvmljopucsnorvdwuu',
  functionName: 'search-events',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrd3ZtbGpvcHVjc25vcnZkd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3NTI1MzIsImV4cCI6MjA2MDMyODUzMn0.0cMnBX7ODkL16AlbzogsDpm-ykGjLXxJmT3ddB8_LGk',
  locations: [
    { name: "New York", latitude: 40.7128, longitude: -74.0060 },
    { name: "Los Angeles", latitude: 34.0522, longitude: -118.2437 },
    { name: "Chicago", latitude: 41.8781, longitude: -87.6298 }
  ],
  categories: ['music', 'party', 'sports'],
  resultLimit: 5
};

// Test results storage
const testResults = {
  predicthq: {
    totalEvents: 0,
    eventsWithImages: 0,
    eventsWithBuyLinks: 0,
    imageSourceStats: {},
    buyLinkSourceStats: {},
    errors: []
  },
  ticketmaster: {
    totalEvents: 0,
    eventsWithImages: 0,
    eventsWithBuyLinks: 0,
    dateFormatErrors: 0,
    apiKeyErrors: 0,
    errors: []
  }
};

/**
 * Main test function
 */
async function runIntegrationTests() {
  console.log('=== INTEGRATION TEST FOR SEARCH-EVENTS FUNCTION ===');
  console.log('Testing PredictHQ and Ticketmaster integrations\n');
  
  try {
    // Create log directory if it doesn't exist
    await fs.mkdir('test-results', { recursive: true }).catch(() => {});
    
    // Test with different locations and categories
    for (const location of CONFIG.locations) {
      for (const category of CONFIG.categories) {
        await testSearchEvents(location, category);
      }
    }
    
    // Test direct API calls to verify specific fixes
    await testTicketmasterDateFormatting();
    await testPredictHQImageExtraction();
    
    // Generate and save test report
    await generateTestReport();
    
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

/**
 * Test search-events function with specific location and category
 */
async function testSearchEvents(location, category) {
  try {
    const url = `https://${CONFIG.projectRef}.supabase.co/functions/v1/${CONFIG.functionName}`;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Create end date 30 days from now
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Test parameters
    const params = {
      latitude: location.latitude,
      longitude: location.longitude,
      radius: 25,
      categories: [category],
      limit: CONFIG.resultLimit,
      startDate: today,
      endDate: endDateStr
    };
    
    console.log(`\n--- Testing ${category} events in ${location.name} ---`);
    console.log(`Parameters: ${JSON.stringify(params, null, 2)}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`
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
    
    // Process and analyze events
    analyzeEvents(data.events, category, location.name);
    
  } catch (error) {
    console.error(`Error testing ${category} events in ${location.name}:`, error);
  }
}

/**
 * Analyze events to verify fixes
 */
function analyzeEvents(events, category, locationName) {
  if (!events || events.length === 0) {
    console.log('No events to analyze');
    return;
  }
  
  // Group events by source
  const predicthqEvents = events.filter(event => event.source === 'predicthq');
  const ticketmasterEvents = events.filter(event => event.source === 'ticketmaster');
  
  console.log(`\nAnalyzing ${predicthqEvents.length} PredictHQ events and ${ticketmasterEvents.length} Ticketmaster events`);
  
  // Update test results for PredictHQ
  testResults.predicthq.totalEvents += predicthqEvents.length;
  
  // Analyze PredictHQ events
  for (const event of predicthqEvents) {
    // Check for images
    const hasImage = event.image && event.image !== 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&auto=format&fit=crop';
    if (hasImage) {
      testResults.predicthq.eventsWithImages++;
      
      // Track image source stats
      const imageSource = determineImageSource(event.image);
      testResults.predicthq.imageSourceStats[imageSource] = (testResults.predicthq.imageSourceStats[imageSource] || 0) + 1;
    }
    
    // Check for buy links
    const hasBuyLink = !!(event.url || 
                         (event.ticketInfo && event.ticketInfo.purchaseUrl) || 
                         (event.websites && (event.websites.tickets || event.websites.official)));
    
    if (hasBuyLink) {
      testResults.predicthq.eventsWithBuyLinks++;
      
      // Track buy link source stats
      const buyLinkSource = determineBuyLinkSource(event);
      testResults.predicthq.buyLinkSourceStats[buyLinkSource] = (testResults.predicthq.buyLinkSourceStats[buyLinkSource] || 0) + 1;
    }
    
    // Log detailed information for the first few events
    if (predicthqEvents.indexOf(event) < 2) {
      console.log(`\n--- PredictHQ Event: ${event.title} ---`);
      console.log(`Image: ${hasImage ? 'YES' : 'NO'} - ${event.image}`);
      console.log(`Buy Link: ${hasBuyLink ? 'YES' : 'NO'}`);
      if (hasBuyLink) {
        console.log(`  URL: ${event.url || 'N/A'}`);
        console.log(`  Ticket URL: ${event.ticketInfo?.purchaseUrl || 'N/A'}`);
        console.log(`  Website Tickets: ${event.websites?.tickets || 'N/A'}`);
        console.log(`  Website Official: ${event.websites?.official || 'N/A'}`);
      }
    }
  }
  
  // Update test results for Ticketmaster
  testResults.ticketmaster.totalEvents += ticketmasterEvents.length;
  
  // Analyze Ticketmaster events
  for (const event of ticketmasterEvents) {
    // Check for images
    const hasImage = !!event.image;
    if (hasImage) {
      testResults.ticketmaster.eventsWithImages++;
    }
    
    // Check for buy links
    const hasBuyLink = !!(event.url || 
                         (event.ticketInfo && event.ticketInfo.purchaseUrl) || 
                         (event.websites && (event.websites.tickets || event.websites.official)));
    
    if (hasBuyLink) {
      testResults.ticketmaster.eventsWithBuyLinks++;
    }
    
    // Log detailed information for the first few events
    if (ticketmasterEvents.indexOf(event) < 2) {
      console.log(`\n--- Ticketmaster Event: ${event.title} ---`);
      console.log(`Date: ${event.date}, Time: ${event.time}`);
      console.log(`Image: ${hasImage ? 'YES' : 'NO'} - ${event.image}`);
      console.log(`Buy Link: ${hasBuyLink ? 'YES' : 'NO'}`);
      if (hasBuyLink) {
        console.log(`  URL: ${event.url || 'N/A'}`);
        console.log(`  Ticket URL: ${event.ticketInfo?.purchaseUrl || 'N/A'}`);
        console.log(`  Website Tickets: ${event.websites?.tickets || 'N/A'}`);
        console.log(`  Website Official: ${event.websites?.official || 'N/A'}`);
      }
    }
  }
}

/**
 * Determine the source of an image URL
 */
function determineImageSource(imageUrl) {
  if (!imageUrl) return 'none';
  
  // Check for default/fallback images
  if (imageUrl.includes('unsplash.com')) {
    return 'fallback';
  }
  
  // Try to determine source based on URL patterns
  if (imageUrl.includes('predicthq.com')) {
    return 'predicthq-direct';
  } else if (imageUrl.includes('ticketmaster.com')) {
    return 'ticketmaster';
  } else if (imageUrl.includes('performer') || imageUrl.includes('artist')) {
    return 'performer';
  } else if (imageUrl.includes('venue')) {
    return 'venue';
  } else {
    return 'other';
  }
}

/**
 * Determine the source of a buy link
 */
function determineBuyLinkSource(event) {
  if (event.ticketInfo && event.ticketInfo.purchaseUrl) {
    return 'ticket-info';
  } else if (event.websites && event.websites.tickets) {
    return 'website-tickets';
  } else if (event.websites && event.websites.official) {
    return 'website-official';
  } else if (event.url) {
    return 'event-url';
  } else {
    return 'none';
  }
}

/**
 * Test Ticketmaster date formatting specifically
 */
async function testTicketmasterDateFormatting() {
  console.log('\n=== Testing Ticketmaster Date Formatting ===');
  
  try {
    // Test with various date formats
    const dateFormats = [
      { input: '2025-05-01', expected: '2025-05-01T00:00:00Z' },
      { input: '2025-05-01T12:30:00', expected: '2025-05-01T00:00:00Z' },
      { input: new Date().toISOString().split('T')[0], expected: 'today' }
    ];
    
    const url = `https://${CONFIG.projectRef}.supabase.co/functions/v1/${CONFIG.functionName}`;
    
    for (const format of dateFormats) {
      console.log(`\nTesting date format: ${format.input}`);
      
      const params = {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 25,
        categories: ['music'],
        limit: 1,
        startDate: format.input,
        endDate: '2025-12-31'
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`
        },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error: ${response.status} ${response.statusText}`);
        console.error(`Response: ${errorText}`);
        
        // Check if error is related to date formatting
        if (errorText.includes('date') || errorText.includes('Date')) {
          testResults.ticketmaster.dateFormatErrors++;
          testResults.ticketmaster.errors.push(`Date format error with ${format.input}: ${errorText}`);
        }
        continue;
      }
      
      const data = await response.json();
      console.log(`Success! Received ${data.events?.length || 0} events`);
      
      // Check if we got Ticketmaster events
      const ticketmasterEvents = data.events?.filter(event => event.source === 'ticketmaster') || [];
      console.log(`Ticketmaster events: ${ticketmasterEvents.length}`);
      
      if (ticketmasterEvents.length > 0) {
        console.log('Date formatting is working correctly!');
      } else if (data.sourceStats?.ticketmaster?.error) {
        console.log(`Ticketmaster error: ${data.sourceStats.ticketmaster.error}`);
        
        // Check if error is related to date formatting
        if (data.sourceStats.ticketmaster.error.includes('date') || 
            data.sourceStats.ticketmaster.error.includes('Date')) {
          testResults.ticketmaster.dateFormatErrors++;
          testResults.ticketmaster.errors.push(`Date format error with ${format.input}: ${data.sourceStats.ticketmaster.error}`);
        }
      }
    }
  } catch (error) {
    console.error('Error testing Ticketmaster date formatting:', error);
    testResults.ticketmaster.errors.push(`Date formatting test error: ${error.message}`);
  }
}

/**
 * Test PredictHQ image extraction specifically
 */
async function testPredictHQImageExtraction() {
  console.log('\n=== Testing PredictHQ Image Extraction ===');
  
  try {
    const url = `https://${CONFIG.projectRef}.supabase.co/functions/v1/${CONFIG.functionName}`;
    
    // Test with parameters likely to return events with images
    const params = {
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 25,
      categories: ['music', 'party'],
      limit: 10,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2025-12-31'
    };
    
    console.log(`Testing with parameters: ${JSON.stringify(params, null, 2)}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.supabaseAnonKey}`
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
    
    // Filter for PredictHQ events
    const predicthqEvents = data.events?.filter(event => event.source === 'predicthq') || [];
    console.log(`PredictHQ events: ${predicthqEvents.length}`);
    
    // Analyze image sources in detail
    const imageAnalysis = {
      total: predicthqEvents.length,
      withImage: 0,
      withFallbackImage: 0,
      withAdditionalImages: 0,
      imageSources: {}
    };
    
    for (const event of predicthqEvents) {
      const hasImage = !!event.image;
      const isFallbackImage = event.image && event.image.includes('unsplash.com');
      const hasAdditionalImages = event.additionalImages && event.additionalImages.length > 0;
      
      if (hasImage) {
        imageAnalysis.withImage++;
        
        if (isFallbackImage) {
          imageAnalysis.withFallbackImage++;
        }
        
        // Track image source
        const source = determineImageSource(event.image);
        imageAnalysis.imageSources[source] = (imageAnalysis.imageSources[source] || 0) + 1;
      }
      
      if (hasAdditionalImages) {
        imageAnalysis.withAdditionalImages++;
      }
      
      // Log detailed information for events with images
      if (hasImage && !isFallbackImage) {
        console.log(`\n--- Event with image: ${event.title} ---`);
        console.log(`Image URL: ${event.image}`);
        console.log(`Image Alt: ${event.imageAlt || 'None'}`);
        console.log(`Additional Images: ${event.additionalImages ? event.additionalImages.length : 0}`);
        if (hasAdditionalImages) {
          console.log(`First additional image: ${event.additionalImages[0]}`);
        }
      }
    }
    
    console.log('\nImage Analysis Results:');
    console.log(`Total events: ${imageAnalysis.total}`);
    console.log(`Events with images: ${imageAnalysis.withImage} (${Math.round(imageAnalysis.withImage / imageAnalysis.total * 100)}%)`);
    console.log(`Events with fallback images: ${imageAnalysis.withFallbackImage} (${Math.round(imageAnalysis.withFallbackImage / imageAnalysis.total * 100)}%)`);
    console.log(`Events with additional images: ${imageAnalysis.withAdditionalImages} (${Math.round(imageAnalysis.withAdditionalImages / imageAnalysis.total * 100)}%)`);
    console.log(`Image sources: ${JSON.stringify(imageAnalysis.imageSources, null, 2)}`);
    
  } catch (error) {
    console.error('Error testing PredictHQ image extraction:', error);
    testResults.predicthq.errors.push(`Image extraction test error: ${error.message}`);
  }
}

/**
 * Generate and save test report
 */
async function generateTestReport() {
  console.log('\n=== Generating Test Report ===');
  
  // Calculate percentages
  const predicthqImagePercentage = testResults.predicthq.totalEvents > 0 
    ? Math.round((testResults.predicthq.eventsWithImages / testResults.predicthq.totalEvents) * 100) 
    : 0;
    
  const predicthqBuyLinkPercentage = testResults.predicthq.totalEvents > 0 
    ? Math.round((testResults.predicthq.eventsWithBuyLinks / testResults.predicthq.totalEvents) * 100) 
    : 0;
    
  const ticketmasterImagePercentage = testResults.ticketmaster.totalEvents > 0 
    ? Math.round((testResults.ticketmaster.eventsWithImages / testResults.ticketmaster.totalEvents) * 100) 
    : 0;
    
  const ticketmasterBuyLinkPercentage = testResults.ticketmaster.totalEvents > 0 
    ? Math.round((testResults.ticketmaster.eventsWithBuyLinks / testResults.ticketmaster.totalEvents) * 100) 
    : 0;
  
  // Create report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      predicthq: {
        totalEvents: testResults.predicthq.totalEvents,
        eventsWithImages: testResults.predicthq.eventsWithImages,
        imagePercentage: predicthqImagePercentage,
        eventsWithBuyLinks: testResults.predicthq.eventsWithBuyLinks,
        buyLinkPercentage: predicthqBuyLinkPercentage,
        imageSourceStats: testResults.predicthq.imageSourceStats,
        buyLinkSourceStats: testResults.predicthq.buyLinkSourceStats,
        errors: testResults.predicthq.errors
      },
      ticketmaster: {
        totalEvents: testResults.ticketmaster.totalEvents,
        eventsWithImages: testResults.ticketmaster.eventsWithImages,
        imagePercentage: ticketmasterImagePercentage,
        eventsWithBuyLinks: testResults.ticketmaster.eventsWithBuyLinks,
        buyLinkPercentage: ticketmasterBuyLinkPercentage,
        dateFormatErrors: testResults.ticketmaster.dateFormatErrors,
        apiKeyErrors: testResults.ticketmaster.apiKeyErrors,
        errors: testResults.ticketmaster.errors
      }
    },
    conclusion: {
      predicthqImageExtractionWorking: predicthqImagePercentage > 50,
      predicthqBuyLinksWorking: predicthqBuyLinkPercentage > 50,
      ticketmasterIntegrationWorking: testResults.ticketmaster.totalEvents > 0,
      ticketmasterDateFormattingWorking: testResults.ticketmaster.dateFormatErrors === 0,
      overallStatus: 'unknown' // Will be set below
    },
    recommendations: []
  };
  
  // Determine overall status
  if (report.conclusion.predicthqImageExtractionWorking && 
      report.conclusion.predicthqBuyLinksWorking && 
      report.conclusion.ticketmasterIntegrationWorking && 
      report.conclusion.ticketmasterDateFormattingWorking) {
    report.conclusion.overallStatus = 'PASS';
  } else if (!report.conclusion.ticketmasterIntegrationWorking || 
             !report.conclusion.predicthqImageExtractionWorking) {
    report.conclusion.overallStatus = 'FAIL';
  } else {
    report.conclusion.overallStatus = 'PARTIAL';
  }
  
  // Add recommendations
  if (!report.conclusion.predicthqImageExtractionWorking) {
    report.recommendations.push('PredictHQ image extraction needs further improvement. Check the image extraction logic in predicthq-fixed.ts.');
  }
  
  if (!report.conclusion.predicthqBuyLinksWorking) {
    report.recommendations.push('PredictHQ buy links extraction needs further improvement. Check the ticket info and website extraction logic in predicthq-fixed.ts.');
  }
  
  if (!report.conclusion.ticketmasterIntegrationWorking) {
    report.recommendations.push('Ticketmaster integration is not working. Check API key configuration and date formatting in ticketmaster.ts.');
  }
  
  if (testResults.ticketmaster.dateFormatErrors > 0) {
    report.recommendations.push('Ticketmaster date formatting still has issues. Review the date formatting logic in ticketmaster.ts.');
  }
  
  // Print report summary
  console.log('\n=== TEST REPORT SUMMARY ===');
  console.log(`Overall Status: ${report.conclusion.overallStatus}`);
  console.log('\nPredictHQ Integration:');
  console.log(`- Total Events: ${report.summary.predicthq.totalEvents}`);
  console.log(`- Events with Images: ${report.summary.predicthq.eventsWithImages} (${report.summary.predicthq.imagePercentage}%)`);
  console.log(`- Events with Buy Links: ${report.summary.predicthq.eventsWithBuyLinks} (${report.summary.predicthq.buyLinkPercentage}%)`);
  console.log(`- Image Extraction Working: ${report.conclusion.predicthqImageExtractionWorking ? 'YES' : 'NO'}`);
  console.log(`- Buy Links Working: ${report.conclusion.predicthqBuyLinksWorking ? 'YES' : 'NO'}`);
  
  console.log('\nTicketmaster Integration:');
  console.log(`- Total Events: ${report.summary.ticketmaster.totalEvents}`);
  console.log(`- Events with Images: ${report.summary.ticketmaster.eventsWithImages} (${report.summary.ticketmaster.imagePercentage}%)`);
  console.log(`- Events with Buy Links: ${report.summary.ticketmaster.eventsWithBuyLinks} (${report.summary.ticketmaster.buyLinkPercentage}%)`);
  console.log(`- Date Format Errors: ${report.summary.ticketmaster.dateFormatErrors}`);
  console.log(`- API Key Errors: ${report.summary.ticketmaster.apiKeyErrors}`);
  console.log(`- Integration Working: ${report.conclusion.ticketmasterIntegrationWorking ? 'YES' : 'NO'}`);
  console.log(`- Date Formatting Working: ${report.conclusion.ticketmasterDateFormattingWorking ? 'YES' : 'NO'}`);
  
  if (report.recommendations.length > 0) {
    console.log('\nRecommendations:');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }
  
  // Save report to file
  const reportJson = JSON.stringify(report, null, 2);
  await fs.writeFile('test-results/integration-test-report.json', reportJson);
  console.log('\nTest report saved to test-results/integration-test-report.json');
}

// Run the tests
runIntegrationTests();